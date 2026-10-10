// SPDX-License-Identifier: Apache-2.0
//
// In-process simulator: runs the compiled Bidlock circuits against an
// in-memory ledger with a controllable block clock. No proof server or
// network. Used by the tests and the frontend's demo mode.

import {
  type ChargedState,
  type CircuitContext,
  type EncodedZswapLocalState,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, type Ledger, type Opening, ledger, pureCircuits } from "./managed/bidlock/contract/index.js";
import {
  type AwardInput,
  type BidlockPrivateState,
  MAX_BIDS,
  buyerPrivateState,
  emptyOpening,
  emptyPrivateState,
  randomBytes,
  supplierPrivateState,
  witnesses,
} from "./witnesses.js";

export const HOUR = 3_600n;
export const DAY = 86_400n;

export type TenderTerms = {
  title: string;
  tenderId: Uint8Array;
  buyerKey: Uint8Array;
  ceiling: bigint;
  closesAt: bigint;
  revealUntil: bigint;
};

const COIN_PK = "0".repeat(64);

export class BidlockSimulator {
  readonly contract = new Contract<BidlockPrivateState>(witnesses);
  readonly address = sampleContractAddress();
  readonly terms: TenderTerms;
  /** Block time, seconds since the Unix epoch. */
  now: bigint;

  private state: ChargedState;
  private zswap: EncodedZswapLocalState;
  private readonly actors = new Map<string, BidlockPrivateState>();

  constructor(terms: TenderTerms, opts: { buyerSecret?: Uint8Array; now: bigint }) {
    this.terms = terms;
    this.now = opts.now;
    const init = this.contract.initialState(
      createConstructorContext(buyerPrivateState(opts.buyerSecret ?? randomBytes()), COIN_PK),
      terms.title,
      terms.tenderId,
      terms.buyerKey,
      terms.ceiling,
      terms.closesAt,
      terms.revealUntil,
    );
    this.state = init.currentContractState.data;
    this.zswap = init.currentZswapLocalState;
    this.actors.set("buyer", init.currentPrivateState);
  }

  // ── actors ────────────────────────────────────────────────────────────────
  addSupplier(name: string, secret: Uint8Array = randomBytes()): Uint8Array {
    this.actors.set(name, supplierPrivateState(secret));
    return pureCircuits.supplier_commitment(secret);
  }
  addObserver(name: string) {
    this.actors.set(name, emptyPrivateState());
  }
  setActor(name: string, ps: BidlockPrivateState) {
    this.actors.set(name, ps);
  }
  privateState(name: string): BidlockPrivateState {
    const ps = this.actors.get(name);
    if (!ps) throw new Error(`Unknown actor ${name}`);
    return ps;
  }
  get contractState(): ChargedState {
    return this.state;
  }
  getLedger(): Ledger {
    return ledger(this.state);
  }
  advance(seconds: bigint) {
    this.now += seconds;
  }

  private run<T>(actor: string, call: (c: CircuitContext<BidlockPrivateState>) => { result: T; context: CircuitContext<BidlockPrivateState> }): T {
    const ctx = createCircuitContext(this.address, this.zswap, this.state, this.privateState(actor), undefined, undefined, Number(this.now));
    const { result, context } = call(ctx);
    this.state = context.currentQueryContext.state;
    this.zswap = context.currentZswapLocalState;
    this.actors.set(actor, context.currentPrivateState);
    return result;
  }

  // ── circuits ──────────────────────────────────────────────────────────────
  qualify(commitment: Uint8Array, actor = "buyer") {
    this.run(actor, (c) => this.contract.impureCircuits.qualify(c, commitment));
  }

  bid(actor: string, amount: bigint, salt: Uint8Array = randomBytes()): bigint {
    this.setActor(actor, { ...this.privateState(actor), pendingBid: { amount, salt } });
    return this.run(actor, (c) => this.contract.impureCircuits.submit_bid(c));
  }

  reveal(actor: string, index: bigint, sealed: string) {
    this.run(actor, (c) => this.contract.impureCircuits.reveal_bid(c, index, sealed));
  }

  /** Buyer awards from a map of bid index → opening it was able to decrypt. */
  award(winner: bigint, openings: Map<bigint, Opening>, opts: { exclude?: bigint[]; actor?: string; winnerOpening?: Opening } = {}) {
    const input = awardInput(winner, openings, opts.exclude ?? [], opts.winnerOpening);
    const actor = opts.actor ?? "buyer";
    this.setActor(actor, { ...this.privateState(actor), award: input });
    this.run(actor, (c) => this.contract.impureCircuits.award(c, winner));
  }

  accept(actor: string, name: string) {
    this.run(actor, (c) => this.contract.impureCircuits.accept_award(c, name));
  }

  dispute(actor: string, index: bigint) {
    this.run(actor, (c) => this.contract.impureCircuits.dispute(c, index));
  }
}

/** Build the award witnesses: every decrypted opening counts unless excluded. */
export const awardInput = (winner: bigint, openings: Map<bigint, Opening>, exclude: bigint[] = [], winnerOpening?: Opening): AwardInput => {
  const ops: Opening[] = [];
  const inc: boolean[] = [];
  for (let i = 0n; i < BigInt(MAX_BIDS); i++) {
    const o = openings.get(i);
    ops.push(o ?? emptyOpening());
    inc.push(o !== undefined && !exclude.includes(i));
  }
  return { openings: ops, included: inc, winner: winnerOpening ?? openings.get(winner) ?? emptyOpening() };
};

/** The lowest decrypted bid, ties to the earliest bid. */
export const lowestBid = (openings: Map<bigint, Opening>): bigint | null => {
  let best: bigint | null = null;
  for (const [i, o] of openings) if (best === null || o.amount < openings.get(best)!.amount) best = i;
  return best;
};
