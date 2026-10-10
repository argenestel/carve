// SPDX-License-Identifier: Apache-2.0
//
// Salvo on Midnight Preprod from the browser: providers backed by Lace, and
// one function per circuit.

import {
  Contract,
  type Ledger,
  type Placement,
  SalvoPrivateStateId,
  type SalvoPrivateState,
  ledger,
  newPlayer,
  pureCircuits,
  salvo,
  toFleet,
  toHex,
  witnesses,
} from "@salvo/contract";
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

type Circuit = "join" | "play" | "claim_timeout" | "resign" | "show_fleet";

// biome-ignore lint/suspicious/noExplicitAny: compact-js's Effect-style builder is not worth re-typing here
const CC = CompiledContract as any;
const ZK_BASE = `${window.location.origin}${import.meta.env.BASE_URL}managed/salvo`;
const compiled = CC.make("salvo", Contract).pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(ZK_BASE));

// ── public reads ────────────────────────────────────────────────────────────
export const isAddress = (a: string) => /^[0-9a-fA-F]{64}$/.test(a);

type Reader = ReturnType<typeof indexerPublicDataProvider>;
let reader: Reader | null = PUBLIC_INDEXER ? indexerPublicDataProvider(PUBLIC_INDEXER.http, PUBLIC_INDEXER.ws) : null;
const readerListeners = new Set<() => void>();

/** Whether games can be read right now (public token, or a connected wallet's indexer). */
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
export const privateStates = new LocalPrivateStateProvider<SalvoPrivateState>();

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
export type Recent = { address: string; at: number };
export const recentGames = () => local.get<Recent[]>("recent") ?? [];
export const rememberGame = (address: string) => {
  const rest = recentGames().filter((x) => x.address !== address);
  local.set("recent", [{ address, at: Date.now() }, ...rest].slice(0, 12));
};

/** This browser's private state for a game, without touching the chain. */
export const loadPrivateState = async (address: string): Promise<SalvoPrivateState | null> => {
  privateStates.setContractAddress(address);
  return privateStates.get(SalvoPrivateStateId);
};

/** Which seat this browser holds in a game: 1, 2, or null. */
export const seatOf = (l: Ledger, ps: SalvoPrivateState | null): 1 | 2 | null => {
  if (!ps) return null;
  const k = toHex(pureCircuits.player_key(ps.secret));
  if (l.phase >= 1 && toHex(l.player1) === k) return 1;
  if (l.phase >= 2 && toHex(l.player2) === k) return 2;
  return null;
};

// ── actions ─────────────────────────────────────────────────────────────────
/** Deploy a game. The fleet is committed by `join` right after, in a second transaction. */
export const createGame = async (p: Providers, moveSeconds: bigint, ships: Placement[]): Promise<string> => {
  const deployed: Deployed = await deployContract(p as never, {
    compiledContract: compiled,
    privateStateId: SalvoPrivateStateId,
    initialPrivateState: newPlayer(toFleet(ships)),
    args: [moveSeconds],
  } as never);
  const address: string = deployed.deployTxData.public.contractAddress;
  rememberGame(address);
  return address;
};

/** Connect to a deployed game, keeping whatever private state this browser holds for it. */
export const openGame = async (p: Providers, address: string, fresh?: SalvoPrivateState): Promise<Deployed> => {
  const existing = await loadPrivateState(address);
  const ps = fresh ?? existing ?? newPlayer();
  return findDeployedContract(p as never, {
    contractAddress: address,
    compiledContract: compiled,
    privateStateId: SalvoPrivateStateId,
    initialPrivateState: ps,
  } as never);
};

/** Take a seat: commit this browser's fleet. Proves the fleet is legal. */
export const takeSeat = async (c: Deployed) => {
  await c.callTx.join();
};

export const fire = async (c: Deployed, shots: [number, number][]) => {
  const s = salvo(shots);
  await c.callTx.play(s.shots, s.count);
};

export const claimTimeout = async (c: Deployed) => c.callTx.claim_timeout();
export const resign = async (c: Deployed) => c.callTx.resign();
export const showFleet = async (c: Deployed) => c.callTx.show_fleet();
