// SPDX-License-Identifier: Apache-2.0
//
// Carve on a real Midnight network: midnight-js providers, deployment, and one
// function per circuit. Each user name gets its own identity and encrypted
// LevelDB private-state namespace, as on separate devices.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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
  toHex,
  witnesses,
} from "@carve/contract";
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
const compiled = CC.make("carve", Contract).pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(ZK_CONFIG_PATH));

// ── local records (git-ignored) ─────────────────────────────────────────────
const recordPath = (net: Network) => path.join(stateDir(net), "book.json");
export const loadBookAddress = (net: Network): string | undefined =>
  fs.existsSync(recordPath(net)) ? JSON.parse(fs.readFileSync(recordPath(net), "utf8")).address : undefined;
export const saveBookAddress = (net: Network, address: string) => {
  fs.mkdirSync(stateDir(net), { recursive: true });
  fs.writeFileSync(recordPath(net), JSON.stringify({ address }, null, 2), { mode: 0o600 });
};

/** A user's identity secret, created on first use. */
export const identity = (net: Network, user: string): Uint8Array => {
  const p = path.join(stateDir(net), "identities", `${user}.hex`);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return fromHex(fs.readFileSync(p, "utf8").trim());
};
export const licenseeId = (net: Network, user: string) => toHex(pureCircuits.licensee_key(identity(net, user)));

const storagePassword = (net: Network): string => {
  if (process.env.CARVE_STORAGE_PASSWORD) return process.env.CARVE_STORAGE_PASSWORD;
  const p = path.join(stateDir(net), "storage-password");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, `Cv-${crypto.randomBytes(24).toString("base64url")}!9a`, { mode: 0o600 });
  }
  return fs.readFileSync(p, "utf8").trim();
};

// ── providers ───────────────────────────────────────────────────────────────
export const providersFor = async (net: Network, ctx: WalletContext, user: string) => {
  const wp = await walletProvider(ctx);
  const zk = new NodeZkConfigProvider(ZK_CONFIG_PATH);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof CarvePrivateStateId, CarvePrivateState>({
      midnightDbName: path.join(stateDir(net), "private-state"),
      privateStateStoreName: "carve-private-state",
      accountId: user,
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
export const privateState = async (p: Providers) => p.privateStateProvider.get(CarvePrivateStateId);

/** Scope private state to a book. Must happen before any private-state read. */
export const scopeToBook = (p: Providers, address: string) => {
  assertIsContractAddress(address);
  p.privateStateProvider.setContractAddress(address);
};

// ── actions ─────────────────────────────────────────────────────────────────
export const create = async (net: Network, p: Providers, user: string, title: string) => {
  const deployed: Deployed = await deployContract(p as never, {
    compiledContract: compiled,
    privateStateId: CarvePrivateStateId,
    initialPrivateState: newLicensor(identity(net, user)),
    args: [title],
  } as never);
  const address: string = deployed.deployTxData.public.contractAddress;
  saveBookAddress(net, address);
  return address;
};

export const open = async (net: Network, p: Providers, user: string, address: string, ps?: CarvePrivateState): Promise<Deployed> => {
  scopeToBook(p, address);
  return findDeployedContract(p as never, {
    contractAddress: address,
    compiledContract: compiled,
    privateStateId: CarvePrivateStateId,
    initialPrivateState: ps ?? (await privateState(p)) ?? newHolder(identity(net, user)),
  } as never);
};

export const issue = async (c: Deployed, g: Grant) => c.callTx.issue(g);

/** Keep the license's grant in this user's private state, then accept it. */
export const accept = async (net: Network, p: Providers, user: string, lic: License) => {
  scopeToBook(p, lic.address);
  const ps = (await privateState(p)) ?? newHolder(identity(net, user));
  const c = await open(net, p, user, lic.address, { ...ps, held: { ...ps.held, [lic.id]: lic.grant } });
  await c.callTx.accept(BigInt(lic.id));
};

export const proveRights = async (c: Deployed, id: number, region: number, category: number, check: Uint8Array) =>
  c.callTx.prove_rights(BigInt(id), BigInt(region), BigInt(category), check);

export const readLedger = async (p: Providers, address: string): Promise<Ledger> => {
  assertIsContractAddress(address);
  const state = await p.publicDataProvider.queryContractState(address);
  if (!state) throw new Error(`No book at ${address}`);
  return ledger(state.data);
};

export const readDeployLedger = async (p: Providers, address: string): Promise<Ledger | null> => {
  const state = await p.publicDataProvider.queryDeployContractState(address);
  return state ? ledger(state.data) : null;
};
