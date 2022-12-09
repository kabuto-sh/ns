import type { Signer } from "@hashgraph/sdk";
import {
  AccountId,
  Hbar,
  TransactionReceipt,
  Client,
  ContractId,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  Transaction,
  TransactionReceiptQuery,
  TransactionResponse,
  StatusError,
} from "@hashgraph/sdk";
import axios, { type Axios } from "axios";
import BigNumber from "bignumber.js";
import { getRegisterPriceUsd } from "./get-register-price.js";
import { ParsedRecordName, parseName, parseRecordName } from "./parse-name.js";
import { addYears } from "date-fns";
import {
  deserializeHederaAddress,
  formatAddress,
  serializeAddress,
  serializeHederaAddress,
} from "./serde-address.js";
import { base64Decode } from "./base64.js";
import { utf8Encode } from "./utf8.js";
import { toBytes32 } from "./bytes.js";
import type { IKNS } from "./interface.js";
import type { AddressRecord, Name, TextRecord } from "./models.js";

interface RawAddressRecord {
  address: string;
  name: string;
  coinType: number;
}

function handleResolverAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 404: // no domain registered
        throw new NameNotFoundError();

      case 400: // domain expired
        throw new NameNotFoundError();
    }
  }

  throw error;
}

function mapRawAddress(rec: RawAddressRecord): AddressRecord {
  const addressBytes = base64Decode(rec.address);

  return {
    addressBytes,
    address: formatAddress(rec.coinType, addressBytes),
    name: rec.name,
    coinType: rec.coinType,
  };
}

export type { AddressRecord, Name, TextRecord } from "./models.js";

export class NameNotFoundError extends Error {
  constructor() {
    super();

    this.name = "NameNotFoundError";
  }
}

export class SignerRejectedError extends Error {
  public source?: unknown;

  constructor(source?: unknown) {
    super();

    this.name = "SignerRejectedError";
    this.source = source;
  }
}

export class KNS implements IKNS {
  private _signer?: Signer;

  private readonly _client: Client;

  private readonly _resolver: Axios;

  private readonly _hederaMirror: Axios;

  // cache of TLDs (ex. "hh") to contract IDs
  private readonly _tldContractIds: Map<string, ContractId> = new Map();

  // cache of DOMAINS (ex. "foo.hh") to serial numbers
  private readonly _domainSerials: Map<string, number> = new Map();

  // cache of HBAR to USD
  private _hbarPrice: BigNumber | null = null;
  private _hbarPriceTimestamp: number = 0;

  constructor(
    options: {
      network: "testnet" | "mainnet";
      resolver?: string;
    } = {
      network: "testnet",
    }
  ) {
    this._client = Client.forName(options.network);

    this._resolver = axios.create({
      baseURL:
        options.resolver ??
        (options.network === "testnet"
          ? "https://ns.testnet.kabuto.sh/api"
          : "https://ns.kabuto.sh/api"),
    });

    this._hederaMirror = axios.create({
      baseURL:
        options.network === "mainnet"
          ? "https://mainnet-public.mirrornode.hedera.com/"
          : "https://testnet.mirrornode.hedera.com/",
    });
  }

  /**
   * Sets the passed signer to be used to sign any generated transactions.
   * Must be called before any write method is called.
   */
  setSigner(signer: Signer) {
    this._signer = signer;
  }

  /**
   * Gets the estimated price (in USD) of registering the name.
   * Does not check if the name is available.
   */
  getRegisterPriceUsd(name: string): BigNumber {
    return getRegisterPriceUsd(name);
  }

  /**
   * Gets the estimated price (in HBAR) of registering the name.
   * Does not check if the name is available.
   */
  async getRegisterPriceHbar(name: string): Promise<Hbar> {
    const priceUsd = this.getRegisterPriceUsd(name);
    const hbarToUsd = await this._getHbarPrice();
    const priceHbar = priceUsd
      .div(hbarToUsd)
      .decimalPlaces(4, BigNumber.ROUND_UP);

    return new Hbar(priceHbar);
  }

  /**
   * Registers a new name to the current signer for the desired duration.
   * To check how much HBAR this will cost, call `getRegisterPrice(name)`.
   */
  async registerName(name: string, duration: { years: number }): Promise<Name> {
    const parsedName = parseName(name);
    const tldContractId = await this._getTldContractId(
      parsedName.topLevelDomain
    );

    const unitPrice = await this.getRegisterPriceHbar(name);
    const price = unitPrice.toBigNumber().multipliedBy(duration.years);

    const registerParams = new ContractFunctionParameters()
      .addBytes32(toBytes32(utf8Encode(parsedName.secondLevelDomain)))
      .addUint256(duration.years);

    const transaction = new ContractExecuteTransaction()
      .setContractId(tldContractId)
      .setFunction("purchaseZone", registerParams)
      .setPayableAmount(price)
      .setGas(2860000);

    const receipt = await this._executeTransaction(transaction);

    const serialNumber = receipt.children
      .filter((it) => it.serials.length > 0)
      .map((it) => it.serials[0])[0]
      .toNumber();

    this._domainSerials.set(name, serialNumber);

    return {
      ownerAccountId: this._signer!.getAccountId(),
      serialNumber,
      expirationTime: new Date(addYears(Date.now(), duration.years)),
    };
  }

  /**
   * Gets the registration information for a name, if registered.
   */
  async getName(name: string): Promise<Name> {
    let tokenId: string;
    let serialNumber: number;
    let expirationTime: Date;

    try {
      const kabutoResp = await this._resolver.get<{
        data: {
          contractId: string;
          expiresAt: string;
          maxRecords: number;
          tokenId: string;
          tokenSerialNumber: number;
        };
      }>(`/name/${name}`);

      tokenId = kabutoResp.data.data.tokenId;
      serialNumber = kabutoResp.data.data.tokenSerialNumber;
      expirationTime = new Date(Date.parse(kabutoResp.data.data.expiresAt));
    } catch (error) {
      handleResolverAxiosError(error);
    }

    const hederaResp = await this._hederaMirror.get<{
      account_id: string;
    }>(`/api/v1/tokens/${tokenId}/nfts/${serialNumber}`);

    return {
      ownerAccountId: AccountId.fromString(hederaResp.data.account_id),
      serialNumber,
      expirationTime,
    };
  }

  /**
   * Gets all address and all text records for a name.
   */
  async getAll(
    name: string
  ): Promise<{ text: TextRecord[]; address: AddressRecord[] }> {
    try {
      const { data } = await this._resolver.get<{
        data: {
          address: RawAddressRecord[];
          text: TextRecord[];
        };
      }>(`/name/${name}/record`);

      return {
        address: data.data.address.map((rec) => mapRawAddress(rec)),
        text: data.data.text,
      };
    } catch (error) {
      handleResolverAxiosError(error);
    }
  }

  /**
   * Gets all address records for a name.
   */
  async getAllAddress(name: string): Promise<AddressRecord[]> {
    const { address } = await this.getAll(name);

    return address;
  }

  /**
   * Gets all text records for a name.
   */
  async getAllText(name: string): Promise<TextRecord[]> {
    const { text } = await this.getAll(name);

    return text;
  }

  /**
   * Gets the address bytes for a name and coin type.
   */
  async getAddressBytes(name: string, coinType: number): Promise<Uint8Array> {
    try {
      const { data } = await this._resolver.get<{
        data: RawAddressRecord;
      }>(`/name/${name}/record/address/${coinType}`);

      return base64Decode(data.data.address);
    } catch (error) {
      handleResolverAxiosError(error);
    }
  }

  /**
   * Gets the address for a name and coin type.
   */
  async getAddress(name: string, coinType: number): Promise<string> {
    const address = await this.getAddressBytes(name, coinType);

    return formatAddress(coinType, address);
  }

  /**
   * Gets the HBAR address record for a name.
   */
  async getHederaAddress(name: string): Promise<AccountId> {
    const address = await this.getAddressBytes(name, 3030);

    return deserializeHederaAddress(address);
  }

  /**
   * Gets a text record for a name.
   */
  async getText(name: string): Promise<string> {
    try {
      const { data } = await this._resolver.get<{
        data: TextRecord;
      }>(`/name/${name}/record/text`);

      return data.data.text;
    } catch (error) {
      handleResolverAxiosError(error);
    }
  }

  /**
   * Gets the HIP-412 JSON metadata for a name, if available.
   */
  async getMetadata(name: string): Promise<object> {
    try {
      const { data } = await this._resolver.get<object>(
        `/name/${name}/metadata`
      );

      return data;
    } catch (error) {
      handleResolverAxiosError(error);
    }
  }

  /**
   * Sets the HBAR address record for a name.
   */
  setHederaAddress(
    name: string,
    address: Uint8Array | string | AccountId
  ): Promise<AddressRecord> {
    return this.setAddress(name, 3030, serializeHederaAddress(address));
  }

  /**
   * Sets the address record for a name and coin type.
   */
  async setAddress(
    name: string,
    coinType: number,
    address: Uint8Array | string
  ): Promise<AddressRecord> {
    const parsedName = parseRecordName(name);
    const nameSerial = await this._getNameSerial(parsedName);
    const tldContractId = await this._getTldContractId(
      parsedName.topLevelDomain
    );

    const serAddress = serializeAddress(coinType, address);

    const setParams = new ContractFunctionParameters()
      .addInt64(nameSerial as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)))
      .addUint32(coinType)
      .addBytes(serAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(tldContractId)
      .setFunction("setAddress", setParams)
      .setGas(300_000);

    await this._executeTransaction(transaction);

    return {
      coinType,
      name: parsedName.recordName,
      addressBytes: serAddress,
      address: formatAddress(coinType, serAddress),
    };
  }

  /**
   * Sets the text record for a name.
   */
  async setText(name: string, text: string): Promise<TextRecord> {
    const parsedName = parseRecordName(name);
    const nameSerial = await this._getNameSerial(parsedName);
    const tldContractId = await this._getTldContractId(
      parsedName.topLevelDomain
    );

    const setParams = new ContractFunctionParameters()
      .addInt64(nameSerial as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)))
      .addString(text);

    const transaction = new ContractExecuteTransaction()
      .setContractId(tldContractId)
      .setFunction("setText", setParams)
      .setGas(300_000);

    await this._executeTransaction(transaction);

    return {
      name: parsedName.recordName,
      text,
    };
  }

  /**
   * Removes a text record for a name.
   */
  async removeText(name: string): Promise<void> {
    const parsedName = parseRecordName(name);
    const nameSerial = await this._getNameSerial(parsedName);
    const tldContractId = await this._getTldContractId(
      parsedName.topLevelDomain
    );

    const delParams = new ContractFunctionParameters()
      .addInt64(nameSerial as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)));

    const transaction = new ContractExecuteTransaction()
      .setContractId(tldContractId)
      .setFunction("deleteText", delParams)
      .setGas(200_000);

    await this._executeTransaction(transaction);
  }

  /**
   * Removes an address record for a name and coin type.
   */
  async removeAddress(name: string, coinType: number): Promise<void> {
    const parsedName = parseRecordName(name);
    const nameSerial = await this._getNameSerial(parsedName);
    const tldContractId = await this._getTldContractId(
      parsedName.topLevelDomain
    );

    const delParams = new ContractFunctionParameters()
      .addInt64(nameSerial as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)))
      .addUint32(coinType);

    const transaction = new ContractExecuteTransaction()
      .setContractId(tldContractId)
      .setFunction("deleteAddress", delParams)
      .setGas(200_000);

    await this._executeTransaction(transaction);
  }

  /**
   * Searches for names with the given address record.
   */
  async findNamesByAddress(
    coinType: number,
    address: string | Uint8Array
  ): Promise<string[]> {
    const fmtAddress = formatAddress(
      coinType,
      serializeAddress(coinType, address)
    );

    const { data } = await this._resolver.get<{
      data: Array<{ domain: string; parent: string }>;
    }>(`/record/address/${coinType}/${fmtAddress}/name`);

    return data.data.map((rec) => `${rec.domain}.${rec.parent}`);
  }

  /**
   * Searches for names with the given address record.
   */
  findNamesByHederaAddress(address: AccountId): Promise<string[]> {
    return this.findNamesByAddress(3030, address.toString());
  }

  private _requireSigner() {
    if (this._signer == null) {
      throw Error("signer required, call setSigner before calling this method");
    }
  }

  private async _getTldContractId(tld: string): Promise<ContractId> {
    let contractId = this._tldContractIds.get(tld);

    if (contractId != null) {
      return contractId;
    }

    const { data } = await this._resolver.get<{
      data: {
        contractId: string;
      };
    }>(`/name/.${tld}`);

    contractId = ContractId.fromString(data.data.contractId);

    this._tldContractIds.set(tld, contractId);

    return contractId;
  }

  private async _getNameSerial(parsedName: ParsedRecordName): Promise<number> {
    const name = `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`;
    let nameSerial = this._domainSerials.get(name);

    if (nameSerial != null) {
      return nameSerial;
    }

    const { serialNumber } = await this.getName(
      `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`
    );

    this._domainSerials.set(name, serialNumber);

    return serialNumber;
  }

  private async _executeTransaction(
    transaction: Transaction
  ): Promise<TransactionReceipt> {
    this._requireSigner();

    await this._signer!.populateTransaction(transaction);

    const transactionId = transaction.transactionId;
    let response: TransactionResponse | null;

    try {
      response = await this._signer!.call(transaction);
    } catch (error) {
      // @ts-ignore
      if (error.name === "StatusError") {
        // if an exception is raised from a signer and that exception
        // starts with "StatusError: _" then it's a fake status error exception

        // @ts-ignore
        throw new StatusError({
          // @ts-ignore
          status: error.status,
          // @ts-ignore
          transactionId: error.transactionId,
        });
      }

      throw new SignerRejectedError(error);
    }

    if (response == null) {
      throw new SignerRejectedError();
    }

    return new TransactionReceiptQuery()
      .setValidateStatus(true)
      .setIncludeChildren(true)
      .setTransactionId(transactionId!)
      .execute(this._client);
  }

  private async _getHbarPrice(): Promise<BigNumber> {
    const MINUTES_10 = 10 * 60 * 1000;

    if (
      this._hbarPrice != null &&
      this._hbarPriceTimestamp <= Date.now() - MINUTES_10
    ) {
      // hbar price is non-null, and it's been less than 10 minutes
      // since we fetched
      return this._hbarPrice;
    }

    const { data } = await this._resolver.get<{
      data: { usd: number };
    }>("/exchange-rate");

    this._hbarPrice = new BigNumber(data.data.usd);
    this._hbarPriceTimestamp = Date.now();

    return this._hbarPrice;
  }
}
