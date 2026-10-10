// SPDX-License-Identifier: Apache-2.0
//
// Bidlock on a real Midnight network: midnight-js providers, deployment, and
// one function per circuit. Each actor (the buyer, each supplier) gets its own
// encrypted LevelDB private-state namespace, as on separate devices.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  BidlockPrivateStateId,
  type BidlockPrivateState,
  Contract,
  DAY,
  type Ledger,
  type Opening,
  awardInput,
  buyerPrivateState,
  fromHex,
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
const compiled = CC.make("bidlock", Contract).pipe(CC.withWitnesses(witnesses), CC.withCompiledFileAssets(ZK_CONFIG_PATH));

// ── local record (git-ignored) ──────────────────────────────────────────────
export type LocalRecord = {
  contractAddress?: string;
  deployTxId?: string;
  /** X25519 keypair openings are sealed to. Only on the buyer's machine. */
  buyerBox?: { publicKey: string; secretKey: string };
};

const recordPath = (net: Network) => path.join(stateDir(net), "deployment.json");
export const loadRecord = (net: Network): LocalRecord =>
  fs.existsSync(recordPath(net)) ? JSON.parse(fs.readFileSync(recordPath(net), "utf8")) : {};
const saveRecord = (net: Network, r: LocalRecord) => {
  fs.mkdirSync(stateDir(net), { recursive: true });
  fs.writeFileSync(recordPath(net), JSON.stringify(r, null, 2), { mode: 0o600 });
};

const storagePassword = (net: Network): string => {
  if (process.env.BIDLOCK_STORAGE_PASSWORD) return process.env.BIDLOCK_STORAGE_PASSWORD;
  const p = path.join(stateDir(net), "storage-password");
  if (!fs.existsSync(p)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, `Bx-${crypto.randomBytes(24).toString("base64url")}!9a`, { mode: 0o600 });
  }
  return fs.readFileSync(p, "utf8").trim();
};

// ── providers ───────────────────────────────────────────────────────────────
export const providersFor = async (net: Network, ctx: WalletContext, actor: string) => {
  const wp = await walletProvider(ctx);
  const zk = new NodeZkConfigProvider(ZK_CONFIG_PATH);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof BidlockPrivateStateId, BidlockPrivateState>({
      midnightDbName: path.join(stateDir(net), "private-state"),
      privateStateStoreName: "bidlock-private-state",
      accountId: actor,
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
const tx = (r: { public: { txId: string; blockHeight: number } }) => ({ txId: r.public.txId, block: r.public.blockHeight });
const ps = async (p: Providers) => p.privateStateProvider.get(BidlockPrivateStateId);
const setPs = async (p: Providers, s: BidlockPrivateState) => p.privateStateProvider.set(BidlockPrivateStateId, s);

// ── buyer ───────────────────────────────────────────────────────────────────
export const deploy = async (net: Network, p: Providers, title: string, ceiling: bigint, bidHours: number, revealHours: number) => {
  const box = newBoxKeys();
  const now = BigInt(Math.floor(Date.now() / 1000));
  const closesAt = now + BigInt(Math.round(bidHours * 3600));
  const deployed: Deployed = await deployContract(p as never, {
    compiledContract: compiled,
    privateStateId: BidlockPrivateStateId,
    initialPrivateState: buyerPrivateState(randomBytes()),
    args: [title, randomBytes(), box.publicKey, ceiling, closesAt, closesAt + BigInt(Math.round(revealHours * 3600))],
  } as never);
  const pub = deployed.deployTxData.public;
  saveRecord(net, { contractAddress: pub.contractAddress, deployTxId: pub.txId, buyerBox: { publicKey: toHex(box.publicKey), secretKey: toHex(box.secretKey) } });
  return { address: pub.contractAddress as string, txId: pub.txId as string, closesAt };
};

/** Scope private state to a tender. Must happen before any private-state read. */
export const scopeToTender = (p: Providers, address: string) => {
  assertIsContractAddress(address);
  p.privateStateProvider.setContractAddress(address);
};

export const join = async (p: Providers, address: string): Promise<Deployed> => {
  scopeToTender(p, address);
  return findDeployedContract(p as never, {
    contractAddress: address,
    compiledContract: compiled,
    privateStateId: BidlockPrivateStateId,
    initialPrivateState: (await ps(p)) ?? supplierPrivateState(new Uint8Array(32)),
  } as never);
};

export const qualify = async (c: Deployed, commitmentHex: string) => tx(await c.callTx.qualify(fromHex(commitmentHex)));

const buyerBox = (net: Network) => {
  const r = loadRecord(net);
  if (!r.buyerBox) throw new Error("No buyer key on this machine (only the deploying buyer has it).");
  return { publicKey: fromHex(r.buyerBox.publicKey), secretKey: fromHex(r.buyerBox.secretKey) };
};

/** Decrypt every sealed opening the buyer has received. */
export const openings = (net: Network, l: Ledger) => {
  const box = buyerBox(net);
  const out = new Map<bigint, { opening: Opening; company: string }>();
  for (const [i, sealed] of l.sealed_openings) {
    const o = openSealed(sealed, box);
    if (o) out.set(i, o);
  }
  return out;
};

/** Award the lowest decrypted bid (or `winner`), proving it in zero knowledge. */
export const award = async (net: Network, p: Providers, l: Ledger, c: Deployed, opts: { winner?: bigint; exclude?: bigint[] } = {}) => {
  const decrypted = new Map([...openings(net, l)].map(([i, o]) => [i, o.opening] as const));
  const counted = new Map([...decrypted].filter(([i]) => !(opts.exclude ?? []).includes(i)));
  const winner = opts.winner ?? lowestBid(counted);
  if (winner === null) throw new Error("No decryptable bids to award.");
  const current = (await ps(p))!;
  await setPs(p, { ...current, award: awardInput(winner, decrypted, opts.exclude ?? []) });
  return { winner, amount: decrypted.get(winner)!.amount, ...tx(await c.callTx.award(winner)) };
};

// ── supplier ────────────────────────────────────────────────────────────────
export const newCredential = async (p: Providers): Promise<string> => {
  const existing = await ps(p);
  if (existing?.supplierSecret) return toHex(pureCircuits.supplier_commitment(existing.supplierSecret));
  const s = supplierPrivateState(randomBytes());
  await setPs(p, s);
  return toHex(pureCircuits.supplier_commitment(s.supplierSecret!));
};

export const bid = async (p: Providers, c: Deployed, amount: bigint) => {
  const s = await ps(p);
  if (!s?.supplierSecret) throw new Error("No supplier credential for this actor. Run `credential` first.");
  await setPs(p, { ...s, pendingBid: { amount, salt: randomBytes() } });
  const r = await c.callTx.submit_bid();
  return { index: r.private.result as bigint, ...tx(r) };
};

export const myBids = async (p: Providers) => Object.entries((await ps(p))?.bids ?? {}).map(([i, o]) => [BigInt(i), o] as const);

export const reveal = async (p: Providers, l: Ledger, c: Deployed, company: string) => {
  const bids = await myBids(p);
  if (bids.length === 0) throw new Error("This actor has no bid on this tender.");
  const [i, o] = bids[0];
  return { index: i, ...tx(await c.callTx.reveal_bid(i, sealOpening(o, company, l.buyer_key))) };
};

export const accept = async (c: Deployed, company: string) => tx(await c.callTx.accept_award(company));

export const dispute = async (p: Providers, c: Deployed) => {
  const [[i]] = await myBids(p);
  return { index: i, ...tx(await c.callTx.dispute(i)) };
};

// ── anyone ──────────────────────────────────────────────────────────────────
export const readLedger = async (p: Providers, address: string): Promise<Ledger> => {
  assertIsContractAddress(address);
  const state = await p.publicDataProvider.queryContractState(address);
  if (!state) throw new Error(`No contract at ${address}`);
  return ledger(state.data);
};

export { DAY };
