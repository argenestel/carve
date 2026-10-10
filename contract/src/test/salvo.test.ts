// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import { Phase, pureCircuits } from "../managed/salvo/contract/index.js";
import { HOUR, MINUTE, SalvoSimulator } from "../simulator.js";
import { type Placement, fleetProblem, isHitAt, randomPlacement, shipCells, toFleet, SHIP_LENGTHS } from "../witnesses.js";

const T0 = 1_800_000_000n;

// Player 1: four rows along the top-left.   Player 2: four columns on the right.
const FLEET1: Placement[] = [
  { x: 0, y: 0, vertical: false }, // 4: (0..3, 0)
  { x: 0, y: 2, vertical: false }, // 3: (0..2, 2)
  { x: 0, y: 4, vertical: false }, // 3: (0..2, 4)
  { x: 0, y: 6, vertical: false }, // 2: (0..1, 6)
];
const FLEET2: Placement[] = [
  { x: 7, y: 0, vertical: true }, // 4: (7, 0..3)
  { x: 5, y: 0, vertical: true }, // 3: (5, 0..2)
  { x: 5, y: 4, vertical: true }, // 3: (5, 4..6)
  { x: 3, y: 6, vertical: true }, // 2: (3, 6..7)
];
const cellsOf = (f: Placement[]) => f.flatMap((p, i) => shipCells(p, SHIP_LENGTHS[i]));

let sim: SalvoSimulator;
const start = (opts: { moveTime?: bigint } = {}) => {
  sim = new SalvoSimulator({ now: T0, ...opts });
  sim.addPlayer("ana", FLEET1);
  sim.addPlayer("ben", FLEET2);
  sim.addPlayer("eve", randomPlacement());
  sim.join("ana");
  sim.join("ben");
};
const misses1 = (n: number) => Array.from({ length: n }, (_, i) => [4 + (i % 3), 7 - Math.floor(i / 3)] as [number, number]); // empty on FLEET1? checked below

beforeEach(() => start());

describe("fleets", () => {
  it("accepts legal fleets and rejects ones out of bounds or overlapping", () => {
    expect(fleetProblem(FLEET1)).toBeNull();
    expect(pureCircuits.is_legal(toFleet(FLEET1))).toBe(true);
    expect(pureCircuits.is_legal(toFleet(FLEET2))).toBe(true);
    const outside = [{ x: 5, y: 0, vertical: false }, ...FLEET1.slice(1)];
    expect(pureCircuits.is_legal(toFleet(outside))).toBe(false);
    const overlapping = [FLEET1[0], { x: 1, y: 0, vertical: true }, ...FLEET1.slice(2)];
    expect(pureCircuits.is_legal(toFleet(overlapping))).toBe(false);
  });

  it("agrees with the TypeScript rules on random fleets", () => {
    for (let i = 0; i < 40; i++) {
      const f = randomPlacement();
      expect(fleetProblem(f)).toBeNull();
      expect(pureCircuits.is_legal(toFleet(f))).toBe(true);
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) expect(pureCircuits.is_hit(toFleet(f), BigInt(x), BigInt(y))).toBe(isHitAt(f, x, y));
    }
  });

  it("refuses to join with an illegal fleet", () => {
    const s = new SalvoSimulator({ now: T0 });
    s.addPlayer("cheat", [FLEET1[0], FLEET1[0], FLEET1[0], FLEET1[0]]);
    expect(() => s.join("cheat")).toThrow("must not overlap");
  });

  it("commits fleets as hashes only", () => {
    const l = sim.getLedger();
    expect(l.fleet1).toEqual(pureCircuits.fleet_commitment(sim.privateState("ana").fleet!));
    expect(l.fleet1).not.toEqual(l.fleet2);
    expect(l.is_shown1).toBe(false);
  });
});

describe("joining", () => {
  it("starts the game when the second player joins", () => {
    const l = sim.getLedger();
    expect(l.phase).toBe(Phase.playing);
    expect(l.turn).toBe(1n);
    expect(l.player1).toEqual(pureCircuits.player_key(sim.privateState("ana").secret));
    expect(l.deadline).toBe(T0 + HOUR);
  });

  it("waits for a second player", () => {
    const s = new SalvoSimulator({ now: T0 });
    s.addPlayer("ana", FLEET1);
    s.join("ana");
    expect(s.getLedger().phase).toBe(Phase.open);
    expect(() => s.play("ana", [[0, 0]])).toThrow("not in progress");
  });

  it("rejects a third player", () => {
    expect(() => sim.join("eve")).toThrow("already has two players");
  });

  it("rejects a move time under a minute", () => {
    expect(() => new SalvoSimulator({ now: T0, moveTime: 30n })).toThrow("at least a minute");
  });
});

describe("playing", () => {
  it("answers each salvo with proven hits and misses", () => {
    sim.play("ana", [[7, 0], [6, 0], [5, 1]]); // hit, miss, hit on FLEET2
    expect(sim.getLedger().turn).toBe(2n);
    sim.play("ben", [[0, 0], [7, 7]]); // ben answers ana's salvo, fires 2
    const l = sim.getLedger();
    expect(l.shots_at2.lookup(pureCircuits.cell(7n, 0n))).toBe(true);
    expect(l.shots_at2.lookup(pureCircuits.cell(6n, 0n))).toBe(false);
    expect(l.shots_at2.lookup(pureCircuits.cell(5n, 1n))).toBe(true);
    expect(l.hits_on2).toBe(2n);
    expect(l.incoming_count).toBe(2n);
    sim.play("ana", [[7, 1]]);
    const m = sim.getLedger();
    expect(m.shots_at1.lookup(0n)).toBe(true);
    expect(m.shots_at1.lookup(pureCircuits.cell(7n, 7n))).toBe(false);
    expect(m.hits_on1).toBe(1n);
    expect(m.moves).toBe(3n);
  });

  it("can't be played out of turn or by an outsider", () => {
    expect(() => sim.play("ben", [[0, 0]])).toThrow("not your turn");
    expect(() => sim.play("eve", [[0, 0]])).toThrow("not your turn");
  });

  it("can't answer with a different fleet", () => {
    sim.play("ana", [[7, 0]]);
    // Ben swaps to a fleet with nothing at (7, 0) to dodge the hit.
    const ps = sim.privateState("ben");
    sim.setPrivateState("ben", { ...ps, fleet: toFleet(FLEET1, ps.fleet!.salt) });
    expect(() => sim.play("ben", [[0, 0]])).toThrow("not the fleet you committed to");
  });

  it("rejects bad salvos", () => {
    expect(() => sim.play("ana", [])).toThrow("one to three");
    expect(() => sim.play("ana", [[8, 0]])).toThrow("outside the sea");
    expect(() => sim.play("ana", [[1, 1], [1, 1]])).toThrow("same cell twice");
    sim.play("ana", [[1, 1]]);
    sim.play("ben", [[1, 1]]);
    expect(() => sim.play("ana", [[1, 1]])).toThrow("already fired");
  });

  it("ends when a fleet is sunk", () => {
    const targets = cellsOf(FLEET2);
    const safe = misses1(12).filter(([x, y]) => !isHitAt(FLEET1, x, y));
    for (let r = 0; r < 4; r++) {
      sim.play("ana", targets.slice(r * 3, r * 3 + 3));
      expect(sim.getLedger().phase).toBe(Phase.playing);
      sim.play("ben", safe.slice(r * 3, r * 3 + 3));
    }
    const l = sim.getLedger();
    expect(l.hits_on2).toBe(12n);
    expect(l.phase).toBe(Phase.over);
    expect(l.winner).toBe(1n);
    expect(l.hits_on1).toBe(0n);
    expect(() => sim.play("ana", [[7, 7]])).toThrow("not in progress");
  });
});

describe("clock", () => {
  it("lets the waiting player claim after the deadline", () => {
    sim.play("ana", [[0, 0]]);
    sim.advance(HOUR - MINUTE);
    expect(() => sim.claimTimeout("ana")).toThrow("still has time");
    sim.advance(MINUTE);
    expect(() => sim.claimTimeout("ben")).toThrow("Only the waiting player");
    sim.claimTimeout("ana");
    const l = sim.getLedger();
    expect(l.winner).toBe(1n);
    expect(l.by_timeout).toBe(true);
  });

  it("restarts the clock on every move", () => {
    sim.advance(50n * MINUTE);
    sim.play("ana", [[0, 0]]);
    expect(sim.getLedger().deadline).toBe(T0 + 50n * MINUTE + HOUR);
  });

  it("rejects a move that backdates its clock", () => {
    sim.claimedTime = T0 - HOUR;
    expect(() => sim.play("ana", [[0, 0]])).toThrow("behind the chain");
    sim.claimedTime = T0 + MINUTE;
    expect(() => sim.play("ana", [[0, 0]])).toThrow("ahead of the chain");
  });
});

describe("after the game", () => {
  it("resigning hands the win to the opponent", () => {
    sim.resign("ana");
    expect(sim.getLedger().winner).toBe(2n);
    expect(() => sim.resign("eve")).toThrow("not in progress");
  });

  it("outsiders can't resign", () => {
    expect(() => sim.resign("eve")).toThrow("not playing");
  });

  it("fleets can be shown once it's over, checked against the commitment", () => {
    expect(() => sim.showFleet("ana")).toThrow("stay hidden");
    sim.resign("ben");
    sim.showFleet("ben");
    const l = sim.getLedger();
    expect(l.is_shown2).toBe(true);
    expect(l.shown2.map((s) => [Number(s.x), Number(s.y), s.vertical])).toEqual(FLEET2.map((p) => [p.x, p.y, p.vertical]));
    const ps = sim.privateState("ana");
    sim.setPrivateState("ana", { ...ps, fleet: toFleet(FLEET2, ps.fleet!.salt) });
    expect(() => sim.showFleet("ana")).toThrow("not the fleet you committed to");
  });
});
