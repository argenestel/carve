// SPDX-License-Identifier: Apache-2.0
//
// Browser private-state provider. Secrets and bid amounts are stored in this
// browser's localStorage, scoped per tender contract, and never sent anywhere.
// (The LevelDB provider also works, but needs heavy Node polyfills in the browser.)

import type { ContractAddress, SigningKey } from "@midnight-ntwrk/compact-runtime";
import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import { fromHex, toHex } from "@bidlock/contract";
import { NETWORK_ID } from "./network";

const encode = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (x instanceof Uint8Array ? { $u8: toHex(x) } : typeof x === "bigint" ? { $n: x.toString() } : x));
const decode = <T>(s: string): T =>
  JSON.parse(s, (_k, x) => (x && typeof x === "object" ? ("$u8" in x ? fromHex(x.$u8) : "$n" in x ? BigInt(x.$n) : x) : x));

const prefix = `bidlock:${NETWORK_ID}`;

export class LocalPrivateStateProvider<PS> implements PrivateStateProvider<string, PS> {
  private address: string | null = null;

  setContractAddress(address: ContractAddress): void {
    this.address = address;
  }
  private key(id: string) {
    if (!this.address) throw new Error("Private state accessed before the contract address was set");
    return `${prefix}:ps:${this.address}:${id}`;
  }
  async set(id: string, state: PS) {
    localStorage.setItem(this.key(id), encode(state));
  }
  async get(id: string): Promise<PS | null> {
    const s = localStorage.getItem(this.key(id));
    return s ? decode<PS>(s) : null;
  }
  async remove(id: string) {
    localStorage.removeItem(this.key(id));
  }
  async clear() {
    for (const k of Object.keys(localStorage)) if (k.startsWith(`${prefix}:ps:`)) localStorage.removeItem(k);
  }
  async setSigningKey(address: ContractAddress, key: SigningKey) {
    localStorage.setItem(`${prefix}:sk:${address}`, encode(key));
  }
  async getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
    const s = localStorage.getItem(`${prefix}:sk:${address}`);
    return s ? decode<SigningKey>(s) : null;
  }
  async removeSigningKey(address: ContractAddress) {
    localStorage.removeItem(`${prefix}:sk:${address}`);
  }
  async clearSigningKeys() {
    for (const k of Object.keys(localStorage)) if (k.startsWith(`${prefix}:sk:`)) localStorage.removeItem(k);
  }
  exportPrivateStates(): never {
    throw new Error("Export is not supported by the browser store");
  }
  importPrivateStates(): never {
    throw new Error("Import is not supported by the browser store");
  }
  exportSigningKeys(): never {
    throw new Error("Export is not supported by the browser store");
  }
  importSigningKeys(): never {
    throw new Error("Import is not supported by the browser store");
  }
}

/** Small app-level records: the buyer's X25519 key per tender, recent tenders. */
export const local = {
  get<T>(k: string): T | null {
    const s = localStorage.getItem(`${prefix}:${k}`);
    return s ? decode<T>(s) : null;
  },
  set(k: string, v: unknown) {
    localStorage.setItem(`${prefix}:${k}`, encode(v));
  },
};
