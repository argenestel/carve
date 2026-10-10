// SPDX-License-Identifier: Apache-2.0
//
// Headless wallet for the Bidlock CLI. Adapted from midnightntwrk/example-counter
// (Copyright (C) 2025 Midnight Foundation, Apache-2.0) via
// mashharuki/midnight-rps-sample-app, including its wallet-state cache and
// intent-signing workaround.

import fs from "node:fs";
import path from "node:path";
import * as ledger from "@midnight-ntwrk/ledger-v8";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v8";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { InMemoryTransactionHistoryStorage } from "@midnight-ntwrk/wallet-sdk-abstractions";
import { WalletEntrySchema, WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { HDWallet, Roles, generateRandomSeed } from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import {
  PublicKey,
  type UnshieldedKeystore,
  UnshieldedWallet,
  createKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import * as Rx from "rxjs";
import { WebSocket } from "ws";
import { type Network, stateDir } from "./config.js";

// The wallet SDK's indexer client expects a global WebSocket.
(globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

export const step = async <T>(message: string, fn: () => Promise<T>): Promise<T> => {
  const frames = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
  let i = 0;
  const tty = process.stdout.isTTY;
  const t = tty ? setInterval(() => process.stdout.write(`\r  ${frames[i++ % frames.length]} ${message}`), 80) : undefined;
  if (!tty) console.log(`  … ${message}`);
  try {
    const out = await fn();
    clearInterval(t);
    process.stdout.write(`${tty ? "\r" : ""}  ✓ ${message}\n`);
    return out;
  } catch (e) {
    clearInterval(t);
    process.stdout.write(`${tty ? "\r" : ""}  ✗ ${message}\n`);
    throw e;
  }
};

/**
 * Sign every unshielded offer in a transaction's intents with the right proof
 * marker. Works around signRecipe hard-coding 'pre-proof', which fails for
 * proven intents.
 */
const signTransactionIntents = (
  // biome-ignore lint/suspicious/noExplicitAny: ledger intent maps are loosely typed
  tx: { intents?: Map<number, any> },
  sign: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof",
): void => {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      "signature",
      proofMarker,
      "pre-binding",
      intent.serialize(),
    );
    const signature = sign(cloned.signatureData(segment));
    if (cloned.fallibleUnshieldedOffer) {
      const offer = cloned.fallibleUnshieldedOffer;
      cloned.fallibleUnshieldedOffer = offer.addSignatures(offer.inputs.map((_, i) => offer.signatures.at(i) ?? signature));
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const offer = cloned.guaranteedUnshieldedOffer;
      cloned.guaranteedUnshieldedOffer = offer.addSignatures(offer.inputs.map((_, i) => offer.signatures.at(i) ?? signature));
    }
    tx.intents.set(segment, cloned);
  }
};

export const walletProvider = async (ctx: WalletContext): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx, ttl?) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const sign = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, sign, "proof");
      if (recipe.balancingTransaction) signTransactionIntents(recipe.balancingTransaction, sign, "pre-proof");
      return ctx.wallet.finalizeRecipe(recipe);
    },
    // biome-ignore lint/suspicious/noExplicitAny: facade and midnight-js disagree on the tx id type
    submitTx: (tx) => ctx.wallet.submitTransaction(tx) as any,
  };
};

const deriveKeys = (seed: string) => {
  const hd = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hd.type !== "seedOk") throw new Error("Invalid wallet seed");
  const derived = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  if (derived.type !== "keysDerived") throw new Error("Failed to derive wallet keys");
  hd.hdWallet.clear();
  return derived.keys;
};

const cacheDir = (net: Network, seed: string) => path.join(stateDir(net), "wallet-cache", seed.slice(0, 16));
const readCache = (dir: string, name: string) => {
  const p = path.join(dir, `${name}.json`);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
};

export const persistWallet = async (net: Network, seed: string, wallet: WalletFacade) => {
  const dir = cacheDir(net, seed);
  fs.mkdirSync(dir, { recursive: true });
  const [s, u, d] = await Promise.all([wallet.shielded.serializeState(), wallet.unshielded.serializeState(), wallet.dust.serializeState()]);
  fs.writeFileSync(path.join(dir, "shielded.json"), s);
  fs.writeFileSync(path.join(dir, "unshielded.json"), u);
  fs.writeFileSync(path.join(dir, "dust.json"), d);
};

/** Load the seed from BIDLOCK_WALLET_SEED or .bidlock/<net>/seed, creating one if needed. */
export const loadOrCreateSeed = (net: Network): string => {
  if (process.env.BIDLOCK_WALLET_SEED) return process.env.BIDLOCK_WALLET_SEED;
  const p = path.join(stateDir(net), "seed");
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  const seed = Buffer.from(generateRandomSeed()).toString("hex");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, seed, { mode: 0o600 });
  console.log(`  New wallet seed written to ${p} (keep it private).`);
  return seed;
};

export const buildWallet = async (net: Network, seed: string): Promise<WalletContext> => {
  const keys = deriveKeys(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  const conn = { indexerHttpUrl: net.indexer, indexerWsUrl: net.indexerWS, keepAlive: 0 };
  const configuration = {
    networkId: getNetworkId(),
    indexerClientConnection: conn,
    batchSize: 1000, // default 10 makes the first preprod sync take far longer
    provingServerUrl: new URL(net.proofServer),
    relayURL: new URL(net.node.replace(/^http/, "ws")),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };
  const dir = cacheDir(net, seed);
  const [sc, uc, dc] = [readCache(dir, "shielded"), readCache(dir, "unshielded"), readCache(dir, "dust")];
  const cached = sc && uc && dc;

  const wallet = await step(cached ? "Restoring wallet from cache" : "Building wallet", async () => {
    const w = await WalletFacade.init({
      // biome-ignore lint/suspicious/noExplicitAny: union of the three sub-wallet configs
      configuration: configuration as any,
      shielded: (cfg) => (cached ? ShieldedWallet(cfg).restore(sc) : ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys)),
      unshielded: (cfg) =>
        cached ? UnshieldedWallet(cfg).restore(uc) : UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
      dust: (cfg) =>
        cached
          ? DustWallet(cfg).restore(dc)
          : DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
    });
    await w.start(shieldedSecretKeys, dustSecretKey);
    return w;
  });

  console.log(`\n  Unshielded address (fund with tNIGHT): ${unshieldedKeystore.getBech32Address()}`);
  if (net.faucet) console.log(`  Faucet: ${net.faucet}\n`);

  const synced = await step("Syncing with network (first preprod sync can take a long time)", () =>
    Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.filter((s) => s.isSynced))),
  );
  await persistWallet(net, seed, wallet);

  const balance = synced.unshielded.balances[unshieldedToken().raw] ?? 0n;
  if (balance === 0n) {
    await step("Waiting for tNIGHT from the faucet", () =>
      Rx.firstValueFrom(
        wallet.state().pipe(
          Rx.throttleTime(10_000),
          Rx.filter((s) => s.isSynced && (s.unshielded.balances[unshieldedToken().raw] ?? 0n) > 0n),
        ),
      ),
    );
  }
  await ensureDust(wallet, unshieldedKeystore);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
};

/** DUST pays fees; it accrues only from NIGHT UTXOs registered for generation. */
const ensureDust = async (wallet: WalletFacade, keystore: UnshieldedKeystore) => {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  if (state.dust.availableCoins.length > 0) return;
  const unregistered = state.unshielded.availableCoins.filter(
    (c: { meta?: { registeredForDustGeneration?: boolean } }) => c.meta?.registeredForDustGeneration !== true,
  );
  if (unregistered.length > 0) {
    await step(`Registering ${unregistered.length} NIGHT UTXO(s) for DUST generation`, async () => {
      const recipe = await wallet.registerNightUtxosForDustGeneration(unregistered, keystore.getPublicKey(), (p) => keystore.signData(p));
      await wallet.submitTransaction(await wallet.finalizeRecipe(recipe));
    });
  }
  await step("Waiting for DUST to accrue", () =>
    Rx.firstValueFrom(wallet.state().pipe(Rx.throttleTime(5_000), Rx.filter((s) => s.isSynced && s.dust.balance(new Date()) > 0n))),
  );
};
