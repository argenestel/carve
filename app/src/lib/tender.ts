// SPDX-License-Identifier: Apache-2.0
//
// Bidlock on Midnight Preprod from the browser: providers backed by Lace, and
// one function per circuit.

import {
  BidlockPrivateStateId,
  type BidlockPrivateState,
  Contract,
  type Ledger,
  type Opening,
  awardInput,
  buyerPrivateState,
  emptyPrivateState,
  ledger,
  lowestBid,
  newBoxKeys,
  openSealed,
  pureCircuits,
  randomBytes,
  sealOpening,
  supplierPrivateState,
  toHex,
  witnesses,
} from "@bidlock/contract";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { type FinalizedTransaction, Transaction } from "@midnight-ntwrk/ledger-v8";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { type MidnightProvider, type UnboundTransaction, type WalletProvider, createProofProvider } from "@midnight-ntwrk/midnight-js-types";
import { fromHex, parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from "@midnight-ntwrk/midnight-js-utils";
import { Observable, map } from "rxjs";
import { PUBLIC_INDEXER } from "./network";
import { LocalPrivateStateProvider, local } from "./privateState";
import type { Wallet } from "./wallet";

type Circuit = "qualify" | "submit_bid" | "reveal_bid" | "award" | "accept_award" | "dispute";

// biome-ignore lint/suspicious/noExplicitAny: compact-js's Effect-style builder is not worth re-typing here
const CC = CompiledContract as any;
const ZK_BASE = `${window.location.origin}${import.meta.env.BASE_URL}managed/bidlock`;
const compiled = CC.make("bidlock", Contract).pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(ZK_BASE));

// ── public reads (no wallet needed) ─────────────────────────────────────────
export const isAddress = (a: string) => /^[0-9a-fA-F]{64}$/.test(a);

type Reader = ReturnType<typeof indexerPublicDataProvider>;
let reader: Reader | null = PUBLIC_INDEXER ? indexerPublicDataProvider(PUBLIC_INDEXER.http, PUBLIC_INDEXER.ws) : null;
const readerListeners = new Set<() => void>();

/** Whether tenders can be read right now (public token, or a connected wallet's indexer). */
export const canRead = () => reader !== null;
export const onReaderChange = (fn: () => void) => {
  readerListeners.add(fn);
  return () => {
    readerListeners.delete(fn);
  };
};
/** After connecting Lace, read through the indexer the wallet is configured with. */
export const setWalletIndexer = (w: Wallet) => {
  if (PUBLIC_INDEXER) return;
  reader = indexerPublicDataProvider(w.config.indexerUri, w.config.indexerWsUri);
  for (const fn of readerListeners) fn();
};

export const fetchLedger = async (address: string): Promise<Ledger | null> => {
  if (!reader) throw new Error("No indexer available");
  const s = await reader.queryContractState(address);
  return s ? ledger(s.data) : null;
};

/** Live ledger: every new contract-state update from the indexer. */
export const watchLedger = (address: string): Observable<Ledger> => {
  if (!reader) throw new Error("No indexer available");
  return reader.contractStateObservable(address, { type: "latest" }).pipe(map((s) => ledger(s.data)));
};

// ── providers ───────────────────────────────────────────────────────────────
export const privateStates = new LocalPrivateStateProvider<BidlockPrivateState>();

export type Providers = Awaited<ReturnType<typeof makeProviders>>;

export const makeProviders = async (w: Wallet) => {
  const zk = new FetchZkConfigProvider<Circuit>(ZK_BASE, fetch.bind(window));
  const netId = getNetworkId();
  const coin = parseCoinPublicKeyToHex(w.coinPublicKey, netId);
  const enc = parseEncPublicKeyToHex(w.encryptionPublicKey, netId);

  // Prefer proving inside Lace; fall back to the proof server Lace is configured with.
  let proofProvider;
  try {
    proofProvider = createProofProvider(await w.api.getProvingProvider(zk));
  } catch {
    proofProvider = httpClientProofProvider(w.config.proverServerUri ?? "http://127.0.0.1:6300", zk);
  }

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => coin,
    getEncryptionPublicKey: () => enc,
    async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
      const { tx: balanced } = await w.api.balanceUnsealedTransaction(toHex(tx.serialize()));
      return Transaction.deserialize("signature", "proof", "binding", fromHex(balanced)) as FinalizedTransaction;
    },
  };
  const midnightProvider: MidnightProvider = {
    async submitTx(tx: FinalizedTransaction) {
      await w.api.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };
  return {
    privateStateProvider: privateStates,
    publicDataProvider: indexerPublicDataProvider(w.config.indexerUri, w.config.indexerWsUri),
    zkConfigProvider: zk,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
};

// biome-ignore lint/suspicious/noExplicitAny: DeployedContract<C> is generic over the compiled contract
type Deployed = any;
export type TxResult = { txId: string; block: number };
const tx = (r: { public: { txId: string; blockHeight: number } }): TxResult => ({ txId: r.public.txId, block: r.public.blockHeight });

// ── local records ───────────────────────────────────────────────────────────
type BoxRecord = { publicKey: Uint8Array; secretKey: Uint8Array };
export const buyerBox = (address: string) => local.get<BoxRecord>(`box:${address}`);

export type Recent = { address: string; title: string; role: "buyer" | "supplier" | "viewer"; at: number };
export const recentTenders = () => local.get<Recent[]>("recent") ?? [];
export const rememberTender = (r: Omit<Recent, "at">) => {
  const rest = recentTenders().filter((x) => x.address !== r.address);
  local.set("recent", [{ ...r, at: Date.now() }, ...rest].slice(0, 12));
};

/** This browser's private state for a tender, without touching the chain. */
export const loadPrivateState = async (address: string): Promise<BidlockPrivateState | null> => {
  privateStates.setContractAddress(address);
  return privateStates.get(BidlockPrivateStateId);
};

// ── buyer ───────────────────────────────────────────────────────────────────
export type NewTender = { title: string; ceiling: bigint; closesAt: Date; revealUntil: Date };

export const deployTender = async (p: Providers, t: NewTender) => {
  const box = newBoxKeys();
  const secs = (d: Date) => BigInt(Math.floor(d.getTime() / 1000));
  const deployed: Deployed = await deployContract(p as never, {
    compiledContract: compiled,
    privateStateId: BidlockPrivateStateId,
    initialPrivateState: buyerPrivateState(randomBytes()),
    args: [t.title, randomBytes(), box.publicKey, t.ceiling, secs(t.closesAt), secs(t.revealUntil)],
  } as never);
  const address: string = deployed.deployTxData.public.contractAddress;
  local.set(`box:${address}`, box);
  rememberTender({ address, title: t.title, role: "buyer" });
  return { address, ...tx(deployed.deployTxData) };
};

/** Join a deployed tender, keeping whatever private state this browser already holds for it. */
export const joinTender = async (p: Providers, address: string): Promise<Deployed> => {
  const existing = await loadPrivateState(address);
  return findDeployedContract(p as never, {
    contractAddress: address,
    compiledContract: compiled,
    privateStateId: BidlockPrivateStateId,
    initialPrivateState: existing ?? emptyPrivateState(),
  } as never);
};

export const qualify = async (c: Deployed, commitmentHex: string) => tx(await c.callTx.qualify(fromHex(commitmentHex)));

export const decryptOpenings = (address: string, l: Ledger) => {
  const box = buyerBox(address);
  const out = new Map<bigint, { opening: Opening; company: string }>();
  if (!box) return out;
  for (const [i, sealed] of l.sealed_openings) {
    const o = openSealed(sealed, box);
    if (o) out.set(i, o);
  }
  return out;
};

export const award = async (address: string, l: Ledger, c: Deployed, exclude: bigint[]) => {
  const decrypted = new Map([...decryptOpenings(address, l)].map(([i, o]) => [i, o.opening] as const));
  const winner = lowestBid(new Map([...decrypted].filter(([i]) => !exclude.includes(i))));
  if (winner === null) throw new Error("There are no decryptable bids to award.");
  const ps = (await loadPrivateState(address))!;
  await privateStates.set(BidlockPrivateStateId, { ...ps, award: awardInput(winner, decrypted, exclude) });
  return { winner, ...tx(await c.callTx.award(winner)) };
};

// ── supplier ────────────────────────────────────────────────────────────────

/** A per-tender supplier secret, created in this browser. Only its commitment is shared with the buyer. */
export const ensureCredential = async (address: string): Promise<string> => {
  const existing = await loadPrivateState(address);
  if (existing?.supplierSecret) return toHex(pureCircuits.supplier_commitment(existing.supplierSecret));
  if (existing?.buyerSecret) throw new Error("This browser is the buyer for this tender.");
  const s = supplierPrivateState(randomBytes());
  await privateStates.set(BidlockPrivateStateId, s);
  return toHex(pureCircuits.supplier_commitment(s.supplierSecret!));
};

export const placeBid = async (address: string, c: Deployed, amount: bigint) => {
  const ps = (await loadPrivateState(address))!;
  await privateStates.set(BidlockPrivateStateId, { ...ps, pendingBid: { amount, salt: randomBytes() } });
  const r = await c.callTx.submit_bid();
  return { index: r.private.result as bigint, ...tx(r) };
};

export const myBid = (ps: BidlockPrivateState | null): [bigint, Opening] | null => {
  const e = Object.entries(ps?.bids ?? {})[0];
  return e ? [BigInt(e[0]), e[1]] : null;
};

export const revealBid = async (l: Ledger, c: Deployed, ps: BidlockPrivateState, company: string) => {
  const [i, o] = myBid(ps)!;
  return tx(await c.callTx.reveal_bid(i, sealOpening(o, company, l.buyer_key)));
};

export const acceptAward = async (c: Deployed, company: string) => tx(await c.callTx.accept_award(company));

export const disputeAward = async (c: Deployed, ps: BidlockPrivateState) => tx(await c.callTx.dispute(myBid(ps)![0]));
