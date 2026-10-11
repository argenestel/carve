// SPDX-License-Identifier: Apache-2.0
import path from "node:path";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

export type NetworkName = "preprod" | "preview" | "undeployed";

export type Network = {
  name: NetworkName;
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
  faucet?: string;
};

const PROOF_SERVER = process.env.CARVE_PROOF_SERVER ?? "http://127.0.0.1:6300";

// Since 2026-10-09 Preprod's public indexer and RPC are run by Blockfrost and
// need a "Midnight Preprod" project token (BLOCKFROST_PROJECT_ID, nightpreprod…).
const blockfrost = (): Omit<Network, "proofServer"> => {
  const t = process.env.BLOCKFROST_PROJECT_ID;
  if (!t) throw new Error("Set BLOCKFROST_PROJECT_ID to your Blockfrost Midnight Preprod project token (https://blockfrost.io).");
  return {
    name: "preprod",
    indexer: `https://midnight-preprod.blockfrost.io/api/v0?project_id=${t}`,
    indexerWS: `wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=${t}`,
    node: `https://rpc.midnight-preprod.blockfrost.io?project_id=${t}`,
    faucet: "https://midnight-tmnight-preprod.nethermind.dev/",
  };
};

const NETWORKS: Record<NetworkName, () => Omit<Network, "proofServer">> = {
  preprod: blockfrost,
  preview: () => ({
    name: "preview",
    indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
    indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
    node: "https://rpc.preview.midnight.network",
  }),
  // midnightntwrk/midnight-local-dev
  undeployed: () => ({
    name: "undeployed",
    indexer: "http://127.0.0.1:8088/api/v3/graphql",
    indexerWS: "ws://127.0.0.1:8088/api/v3/graphql/ws",
    node: "http://127.0.0.1:9944",
  }),
};

export const loadNetwork = (name: string): Network => {
  if (!(name in NETWORKS)) throw new Error(`Unknown network "${name}". Use preprod, preview or undeployed.`);
  setNetworkId(name as NetworkName);
  return { ...NETWORKS[name as NetworkName](), proofServer: PROOF_SERVER };
};

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");

/** Local, git-ignored state: wallet seed and cache, private state DB, book record. */
export const stateDir = (net: Network) => path.join(ROOT, ".carve", net.name);

export const ZK_CONFIG_PATH = path.resolve(ROOT, "..", "contract", "src", "managed", "carve");
