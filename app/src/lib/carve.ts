// SPDX-License-Identifier: Apache-2.0
//
// Carve on Midnight Preprod from the browser: providers backed by Lace, this
// browser's identity, and one function per circuit.

import {
  CarvePrivateStateId,
  type CarvePrivateState,
  Contract,
  type Grant,
  type Ledger,
  type License,
  fromHex,
  ledger,
  newHolder,
  newLicensor,
  pureCircuits,
  randomBytes,
  toHex,
  witnesses,
} from "@carve/contract";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { type FinalizedTransaction, Transaction } from "@midnight-ntwrk/ledger-v8";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { type MidnightProvider, type UnboundTransaction, type WalletProvider, createProofProvider } from "@midnight-ntwrk/midnight-js-types";
import { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } from "@midnight-ntwrk/midnight-js-utils";
import { Observable, map } from "rxjs";
import { PUBLIC_INDEXER } from "./network";
import { LocalPrivateStateProvider, local } from "./privateState";
import type { Wallet } from "./wallet";

type Circuit = "issue" | "accept" | "prove_rights";

// biome-ignore lint/suspicious/noExplicitAny: compact-js's Effect-style builder is not worth re-typing here
const CC = CompiledContract as any;
const ZK_BASE = `${window.location.origin}${import.meta.env.BASE_URL}managed/carve`;
const compiled = CC.make("carve", Contract).pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(ZK_BASE));

// ── identity ────────────────────────────────────────────────────────────────
/** This browser's secret. Its hashes are the user's licensor and licensee keys. */
export const identity = (): Uint8Array => {
  const s = local.get<Uint8Array>("identity");
  if (s) return s;
  const fresh = randomBytes();
  local.set("identity", fresh);
  return fresh;
};
/** What a licensor needs to issue this user a grant. */
export const myLicenseeId = () => toHex(pureCircuits.licensee_key(identity()));
export const isLicenseeId = (s: string) => /^[0-9a-f]{64}$/i.test(s.trim());

// ── public reads ────────────────────────────────────────────────────────────
export const isAddress = (a: string) => /^[0-9a-fA-F]{64}$/.test(a);

type Reader = ReturnType<typeof indexerPublicDataProvider>;
let reader: Reader | null = PUBLIC_INDEXER ? indexerPublicDataProvider(PUBLIC_INDEXER.http, PUBLIC_INDEXER.ws) : null;
const readerListeners = new Set<() => void>();

/** Whether books can be read right now (public token, or a connected wallet's indexer). */
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

/** The ledger as deployed, before any proven change. */
export const fetchDeployLedger = async (address: string): Promise<Ledger | null> => {
  if (!reader) throw new Error("No indexer available");
  const s = await reader.queryDeployContractState(address);
  return s ? ledger(s.data) : null;
};

/** Live ledger: every new contract-state update from the indexer. */
export const watchLedger = (address: string): Observable<Ledger> => {
  if (!reader) throw new Error("No indexer available");
  return reader.contractStateObservable(address, { type: "latest" }).pipe(map((s) => ledger(s.data)));
};

// ── providers ───────────────────────────────────────────────────────────────
export const privateStates = new LocalPrivateStateProvider<CarvePrivateState>();

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

// ── local records ───────────────────────────────────────────────────────────
export type Recent = { address: string; title: string; at: number };
export const recentBooks = () => local.get<Recent[]>("books") ?? [];
export const rememberBook = (address: string, title: string) => {
  const rest = recentBooks().filter((x) => x.address !== address);
  local.set("books", [{ address, title, at: Date.now() }, ...rest].slice(0, 12));
};

/** Licenses this browser holds, as their codes. */
export type Held = { address: string; id: number; title: string; code: string };
export const heldLicenses = () => local.get<Held[]>("licenses") ?? [];
const rememberLicense = (h: Held) => {
  const rest = heldLicenses().filter((x) => !(x.address === h.address && x.id === h.id));
  local.set("licenses", [h, ...rest]);
};

/** The licensor's private notes on a grant: who it is for, the terms, its code. Never on-chain. */
export type GrantNote = { name: string; note: string; code: string };
export const grantNotes = (address: string) => local.get<Record<string, GrantNote>>(`notes:${address}`) ?? {};
export const saveGrantNote = (address: string, id: number, n: GrantNote) => local.set(`notes:${address}`, { ...grantNotes(address), [id]: n });

/** This browser's private state for a book, without touching the chain. */
export const loadPrivateState = async (address: string): Promise<CarvePrivateState | null> => {
  privateStates.setContractAddress(address);
  return privateStates.get(CarvePrivateStateId);
};

export const isLicensor = (l: Ledger, ps: CarvePrivateState | null) =>
  !!ps?.book && toHex(pureCircuits.licensor_key(ps.secret)) === toHex(l.licensor);

/** Whether a grant opening matches the commitment on the ledger. */
export const onLedger = (l: Ledger, id: number, g: Grant) =>
  l.grants.member(BigInt(id)) && toHex(l.grants.lookup(BigInt(id))) === toHex(pureCircuits.grant_commitment(g));

/** Keep a license on this device so its grant can be accepted and proven. */
export const holdLicense = async (lic: License, code: string) => {
  const ps = (await loadPrivateState(lic.address)) ?? newHolder(identity());
  await privateStates.set(CarvePrivateStateId, { ...ps, held: { ...ps.held, [lic.id]: lic.grant } });
  rememberLicense({ address: lic.address, id: lic.id, title: lic.title, code });
};

// ── actions ─────────────────────────────────────────────────────────────────
/** Deploy a new book. The licensor's empty book is committed in the same transaction. */
export const createBook = async (p: Providers, title: string): Promise<string> => {
  const deployed: Deployed = await deployContract(p as never, {
    compiledContract: compiled,
    privateStateId: CarvePrivateStateId,
    initialPrivateState: newLicensor(identity()),
    args: [title],
  } as never);
  const address: string = deployed.deployTxData.public.contractAddress;
  rememberBook(address, title);
  return address;
};

/** Connect to a deployed book, keeping whatever private state this browser holds for it. */
export const openBook = async (p: Providers, address: string): Promise<Deployed> => {
  const ps = (await loadPrivateState(address)) ?? newHolder(identity());
  return findDeployedContract(p as never, {
    contractAddress: address,
    compiledContract: compiled,
    privateStateId: CarvePrivateStateId,
    initialPrivateState: ps,
  } as never);
};

export const issue = async (c: Deployed, g: Grant) => c.callTx.issue(g);
export const accept = async (c: Deployed, id: number) => c.callTx.accept(BigInt(id));
export const proveRights = async (c: Deployed, id: number, region: number, category: number, check: Uint8Array) =>
  c.callTx.prove_rights(BigInt(id), BigInt(region), BigInt(category), check);
