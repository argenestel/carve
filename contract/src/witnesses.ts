// SPDX-License-Identifier: Apache-2.0
//
// Private state for Salvo. The player's secret and fleet stay on their
// device; circuits receive them as private ZK inputs and disclose only hashes
// and hit/miss answers.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Fleet, Ledger, Ship } from "./managed/salvo/contract/index.js";

export const SalvoPrivateStateId = "salvoPrivateState" as const;

export const BOARD = 8;
export const SHIP_LENGTHS = [4, 3, 3, 2] as const;
export const FLEET_CELLS = 12;
export const SALVO = 3;

export type SalvoPrivateState = {
  readonly secret: Uint8Array;
  readonly fleet: Fleet | null;
};

export const randomBytes = (n = 32): Uint8Array => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const newPlayer = (fleet: Fleet | null = null, secret: Uint8Array = randomBytes()): SalvoPrivateState => ({ secret, fleet });

/** The time a move claims. A little behind the wall clock, as block times lag. */
export const realClock = (): bigint => BigInt(Math.floor(Date.now() / 1000) - 120);

type Ctx = WitnessContext<Ledger, SalvoPrivateState>;
type R<T> = [SalvoPrivateState, T];

export const makeWitnesses = (clock: () => bigint = realClock) => ({
  player_secret: ({ privateState: ps }: Ctx): R<Uint8Array> => [ps, ps.secret],
  my_fleet: ({ privateState: ps }: Ctx): R<Fleet> => {
    if (!ps.fleet) throw new Error("Your fleet is not on this device");
    return [ps, ps.fleet];
  },
  current_time: ({ privateState: ps }: Ctx): R<bigint> => [ps, clock()],
});

export const witnesses = makeWitnesses();

// ── Fleet helpers (mirror the circuit's geometry) ───────────────────────────
export type Placement = { x: number; y: number; vertical: boolean };

export const shipCells = (p: Placement, len: number): [number, number][] =>
  Array.from({ length: len }, (_, k) => (p.vertical ? [p.x, p.y + k] : [p.x + k, p.y]));

/** Why a fleet is illegal, or null if it is legal. */
export const fleetProblem = (ships: Placement[]): string | null => {
  const taken = new Set<number>();
  for (const [i, p] of ships.entries()) {
    for (const [x, y] of shipCells(p, SHIP_LENGTHS[i])) {
      if (x < 0 || y < 0 || x >= BOARD || y >= BOARD) return "A ship is outside the sea";
      if (taken.has(y * BOARD + x)) return "Ships overlap";
      taken.add(y * BOARD + x);
    }
  }
  return null;
};

export const toFleet = (ships: Placement[], salt: Uint8Array = randomBytes()): Fleet => ({
  ships: ships.map((p): Ship => ({ x: BigInt(p.x), y: BigInt(p.y), vertical: p.vertical })),
  salt,
});

export const fromShips = (ships: Ship[]): Placement[] => ships.map((s) => ({ x: Number(s.x), y: Number(s.y), vertical: s.vertical }));

export const randomPlacement = (): Placement[] => {
  const rnd = (n: number) => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % n;
  for (;;) {
    const ships: Placement[] = [];
    for (const len of SHIP_LENGTHS) {
      for (let tries = 0; tries < 50; tries++) {
        const vertical = rnd(2) === 1;
        const p = { x: rnd(vertical ? BOARD : BOARD - len + 1), y: rnd(vertical ? BOARD - len + 1 : BOARD), vertical };
        if (!fleetProblem([...ships, p])) {
          ships.push(p);
          break;
        }
      }
    }
    if (ships.length === SHIP_LENGTHS.length) return ships;
  }
};

export const isHitAt = (ships: Placement[], x: number, y: number) =>
  ships.some((p, i) => shipCells(p, SHIP_LENGTHS[i]).some(([cx, cy]) => cx === x && cy === y));

// ── Hex ─────────────────────────────────────────────────────────────────────
export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => Number.parseInt(x, 16));
