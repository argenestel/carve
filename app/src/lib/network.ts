// SPDX-License-Identifier: Apache-2.0
//
// Midnight Preprod. Since 2026-10-09 the public indexer and node RPC are run by
// Blockfrost and need a "Midnight Preprod" project token (nightpreprod…).
// With VITE_BLOCKFROST_PROJECT_ID set, anyone can view tenders without a
// wallet. Without it, the app reads through the indexer configured in Lace.

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";

export const NETWORK_ID = "preprod" as const;

const token = import.meta.env.VITE_BLOCKFROST_PROJECT_ID as string | undefined;

export const PUBLIC_INDEXER = token
  ? {
      http: `https://midnight-preprod.blockfrost.io/api/v0?project_id=${token}`,
      ws: `wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=${token}`,
    }
  : null;

export const FAUCET = "https://midnight-tmnight-preprod.nethermind.dev/";

setNetworkId(NETWORK_ID);
