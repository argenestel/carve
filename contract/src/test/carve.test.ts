// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";
import { type Grant, pureCircuits } from "../managed/carve/contract/index.js";
import { type GrantInput, clashes, conflicts, decodeLicense, encodeLicense, grantProblem, makeGrant, startedClean, termsHash } from "../rights.js";
import { CarveSimulator, DAY, YEAR } from "../simulator.js";
import { emptyGrant, randomBytes } from "../witnesses.js";

const T0 = 1_800_000_000n; // Jan 2027

// Regions: 0 North America … 5 South Asia, 6 East Asia. Categories: 0 Apparel, 1 Toys, 2 Food & drink.
const SOUTH_ASIA = 5;
const EAST_ASIA = 6;
const UK = 2;
const APPAREL = 0;
const TOYS = 1;
const FOOD = 2;

let sim: CarveSimulator;
const key = (who: string) => pureCircuits.licensee_key(sim.privateState(who).secret);
const grant = (who: string, g: Partial<GrantInput> = {}): Grant =>
  makeGrant({ regions: [SOUTH_ASIA], categories: [FOOD], start: T0, end: T0 + YEAR, exclusive: true, licensee: key(who), ...g });

/** Issue a grant and hand it to its licensee. */
const sell = (who: string, g: Partial<GrantInput> = {}) => {
  const gr = grant(who, g);
  const id = sim.issue("agency", gr);
  sim.give(who, id, gr);
  return id;
};

beforeEach(() => {
  sim = new CarveSimulator({ now: T0, licensor: "agency" });
  sim.addUser("ana");
  sim.addUser("ben");
  sim.addUser("eve");
});

describe("opening a book", () => {
  it("starts clean, with only the title and two keys public", () => {
    const l = sim.getLedger();
    expect(startedClean(sim.deployState)).toBe(true);
    expect(l.title).toBe("Mochi the Cat");
    expect(l.issued).toBe(0n);
    expect(l.licensor).toEqual(pureCircuits.licensor_key(sim.privateState("agency").secret));
    expect(l.book).toEqual(pureCircuits.book_commitment(sim.privateState("agency").book!));
  });

  it("is no longer a clean start once grants exist", () => {
    sell("ana");
    expect(startedClean(sim.getLedger())).toBe(false);
  });
});

describe("issuing grants", () => {
  it("records a commitment and keeps the grant in the licensor's private book", () => {
    const g = grant("ana");
    const id = sim.issue("agency", g);
    const l = sim.getLedger();
    expect(id).toBe(0);
    expect(l.issued).toBe(1n);
    expect(l.grants.lookup(0n)).toEqual(pureCircuits.grant_commitment(g));
    const book = sim.privateState("agency").book!;
    expect(book.grants[0]).toEqual(g);
    expect(l.book).toEqual(pureCircuits.book_commitment(book));
  });

  it("refuses an exclusive grant that overlaps one already sold", () => {
    sell("ana");
    const before = sim.getLedger().book;
    expect(() => sim.issue("agency", grant("ben", { start: T0 + 100n * DAY, end: T0 + 2n * YEAR }))).toThrow("Overlaps an exclusive grant already issued");
    expect(sim.getLedger().issued).toBe(1n);
    expect(sim.getLedger().book).toEqual(before);
  });

  it("allows grants that differ in region, category or time", () => {
    sell("ana");
    sell("ben", { regions: [UK] });
    sell("ben", { categories: [TOYS] });
    sell("ben", { start: T0 + YEAR, end: T0 + 2n * YEAR }); // starts the moment the first ends
    sell("ben", { start: T0 - YEAR, end: T0 }); // ends the moment the first starts
    expect(sim.getLedger().issued).toBe(5n);
  });

  it("finds overlaps inside multi-region, multi-category grants", () => {
    sell("ana");
    expect(() => sim.issue("agency", grant("ben", { regions: [EAST_ASIA, SOUTH_ASIA], categories: [TOYS, FOOD] }))).toThrow("Overlaps");
    sell("ben", { regions: [EAST_ASIA, UK], categories: [TOYS, FOOD, APPAREL] });
  });

  it("checks every grant in the book, not just the last one", () => {
    sell("ana");
    sell("ben", { regions: [UK] });
    sell("ben", { regions: [EAST_ASIA] });
    expect(() => sim.issue("agency", grant("eve", { start: T0 + 30n * DAY, end: T0 + 60n * DAY }))).toThrow("Overlaps");
  });

  it("lets non-exclusive grants share rights, but never with an exclusive one", () => {
    sell("ana", { exclusive: false });
    sell("ben", { exclusive: false });
    expect(() => sim.issue("agency", grant("eve", { exclusive: true }))).toThrow("Overlaps");

    sell("eve", { regions: [UK], exclusive: true });
    expect(() => sim.issue("agency", grant("ana", { regions: [UK], exclusive: false }))).toThrow("Overlaps");
  });

  it("refuses empty or backwards grants", () => {
    expect(() => sim.issue("agency", grant("ana", { regions: [] }))).toThrow("needs a region, a category");
    expect(() => sim.issue("agency", grant("ana", { categories: [] }))).toThrow("needs a region, a category");
    expect(() => sim.issue("agency", grant("ana", { end: T0 }))).toThrow("end after its start");
  });

  it("only lets the licensor issue", () => {
    sim.setPrivateState("eve", { ...sim.privateState("agency"), secret: randomBytes() });
    expect(() => sim.issue("eve", grant("eve"))).toThrow("Only the licensor can issue grants");
  });

  it("refuses a book with a grant quietly removed", () => {
    sell("ana");
    const ps = sim.privateState("agency");
    const erased = { ...ps.book!, grants: [emptyGrant(), ...ps.book!.grants.slice(1)] };
    sim.setPrivateState("agency", { ...ps, book: erased });
    expect(() => sim.issue("agency", grant("ben"))).toThrow("The book on this device is not the one on the ledger");
  });

  it("refuses a stale copy of the book", () => {
    const stale = sim.privateState("agency");
    sell("ana");
    sim.setPrivateState("agency", stale);
    expect(() => sim.issue("agency", grant("ben"))).toThrow("not the one on the ledger");
  });

  it("holds sixteen grants", () => {
    for (let i = 0; i < 16; i++) sell("ana", { exclusive: false });
    expect(() => sim.issue("agency", grant("ben", { exclusive: false }))).toThrow("This book is full");
  });

  it("publishes commitments that reveal nothing, not even repeated terms", () => {
    const a = grant("ana");
    const b = { ...a, salt: randomBytes() };
    expect(pureCircuits.grant_commitment(a)).not.toEqual(pureCircuits.grant_commitment(b));
    sim.issue("agency", { ...a, exclusive: false });
    sim.issue("agency", { ...b, exclusive: false });
    const l = sim.getLedger();
    expect(l.grants.lookup(0n)).not.toEqual(l.grants.lookup(1n));
  });

  it("agrees with the TypeScript rules on random grants", () => {
    const rnd = (n: number) => Math.floor(Math.random() * n);
    const pick = () => Array.from({ length: 8 }, (_, i) => i).filter(() => Math.random() < 0.25);
    const randomGrant = () => {
      const start = T0 + BigInt(rnd(1000)) * DAY;
      return grant("ana", { regions: pick(), categories: pick(), start, end: start + BigInt(rnd(800) - 50) * DAY, exclusive: Math.random() < 0.6 });
    };
    for (let i = 0; i < 300; i++) {
      const a = randomGrant();
      const b = randomGrant();
      expect(pureCircuits.clashes(a, b)).toBe(clashes(a, b));
      expect(pureCircuits.well_formed(a)).toBe(grantProblem(a) === null);
    }
  });

  it("names the conflicting grants before proving", () => {
    sell("ana");
    sell("ben", { regions: [UK] });
    sell("ben", { regions: [SOUTH_ASIA], categories: [TOYS] });
    const book = sim.privateState("agency").book!;
    expect(conflicts(book, 3, grant("eve", { regions: [SOUTH_ASIA, UK], categories: [FOOD] }))).toEqual([0, 1]);
    expect(conflicts(book, 3, grant("eve", { regions: [EAST_ASIA] }))).toEqual([]);
  });
});

describe("licensees", () => {
  it("lets the named licensee accept", () => {
    const id = sell("ana");
    sim.accept("ana", id);
    expect(sim.getLedger().accepted.member(0n)).toBe(true);
  });

  it("refuses anyone else holding the same terms", () => {
    const id = sell("ana");
    sim.give("eve", id, sim.privateState("ana").held[id]);
    expect(() => sim.accept("eve", id)).toThrow("This grant names a different licensee");
  });

  it("refuses terms that differ from what was issued", () => {
    const id = sell("ana");
    const g = sim.privateState("ana").held[id];
    sim.give("ana", id, { ...g, end: g.end + 10n * YEAR });
    expect(() => sim.accept("ana", id)).toThrow("These are not the terms that were issued");
  });

  it("refuses unknown grants and double acceptance", () => {
    sim.give("ana", 3, grant("ana"));
    expect(() => sim.accept("ana", 3)).toThrow("There is no grant with that number");
    const id = sell("ana");
    sim.accept("ana", id);
    expect(() => sim.accept("ana", id)).toThrow("already accepted");
  });
});

describe("proving rights", () => {
  const check = randomBytes();

  beforeEach(() => {
    sell("ana", { regions: [SOUTH_ASIA, EAST_ASIA], categories: [FOOD] });
    sim.accept("ana", 0);
    sim.advance(30n * DAY);
  });

  it("proves one region and category, disclosing nothing else", () => {
    sim.proveRights("ana", 0, EAST_ASIA, FOOD, check);
    const c = sim.getLedger().checks.lookup(check);
    expect(c).toEqual({ grant: 0n, region: BigInt(EAST_ASIA), category: BigInt(FOOD), exclusive: true, at: sim.now });
  });

  it("refuses regions, categories and dates the grant does not cover", () => {
    expect(() => sim.proveRights("ana", 0, UK, FOOD, check)).toThrow("does not cover");
    expect(() => sim.proveRights("ana", 0, SOUTH_ASIA, TOYS, check)).toThrow("does not cover");
    sim.advance(YEAR);
    expect(() => sim.proveRights("ana", 0, SOUTH_ASIA, FOOD, check)).toThrow("does not cover");
  });

  it("refuses a grant that has not started", () => {
    sell("ana", { regions: [UK], start: T0 + YEAR, end: T0 + 2n * YEAR });
    sim.accept("ana", 1);
    expect(() => sim.proveRights("ana", 1, UK, FOOD, check)).toThrow("does not cover");
  });

  it("needs the grant accepted, and the licensee's own secret", () => {
    sell("ben", { regions: [UK] });
    expect(() => sim.proveRights("ben", 1, UK, FOOD, check)).toThrow("Accept the grant before using it");
    sim.give("eve", 0, sim.privateState("ana").held[0]);
    expect(() => sim.proveRights("eve", 0, SOUTH_ASIA, FOOD, check)).toThrow("names a different licensee");
  });

  it("answers each check once", () => {
    sim.proveRights("ana", 0, SOUTH_ASIA, FOOD, check);
    expect(() => sim.proveRights("ana", 0, EAST_ASIA, FOOD, check)).toThrow("already been answered");
  });

  it("refuses a clock far from the chain's", () => {
    sim.claimedTime = sim.now + 600n;
    expect(() => sim.proveRights("ana", 0, SOUTH_ASIA, FOOD, check)).toThrow("Clock is ahead of the chain");
    sim.claimedTime = sim.now - 3_600n;
    expect(() => sim.proveRights("ana", 0, SOUTH_ASIA, FOOD, check)).toThrow("Clock is behind the chain");
  });
});

describe("license codes", () => {
  it("round-trip a grant and its terms", async () => {
    const g = grant("ana", { regions: [SOUTH_ASIA, EAST_ASIA], categories: [FOOD, TOYS], terms: await termsHash("8% royalty, £5k minimum") });
    const code = encodeLicense({ address: "ab".repeat(32), id: 3, title: "Mochi the Cat", note: "8% royalty, £5k minimum", grant: g });
    const l = decodeLicense(code);
    expect(l?.grant).toEqual(g);
    expect(l?.id).toBe(3);
    expect(l?.note).toBe("8% royalty, £5k minimum");
    expect(pureCircuits.grant_commitment(l!.grant)).toEqual(pureCircuits.grant_commitment(g));
  });

  it("rejects garbage", () => {
    expect(decodeLicense("not a license")).toBeNull();
    expect(decodeLicense("")).toBeNull();
  });
});
