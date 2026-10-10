// SPDX-License-Identifier: Apache-2.0
//
// Lace (Midnight DApp Connector API v4).

import type { Configuration, ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { NETWORK_ID } from "./network";

export type Wallet = {
  api: ConnectedAPI;
  name: string;
  config: Configuration;
  shieldedAddress: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
};

const findConnector = (): InitialAPI | null => {
  const m = window.midnight;
  if (!m) return null;
  return m.mnLace ?? Object.values(m).find((w) => typeof w?.connect === "function") ?? null;
};

/** Lace injects `window.midnight` a moment after load; poll briefly for it. */
export const detectWallet = async (timeoutMs = 3000): Promise<InitialAPI | null> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const c = findConnector();
    if (c) return c;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
};

export class WalletError extends Error {}

export const connectWallet = async (): Promise<Wallet> => {
  const connector = await detectWallet();
  if (!connector) throw new WalletError("Lace wallet not found. Install Lace with Midnight enabled, then reload.");
  let api: ConnectedAPI;
  try {
    api = await connector.connect(NETWORK_ID);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes("reject") || msg.includes("cancel")) throw new WalletError("Connection request was rejected in Lace.");
    throw new WalletError(`Couldn't connect. Make sure Lace is set to the Preprod network. (${(e as Error)?.message ?? e})`);
  }
  const [config, addr] = await Promise.all([api.getConfiguration(), api.getShieldedAddresses()]);
  if (config.networkId !== NETWORK_ID) throw new WalletError(`Lace is on "${config.networkId}". Switch it to Preprod.`);
  await api.hintUsage(["balanceUnsealedTransaction", "submitTransaction", "getProvingProvider"]).catch(() => {});
  return {
    api,
    name: connector.name,
    config,
    shieldedAddress: addr.shieldedAddress,
    coinPublicKey: addr.shieldedCoinPublicKey,
    encryptionPublicKey: addr.shieldedEncryptionPublicKey,
  };
};

export const shortAddress = (a: string) => (a.length > 20 ? `${a.slice(0, 12)}…${a.slice(-6)}` : a);
