// SPDX-License-Identifier: Apache-2.0
//
// In-process simulator: runs the compiled Carve circuits against an in-memory
// ledger with a controllable block clock. No proof server or network. Used by
// the tests.

import {
  type ChargedState,
  type CircuitContext,
  type EncodedZswapLocalState,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, type Grant, type Ledger, ledger } from "./managed/carve/contract/index.js";
import { type CarvePrivateState, makeWitnesses, newHolder, newLicensor, randomBytes } from "./witnesses.js";

export const DAY = 86_400n;
export const YEAR = 365n * DAY;

const COIN_PK = "0".repeat(64);

export class CarveSimulator {
  /** Block time, seconds since the Unix epoch. */
  now: bigint;
  /** What the next proof claims the time is. Defaults to the block time. */
  claimedTime: bigint | null = null;

  readonly contract = new Contract<CarvePrivateState>(makeWitnesses(() => this.claimedTime ?? this.now));
  readonly address = sampleContractAddress();
  /** The contract state right after deployment, and its ledger. */
  readonly deployContractState: ChargedState;
  readonly deployState: Ledger;
  private state: ChargedState;
  private zswap: EncodedZswapLocalState;
  private readonly users = new Map<string, CarvePrivateState>();

  /** Deploy a book for `title`, opened by `licensor`. */
  constructor(opts: { now: bigint; title?: string; licensor?: string }) {
    this.now = opts.now;
    const who = opts.licensor ?? "licensor";
    const init = this.contract.initialState(createConstructorContext(newLicensor(), COIN_PK), opts.title ?? "Mochi the Cat");
    this.state = init.currentContractState.data;
    this.zswap = init.currentZswapLocalState;
    this.users.set(who, init.currentPrivateState);
    this.deployContractState = this.state;
    this.deployState = ledger(this.state);
  }

  addUser(name: string, secret: Uint8Array = randomBytes()) {
    this.users.set(name, newHolder(secret));
  }
  setPrivateState(name: string, ps: CarvePrivateState) {
    this.users.set(name, ps);
  }
  privateState(name: string): CarvePrivateState {
    const ps = this.users.get(name);
    if (!ps) throw new Error(`Unknown user ${name}`);
    return ps;
  }
  /** Hand a grant to its licensee, as the licensor would with a license code. */
  give(name: string, id: number, g: Grant) {
    const ps = this.privateState(name);
    this.users.set(name, { ...ps, held: { ...ps.held, [id]: g } });
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

  private run(who: string, call: (c: CircuitContext<CarvePrivateState>) => { context: CircuitContext<CarvePrivateState> }) {
    const ctx = createCircuitContext(this.address, this.zswap, this.state, this.privateState(who), undefined, undefined, Number(this.now));
    const { context } = call(ctx);
    this.state = context.currentQueryContext.state;
    this.zswap = context.currentZswapLocalState;
    this.users.set(who, context.currentPrivateState);
  }

  /** Issue a grant; returns its number. */
  issue(who: string, g: Grant): number {
    const id = Number(this.getLedger().issued);
    this.run(who, (c) => this.contract.impureCircuits.issue(c, g));
    return id;
  }
  accept(who: string, id: number) {
    this.run(who, (c) => this.contract.impureCircuits.accept(c, BigInt(id)));
  }
  proveRights(who: string, id: number, region: number, category: number, check: Uint8Array) {
    this.run(who, (c) => this.contract.impureCircuits.prove_rights(c, BigInt(id), BigInt(region), BigInt(category), check));
  }
}
