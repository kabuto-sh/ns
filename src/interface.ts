import type { AccountId, Hbar, Signer } from "@hashgraph/sdk";
import type BigNumber from "bignumber.js";
import type { AddressRecord, Name, TextRecord } from "./models.js";

export interface IKNS {
  /**
   * Sets the passed signer to be used to sign any generated transactions.
   * Must be called before any write method is called.
   */
  setSigner(signer: Signer): void;

  /**
   * Gets the estimated price (in USD) of registering the name.
   * Does not check if the name is available.
   */
  getRegisterPriceUsd(name: string): BigNumber;

  /**
   * Gets the estimated price (in HBAR) of registering the name.
   * Does not check if the name is available.
   */
  getRegisterPriceHbar(name: string): Promise<Hbar>;

  /**
   * Registers a new name to the current signer for the desired duration.
   * To check how much HBAR this will cost, call `getRegisterPrice(name)`.
   */
  registerName(name: string, duration: { years: number }): Promise<Name>;

  /**
   * Sets the address record for a name and coin type.
   */
  setAddress(
    name: string,
    coinType: number,
    address: Uint8Array | string
  ): Promise<AddressRecord>;

  /**
   * Sets the HBAR address record for a name.
   */
  setHederaAddress(
    name: string,
    address: Uint8Array | string | AccountId
  ): Promise<AddressRecord>;

  /**
   * Sets the text record for a name.
   */
  setText(name: string, text: string): Promise<TextRecord>;

  /**
   * Removes an address record for a name and coin type.
   */
  removeAddress(name: string, coinType: number): Promise<void>;

  /**
   * Removes a text record for a name.
   */
  removeText(name: string): Promise<void>;

  /**
   * Gets the registration information for a name, if registered.
   */
  getName(name: string): Promise<Name>;

  /**
   * Gets all address and all text records for a name.
   */
  getAll(
    name: string
  ): Promise<{ address: AddressRecord[]; text: TextRecord[] }>;

  /**
   * Gets all address records for a name.
   */
  getAllAddress(name: string): Promise<AddressRecord[]>;

  /**
   * Gets all text records for a name.
   */
  getAllText(name: string): Promise<TextRecord[]>;

  /**
   * Gets the address record for a name and coin type.
   */
  getAddress(name: string, coinType: number): Promise<Uint8Array>;

  /**
   * Gets the HBAR address record for a name.
   */
  getHederaAddress(name: string): Promise<AccountId>;

  /**
   * Gets a text record for a name.
   */
  getText(name: string): Promise<string>;
}
