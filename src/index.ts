import type { Signer } from "@hashgraph/sdk";
import {
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  StatusError,
  TokenAssociateTransaction,
  TokenId,
  Transaction,
  TransactionReceipt,
  TransactionReceiptQuery,
  TransactionResponse,
} from "@hashgraph/sdk";
import axios, { type Axios } from "axios";
import BigNumber from "bignumber.js";
import { getRegisterPriceUsd } from "./get-register-price.js";
import {
  normalizeName,
  normalizeRecordName,
  ParsedName,
  parseName,
  parseRecordName,
} from "./parse-name.js";
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

interface NameId {
  tokenId: TokenId;
  contractId: ContractId;
  serialNumber: number;
  contractSerialNumber: number;
  version: 1 | 2 | 3;
}

function handleResolverAxiosError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response != null) {
    switch (error.response.status) {
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

  // cache of TLDs (ex. "hh") to v3 contract and token IDs (for purchasing)
  private readonly _v3TldIds: Map<
    string,
    { tokenId: TokenId; contractId: ContractId }
  > = new Map();

  // cache of DOMAINS (ex. "foo.hh") to serial numbers, contract, and token IDs
  private readonly _nameIds: Map<string, NameId> = new Map();

  // cache of HBAR to USD
  private _hbarPrice: BigNumber | null = null;
  private _hbarPriceTimestamp: number = 0;

  constructor(
    options: {
      network: "testnet" | "mainnet";
      resolver?: string;
    } = {
      network: "testnet",
    },
  ) {
    this._client = Client.forName(options.network);

    // increase max hbar fee to 8h
    this._client.setDefaultMaxTransactionFee(new Hbar(8));

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
   * Closes any resources used by this name service client.
   */
  close() {
    this._client.close();
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

  private async _getTokenIdForName(parsedName: ParsedName): Promise<TokenId> {
    try {
      const nameId = await this._getNameId(parsedName);
      return nameId.tokenId;
    } catch (error) {
      if (error instanceof NameNotFoundError) {
        const tldId = await this._getV3TldId(parsedName.topLevelDomain);
        return tldId.tokenId;
      } else {
        throw error;
      }
    }
  }

  /**
   * Gets if the signer is associated for the name.
   * Each top-level-domain (TLD) needs to be associated.
   */
  async isAssociatedForName(name: string): Promise<boolean> {
    const parsedName = parseName(name);
    const tokenId = (await this._getTokenIdForName(parsedName)).toString();

    const hederaResp = await this._hederaMirror.get<{
      balance: {
        tokens: Array<{
          token_id: string;
        }>;
      };
    }>(`/api/v1/accounts/${this._signer!.getAccountId()}`);

    return (
      hederaResp.data.balance.tokens.findIndex(
        (token) => token.token_id === tokenId,
      ) >= 0
    );
  }

  /**
   * Associates the signer to the top-level-domain (TLD) of the name.
   */
  async associateName(name: string): Promise<void> {
    const parsedName = parseName(name);
    const tokenId = await this._getTokenIdForName(parsedName);

    const transaction = new TokenAssociateTransaction()
      .setAccountId(this._signer!.getAccountId())
      .setTokenIds([tokenId]);

    await this._executeTransaction(transaction);
  }

  private async _getNamePriceForDuration(
    name: string,
    duration: { years: number },
  ): Promise<BigNumber> {
    const unitPrice = await this.getRegisterPriceHbar(name);
    const price = unitPrice.toBigNumber().multipliedBy(duration.years);

    return price;
  }

  /**
   * Registers a new name to the current signer for the desired duration.
   * To check how much HBAR this will cost, call `getRegisterPrice(name)`.
   */
  async registerName(name: string, duration: { years: number }): Promise<Name> {
    const parsedName = parseName(name);
    const tldId = await this._getV3TldId(parsedName.topLevelDomain);
    const price = await this._getNamePriceForDuration(name, duration);

    const registerParams = new ContractFunctionParameters()
      .addBytes32(toBytes32(utf8Encode(parsedName.secondLevelDomain)))
      .addUint256(duration.years);

    const transaction = new ContractExecuteTransaction()
      .setContractId(tldId.contractId)
      .setFunction("purchaseZone", registerParams)
      .setPayableAmount(price)
      .setGas(2860000);

    const receipt = await this._executeTransaction(transaction);

    const serialNumber = receipt.children
      .filter((it) => it.serials.length > 0)
      .map((it) => it.serials[0])[0]
      .toNumber();

    const nameId: NameId = {
      serialNumber,
      contractSerialNumber: this._toContractSerialNumber(3, serialNumber),
      version: 3,
      ...tldId,
    };

    this._nameIds.set(name, nameId);

    return {
      domain: `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`,
      ownerAccountId: this._signer!.getAccountId(),
      expirationTime: new Date(addYears(Date.now(), duration.years)),
      ...nameId,
    };
  }

  /**
   * Extends the ownership for the name for the desired duration.
   * Must be the owner of the NFT for this name.
   */
  async extendNameRegistration(
    name: string,
    duration: { years: number },
  ): Promise<Name> {
    const parsedName = parseName(name);

    // throws if the name does not exist
    const nameData = await this.getName(name);

    // calculate price to extend this name
    const price = await this._getNamePriceForDuration(name, duration);

    const extendParams = new ContractFunctionParameters()
      .addBytes32(toBytes32(utf8Encode(parsedName.secondLevelDomain)))
      .addUint256(duration.years);

    const transaction = new ContractExecuteTransaction()
      .setContractId(nameData.contractId)
      .setFunction("extendZoneLifetime", extendParams)
      .setPayableAmount(price)
      .setGas(2860000);

    await this._executeTransaction(transaction);

    // adjust the expiration time on the name
    nameData.expirationTime = addYears(nameData.expirationTime, duration.years);

    return nameData;
  }

  /**
   * Gets the registration information for a name, if registered.
   */
  async getName(name: string): Promise<Name> {
    let tokenId: string;
    let contractId: string;
    let serialNumber: number;
    let contractSerialNumber: number;
    let expirationTime: Date;
    let version: 1 | 2 | 3;

    try {
      const kabutoResp = await this._resolver.get<{
        data: {
          v1ContractId: string;
          v2ContractId: string;
          v3ContractId: string;
          expiresAt: string;
          maxRecords: number;
          v1TokenId: string;
          v2TokenId: string;
          v3TokenId: string;
          tokenSerialNumber: number;
        };
      }>(`/name/${encodeURIComponent(normalizeName(name))}`);

      serialNumber = kabutoResp.data.data.tokenSerialNumber;
      contractSerialNumber = serialNumber;

      if (serialNumber > 32000) {
        version = 3;
        tokenId = kabutoResp.data.data.v3TokenId;
        contractId = kabutoResp.data.data.v3ContractId;
        serialNumber = serialNumber - 32000;
      } else if (serialNumber < 0) {
        // negative serial numbers use v2 IDs
        version = 2;
        tokenId = kabutoResp.data.data.v2TokenId;
        contractId = kabutoResp.data.data.v2ContractId;
        serialNumber = -serialNumber;
      } else {
        version = 1;
        tokenId = kabutoResp.data.data.v1TokenId;
        contractId = kabutoResp.data.data.v1ContractId;
      }

      expirationTime = new Date(Date.parse(kabutoResp.data.data.expiresAt));
    } catch (error) {
      handleResolverAxiosError(error);
    }

    const hederaResp = await this._hederaMirror.get<{
      account_id: string;
    }>(`/api/v1/tokens/${tokenId}/nfts/${serialNumber}`);

    return {
      domain: `${parseName(name).secondLevelDomain}.${
        parseName(name).topLevelDomain
      }`,
      ownerAccountId: AccountId.fromString(hederaResp.data.account_id),
      serialNumber,
      contractSerialNumber,
      expirationTime,
      contractId: ContractId.fromString(contractId),
      tokenId: TokenId.fromString(tokenId),
      version,
    };
  }

  /**
   * Gets all address and all text records for a name.
   */
  async getAll(
    name: string,
  ): Promise<{ text: TextRecord[]; address: AddressRecord[] }> {
    try {
      const { data } = await this._resolver.get<{
        data: {
          address: RawAddressRecord[];
          text: TextRecord[];
        };
      }>(`/name/${encodeURIComponent(normalizeName(name))}/record`);

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
      const nameComponent = encodeURIComponent(normalizeRecordName(name));
      const url = `/name/${nameComponent}/record/address/${coinType}`;

      const { data } = await this._resolver.get<{
        data: RawAddressRecord;
      }>(url);

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
      }>(`/name/${encodeURIComponent(normalizeRecordName(name))}/record/text`);

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
        `/name/${encodeURIComponent(normalizeName(name))}/metadata`,
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
    address: Uint8Array | string | AccountId,
  ): Promise<AddressRecord> {
    return this.setAddress(name, 3030, serializeHederaAddress(address));
  }

  /**
   * Sets the address record for a name and coin type.
   */
  async setAddress(
    name: string,
    coinType: number,
    address: Uint8Array | string,
  ): Promise<AddressRecord> {
    const parsedName = parseRecordName(name);
    const nameId = await this._getNameId(parsedName);

    const serAddress = serializeAddress(coinType, address);

    const setParams = new ContractFunctionParameters()
      .addInt64(nameId.contractSerialNumber as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)))
      .addUint32(coinType)
      .addBytes(serAddress);

    const transaction = new ContractExecuteTransaction()
      .setContractId(nameId.contractId)
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
    const nameId = await this._getNameId(parsedName);

    const setParams = new ContractFunctionParameters()
      .addInt64(nameId.contractSerialNumber as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)))
      .addString(text);

    const transaction = new ContractExecuteTransaction()
      .setContractId(nameId.contractId)
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
    const nameId = await this._getNameId(parsedName);

    const delParams = new ContractFunctionParameters()
      .addInt64(nameId.contractSerialNumber as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)));

    const transaction = new ContractExecuteTransaction()
      .setContractId(nameId.contractId)
      .setFunction("deleteText", delParams)
      .setGas(200_000);

    await this._executeTransaction(transaction);
  }

  /**
   * Removes an address record for a name and coin type.
   */
  async removeAddress(name: string, coinType: number): Promise<void> {
    const parsedName = parseRecordName(name);
    const nameId = await this._getNameId(parsedName);

    const delParams = new ContractFunctionParameters()
      .addInt64(nameId.contractSerialNumber as unknown as BigNumber)
      .addBytes32(toBytes32(utf8Encode(parsedName.recordName)))
      .addUint32(coinType);

    const transaction = new ContractExecuteTransaction()
      .setContractId(nameId.contractId)
      .setFunction("deleteAddress", delParams)
      .setGas(200_000);

    await this._executeTransaction(transaction);
  }

  /**
   * Searches for names with the given address record.
   */
  async findNamesByAddress(
    coinType: number,
    address: string | Uint8Array,
  ): Promise<string[]> {
    const fmtAddress = formatAddress(
      coinType,
      serializeAddress(coinType, address),
    );

    const { data } = await this._resolver.get<{
      data: Array<{ domain: string; parent: string }>;
    }>(`/record/address/${coinType}/${fmtAddress}/name`);

    return data.data.map((rec) => `${rec.domain}.${rec.parent}`);
  }

  /**
   * Searches for names with the given owner account. Returns the domain and expiration.
   */
  async findNamesByOwner(
    ownerAccountId?: AccountId | string,
  ): Promise<Array<Pick<Name, "domain" | "expirationTime">>> {
    const { data } = await this._resolver.get<{
      data: { names: Array<{ name: string; expiresAt: string }> };
    }>(
      ownerAccountId
        ? `/owner/${ownerAccountId}`
        : `/owner/${this._signer?.getAccountId()}`,
    );

    return data.data.names.map((name) => ({
      domain: name.name as string,
      expirationTime: new Date(name.expiresAt),
    }));
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

  private async _getV3TldId(
    tld: string,
  ): Promise<{ contractId: ContractId; tokenId: TokenId }> {
    let id = this._v3TldIds.get(tld);

    if (id != null) {
      return id;
    }

    try {
      const { data } = await this._resolver.get<{
        data: {
          v3ContractId: string;
          v3TokenId: string;
        };
      }>(`/name/.${tld}`);

      const contractId = ContractId.fromString(data.data.v3ContractId);
      const tokenId = TokenId.fromString(data.data.v3TokenId);

      id = { contractId, tokenId };

      this._v3TldIds.set(tld, id);

      return id;
    } catch (error) {
      handleResolverAxiosError(error);
    }
  }

  private _toContractSerialNumber(
    version: number,
    serialNumber: number,
  ): number {
    if (version === 3) {
      return 32000 + serialNumber;
    }

    if (version === 2) {
      return -serialNumber;
    }

    return serialNumber;
  }

  private async _getNameId(parsedName: ParsedName): Promise<NameId> {
    const name = `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`;
    let nameId = this._nameIds.get(name);

    if (nameId != null) {
      return nameId;
    }

    const { serialNumber, tokenId, contractId, version, contractSerialNumber } =
      await this.getName(
        `${parsedName.secondLevelDomain}.${parsedName.topLevelDomain}`,
      );

    nameId = {
      serialNumber,
      tokenId,
      contractId,
      version,
      contractSerialNumber,
    };

    this._nameIds.set(name, nameId);

    return nameId;
  }

  private async _executeTransaction(
    transaction: Transaction,
  ): Promise<TransactionReceipt> {
    this._requireSigner();

    await transaction.freezeWithSigner(this._signer!);

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
