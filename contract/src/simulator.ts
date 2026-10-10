// SPDX-License-Identifier: Apache-2.0
//
// In-process simulator: runs the compiled Salvo circuits against an in-memory
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
import { Contract, type Ledger, type Shot, ledger } from "./managed/salvo/contract/index.js";
import { type Placement, type SalvoPrivateState, makeWitnesses, newPlayer, randomBytes, toFleet } from "./witnesses.js";

export const MINUTE = 60n;
export const HOUR = 3_600n;

const COIN_PK = "0".repeat(64);

/** Pad a salvo to the circuit's three slots. */
export const salvo = (shots: [number, number][]): { shots: Shot[]; count: bigint } => {
  const v = shots.map(([x, y]) => ({ x: BigInt(x), y: BigInt(y) }));
  while (v.length < 3) v.push({ x: 0n, y: 0n });
  return { shots: v, count: BigInt(shots.length) };
};

export class SalvoSimulator {
  /** Block time, seconds since the Unix epoch. */
  now: bigint;
  /** What the next move claims the time is. Defaults to the block time. */
  claimedTime: bigint | null = null;

  readonly contract = new Contract<SalvoPrivateState>(makeWitnesses(() => this.claimedTime ?? this.now));
  readonly address = sampleContractAddress();
  private state: ChargedState;
  private zswap: EncodedZswapLocalState;
  private readonly players = new Map<string, SalvoPrivateState>();

  constructor(opts: { now: bigint; moveTime?: bigint }) {
    this.now = opts.now;
    const init = this.contract.initialState(createConstructorContext(newPlayer(), COIN_PK), opts.moveTime ?? HOUR);
    this.state = init.currentContractState.data;
    this.zswap = init.currentZswapLocalState;
  }

  addPlayer(name: string, ships: Placement[] | null, secret: Uint8Array = randomBytes()) {
    this.players.set(name, newPlayer(ships ? toFleet(ships) : null, secret));
  }
  setPrivateState(name: string, ps: SalvoPrivateState) {
    this.players.set(name, ps);
  }
  privateState(name: string): SalvoPrivateState {
    const ps = this.players.get(name);
    if (!ps) throw new Error(`Unknown player ${name}`);
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

  private run(who: string, call: (c: CircuitContext<SalvoPrivateState>) => { context: CircuitContext<SalvoPrivateState> }) {
    const ctx = createCircuitContext(this.address, this.zswap, this.state, this.privateState(who), undefined, undefined, Number(this.now));
    const { context } = call(ctx);
    this.state = context.currentQueryContext.state;
    this.zswap = context.currentZswapLocalState;
    this.players.set(who, context.currentPrivateState);
  }

  join(who: string) {
    this.run(who, (c) => this.contract.impureCircuits.join(c));
  }
  play(who: string, shots: [number, number][]) {
    const s = salvo(shots);
    this.run(who, (c) => this.contract.impureCircuits.play(c, s.shots, s.count));
  }
  claimTimeout(who: string) {
    this.run(who, (c) => this.contract.impureCircuits.claim_timeout(c));
  }
  resign(who: string) {
    this.run(who, (c) => this.contract.impureCircuits.resign(c));
  }
  showFleet(who: string) {
    this.run(who, (c) => this.contract.impureCircuits.show_fleet(c));
  }
}
