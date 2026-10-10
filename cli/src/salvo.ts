// SPDX-License-Identifier: Apache-2.0
//
// Salvo on a real Midnight network: midnight-js providers, deployment, and one
// function per circuit. Each player name gets its own encrypted LevelDB
// private-state namespace, as on separate devices.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { assertIsContractAddress } from "@midnight-ntwrk/midnight-js-utils";
import { type Network, ZK_CONFIG_PATH, stateDir } from "./config.js";
import { type WalletContext, walletProvider } from "./wallet.js";

// biome-ignore lint/suspicious/noExplicitAny: compact-js's Effect-style builder is not worth re-typing here
const CC = CompiledContract as any;
const compiled = CC.make("salvo", Contract).pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(ZK_CONFIG_PATH));

// ── local record (git-ignored) ──────────────────────────────────────────────
const recordPath = (net: Network) => path.join(stateDir(net), "game.json");
export const loadGameAddress = (net: Network): string | undefined =>
  fs.existsSync(recordPath(net)) ? JSON.parse(fs.readFileSync(recordPath(net), "utf8")).address : undefined;
export const saveGameAddress = (net: Network, address: string) => {
  fs.mkdirSync(stateDir(net), { recursive: true });
  fs.writeFileSync(recordPath(net), JSON.stringify({ address }, null, 2), { mode: 0o600 });
};

const storagePassword = (net: Network): string => {
  if (process.env.SALVO_STORAGE_PASSWORD) return process.env.SALVO_STORAGE_PASSWORD;
  const p = path.join(stateDir(net), "storage-password");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, `Sx-${crypto.randomBytes(24).toString("base64url")}!9a`, { mode: 0o600 });
  }
  return fs.readFileSync(p, "utf8").trim();
};

// ── providers ───────────────────────────────────────────────────────────────
export const providersFor = async (net: Network, ctx: WalletContext, player: string) => {
  const wp = await walletProvider(ctx);
  const zk = new NodeZkConfigProvider(ZK_CONFIG_PATH);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof SalvoPrivateStateId, SalvoPrivateState>({
      midnightDbName: path.join(stateDir(net), "private-state"),
      privateStateStoreName: "salvo-private-state",
      accountId: player,
      privateStoragePasswordProvider: () => storagePassword(net),
    }),
    publicDataProvider: indexerPublicDataProvider(net.indexer, net.indexerWS),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(net.proofServer, zk),
    walletProvider: wp,
    midnightProvider: wp,
  };
};
export type Providers = Awaited<ReturnType<typeof providersFor>>;

// biome-ignore lint/suspicious/noExplicitAny: DeployedContract<C> is generic over the compiled contract
type Deployed = any;
const ps = async (p: Providers) => p.privateStateProvider.get(SalvoPrivateStateId);

/** Scope private state to a game. Must happen before any private-state read. */
export const scopeToGame = (p: Providers, address: string) => {
  assertIsContractAddress(address);
  p.privateStateProvider.setContractAddress(address);
};

// ── actions ─────────────────────────────────────────────────────────────────
export const create = async (net: Network, p: Providers, moveSeconds: bigint, ships: Placement[]) => {
  const deployed: Deployed = await deployContract(p as never, {
    compiledContract: compiled,
    privateStateId: SalvoPrivateStateId,
    initialPrivateState: newPlayer(toFleet(ships)),
    args: [moveSeconds],
  } as never);
  const address: string = deployed.deployTxData.public.contractAddress;
  saveGameAddress(net, address);
  await deployed.callTx.join();
  return address;
};

export const open = async (p: Providers, address: string, fresh?: SalvoPrivateState): Promise<Deployed> => {
  scopeToGame(p, address);
  return findDeployedContract(p as never, {
    contractAddress: address,
    compiledContract: compiled,
    privateStateId: SalvoPrivateStateId,
    initialPrivateState: fresh ?? (await ps(p)) ?? newPlayer(),
  } as never);
};

export const join = async (net: Network, p: Providers, address: string, ships: Placement[]) => {
  const c = await open(p, address, newPlayer(toFleet(ships)));
  await c.callTx.join();
  saveGameAddress(net, address);
};

export const fire = async (c: Deployed, shots: [number, number][]) => {
  const s = salvo(shots);
  await c.callTx.play(s.shots, s.count);
};

export const seat = async (p: Providers, l: Ledger): Promise<1 | 2 | null> => {
  const s = await ps(p);
  if (!s) return null;
  const k = toHex(pureCircuits.player_key(s.secret));
  if (l.phase >= 1 && toHex(l.player1) === k) return 1;
  if (l.phase >= 2 && toHex(l.player2) === k) return 2;
  return null;
};

export const myFleet = async (p: Providers) => (await ps(p))?.fleet ?? null;

export const readLedger = async (p: Providers, address: string): Promise<Ledger> => {
  assertIsContractAddress(address);
  const state = await p.publicDataProvider.queryContractState(address);
  if (!state) throw new Error(`No game at ${address}`);
  return ledger(state.data);
};
