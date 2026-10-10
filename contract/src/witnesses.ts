// SPDX-License-Identifier: Apache-2.0
//
// Private state for Bidlock. Everything here stays on the user's device; the
// circuits receive it as private ZK inputs and disclose only hashes, plus the
// winning price at award time.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger, Opening } from "./managed/bidlock/contract/index.js";

export const BidlockPrivateStateId = "bidlockPrivateState" as const;
export const MAX_BIDS = 8;

export type AwardInput = {
  /** Openings by bid index (length MAX_BIDS; unused slots are ignored). */
  openings: Opening[];
  /** Which bids the buyer counts. A revealed bid left out can be disputed. */
  included: boolean[];
  winner: Opening;
};

export type BidlockPrivateState = {
  readonly buyerSecret: Uint8Array | null;
  readonly supplierSecret: Uint8Array | null;
  /** The bid about to be placed (amount + salt). */
  readonly pendingBid: Opening | null;
  /** Bid index (decimal string) → opening, for bids this device placed. */
  readonly bids: Readonly<Record<string, Opening>>;
  /** Set by the buyer right before calling `award`. */
  readonly award: AwardInput | null;
};

export const randomBytes = (n = 32): Uint8Array => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const emptyPrivateState = (): BidlockPrivateState => ({
  buyerSecret: null,
  supplierSecret: null,
  pendingBid: null,
  bids: {},
  award: null,
});

export const buyerPrivateState = (secret: Uint8Array = randomBytes()): BidlockPrivateState => ({
  ...emptyPrivateState(),
  buyerSecret: secret,
});

export const supplierPrivateState = (secret: Uint8Array = randomBytes()): BidlockPrivateState => ({
  ...emptyPrivateState(),
  supplierSecret: secret,
});

export const emptyOpening = (): Opening => ({ amount: 0n, salt: new Uint8Array(32) });

type Ctx = WitnessContext<Ledger, BidlockPrivateState>;
type R<T> = [BidlockPrivateState, T];

const need = <T>(v: T | null | undefined, what: string): T => {
  if (v === null || v === undefined) throw new Error(`${what} is not available on this device`);
  return v;
};

export const witnesses = {
  buyer_secret: ({ privateState: ps }: Ctx): R<Uint8Array> => [ps, need(ps.buyerSecret, "Buyer key")],

  supplier_secret: ({ privateState: ps }: Ctx): R<Uint8Array> => [ps, need(ps.supplierSecret, "Supplier credential")],

  supplier_path: ({ privateState: ps, ledger }: Ctx, leaf: Uint8Array) => {
    const path = ledger.suppliers.findPathForLeaf(leaf);
    if (!path) throw new Error("This supplier is not qualified for the tender");
    return [ps, path] as R<typeof path>;
  },

  new_bid: ({ privateState: ps }: Ctx): R<Opening> => [ps, need(ps.pendingBid, "Bid amount")],

  remember_bid: ({ privateState: ps }: Ctx, index: bigint, bid: Opening): R<[]> => [
    { ...ps, pendingBid: null, bids: { ...ps.bids, [index.toString()]: bid } },
    [],
  ],

  my_bid: ({ privateState: ps }: Ctx, index: bigint): R<Opening> => [ps, need(ps.bids[index.toString()], `Bid #${index}`)],

  award_openings: ({ privateState: ps }: Ctx): R<Opening[]> => [ps, need(ps.award, "Award input").openings],
  award_included: ({ privateState: ps }: Ctx): R<boolean[]> => [ps, need(ps.award, "Award input").included],
  award_winner: ({ privateState: ps }: Ctx): R<Opening> => [ps, need(ps.award, "Award input").winner],
};
