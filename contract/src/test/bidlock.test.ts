// SPDX-License-Identifier: Apache-2.0

import { createCircuitContext, createConstructorContext, sampleContractAddress } from "@midnight-ntwrk/compact-runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { Contract, type Opening, pureCircuits } from "../managed/bidlock/contract/index.js";
import { newBoxKeys, openSealed, sealOpening } from "../sealing.js";
import { BidlockSimulator, DAY, HOUR, lowestBid } from "../simulator.js";
import { type BidlockPrivateState, buyerPrivateState, supplierPrivateState, witnesses } from "../witnesses.js";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const bytes = (fill: number) => new Uint8Array(32).fill(fill);

const T0 = 1_800_000_000n;
const BUYER = bytes(0xbb);
const TENDER_ID = bytes(0x7e);
const buyerBox = newBoxKeys();
const terms = {
  title: "Road resurfacing, Ring 3",
  tenderId: TENDER_ID,
  buyerKey: buyerBox.publicKey,
  ceiling: 1_000_000n,
  closesAt: T0 + 2n * DAY,
  revealUntil: T0 + 3n * DAY,
};

let sim: BidlockSimulator;
const SUPPLIERS = { atlas: bytes(0xa1), borealis: bytes(0xb2), cobalt: bytes(0xc3), outsider: bytes(0x66) };

beforeEach(() => {
  sim = new BidlockSimulator(terms, { buyerSecret: BUYER, now: T0 });
  for (const [name, s] of Object.entries(SUPPLIERS)) {
    const c = sim.addSupplier(name, s);
    if (name !== "outsider") sim.qualify(c);
  }
});

/** Atlas 820k, Borealis 640k, Cobalt 710k. All revealed; clock moved past the reveal window. */
const runToAward = () => {
  const a = sim.bid("atlas", 820_000n);
  const b = sim.bid("borealis", 640_000n);
  const c = sim.bid("cobalt", 710_000n);
  sim.advance(2n * DAY);
  for (const [who, i] of [["atlas", a], ["borealis", b], ["cobalt", c]] as const) {
    sim.reveal(who, i, sealOpening(sim.privateState(who).bids[i.toString()], who, buyerBox.publicKey));
  }
  sim.advance(1n * DAY);
  const openings = new Map<bigint, Opening>();
  for (const [i, sealed] of sim.getLedger().sealed_openings) {
    const o = openSealed(sealed, buyerBox);
    if (o) openings.set(i, o.opening);
  }
  return { a, b, c, openings };
};

describe("deployment", () => {
  it("fixes the tender terms and derives the buyer key from a private secret", () => {
    const l = sim.getLedger();
    expect(l.title).toBe("Road resurfacing, Ring 3");
    expect(l.ceiling).toBe(1_000_000n);
    expect(l.closes_at).toBe(T0 + 2n * DAY);
    expect(hex(l.buyer)).toBe(hex(pureCircuits.buyer_commitment(BUYER)));
    expect(l.awarded).toBe(false);
  });

  it("rejects a zero ceiling and a reveal window that ends before bidding closes", () => {
    const c = new Contract<BidlockPrivateState>(witnesses);
    const ctx = () => createConstructorContext(buyerPrivateState(), "0".repeat(64));
    expect(() => c.initialState(ctx(), "x", TENDER_ID, buyerBox.publicKey, 0n, 10n, 20n)).toThrow(/Ceiling must be positive/);
    expect(() => c.initialState(ctx(), "x", TENDER_ID, buyerBox.publicKey, 5n, 20n, 20n)).toThrow(/Reveal window/);
  });
});

describe("qualification", () => {
  it("lets the buyer qualify supplier commitments", () => {
    expect(sim.getLedger().supplier_count).toBe(3n);
  });

  it("rejects duplicates, non-buyers and late qualification", () => {
    expect(() => sim.qualify(pureCircuits.supplier_commitment(SUPPLIERS.atlas))).toThrow(/already qualified/);
    expect(() => sim.qualify(pureCircuits.supplier_commitment(SUPPLIERS.outsider), "atlas")).toThrow(/Buyer key is not available/);
    sim.setActor("impostor", buyerPrivateState(bytes(0x01)));
    expect(() => sim.qualify(pureCircuits.supplier_commitment(SUPPLIERS.outsider), "impostor")).toThrow(/Only the buyer/);
    sim.advance(2n * DAY);
    expect(() => sim.qualify(pureCircuits.supplier_commitment(SUPPLIERS.outsider))).toThrow(/Bidding has closed/);
  });
});

describe("sealed bidding", () => {
  it("stores only a commitment and keeps the price on the bidder's device", () => {
    const i = sim.bid("atlas", 820_000n, bytes(0x55));
    const l = sim.getLedger();
    expect(i).toBe(0n);
    expect(l.bid_count).toBe(1n);
    expect(hex(l.bids.lookup(0n))).toBe(hex(pureCircuits.bid_commitment({ amount: 820_000n, salt: bytes(0x55) }, TENDER_ID)));
    expect(sim.privateState("atlas").bids["0"].amount).toBe(820_000n);
    expect(sim.privateState("atlas").pendingBid).toBeNull();
  });

  it("hides the bidder: nothing on-chain matches a supplier commitment", () => {
    sim.bid("atlas", 820_000n);
    sim.bid("borealis", 640_000n);
    const l = sim.getLedger();
    const published = [...[...l.bids].map(([, c]) => hex(c)), ...[...l.nullifiers].map(hex)];
    for (const s of [SUPPLIERS.atlas, SUPPLIERS.borealis]) expect(published).not.toContain(hex(pureCircuits.supplier_commitment(s)));
  });

  it("binds commitments to this tender", () => {
    const o = { amount: 5n, salt: bytes(1) };
    expect(hex(pureCircuits.bid_commitment(o, TENDER_ID))).not.toBe(hex(pureCircuits.bid_commitment(o, bytes(0x7f))));
  });

  it("rejects unqualified suppliers", () => {
    expect(() => sim.bid("outsider", 100n)).toThrow(/not qualified/);
  });

  it("rejects a borrowed Merkle path", () => {
    const evil = new Contract<BidlockPrivateState>({
      ...witnesses,
      supplier_path: ({ privateState, ledger }) => [privateState, ledger.suppliers.findPathForLeaf(pureCircuits.supplier_commitment(SUPPLIERS.atlas))!],
    });
    const ps = { ...supplierPrivateState(SUPPLIERS.outsider), pendingBid: { amount: 1n, salt: bytes(2) } };
    const ctx = createCircuitContext(sampleContractAddress(), "0".repeat(64), sim.contractState, ps, undefined, undefined, Number(T0));
    expect(() => evil.impureCircuits.submit_bid(ctx)).toThrow(/Merkle path does not match/);
  });

  it("allows one bid per supplier", () => {
    sim.bid("atlas", 900_000n);
    expect(() => sim.bid("atlas", 500_000n)).toThrow(/already bid/);
  });

  it("enforces the ceiling and a positive price without revealing it", () => {
    expect(() => sim.bid("atlas", 1_000_001n)).toThrow(/exceeds the ceiling/);
    expect(() => sim.bid("atlas", 0n)).toThrow(/must be positive/);
    expect(() => sim.bid("atlas", 1_000_000n)).not.toThrow();
  });

  it("closes bidding at the deadline", () => {
    sim.advance(2n * DAY);
    expect(() => sim.bid("atlas", 1n)).toThrow(/Bidding has closed/);
  });

  it("caps the tender at 8 bids", () => {
    for (let k = 0; k < 8; k++) sim.qualify(sim.addSupplier(`s${k}`));
    for (let k = 0; k < 8; k++) sim.bid(`s${k}`, 1000n + BigInt(k));
    expect(() => sim.bid("atlas", 1n)).toThrow(/Tender is full/);
  });
});

describe("reveal to the buyer", () => {
  it("only opens after the deadline and before the reveal window ends", () => {
    const i = sim.bid("atlas", 820_000n);
    const sealed = sealOpening(sim.privateState("atlas").bids["0"], "Atlas", buyerBox.publicKey);
    expect(() => sim.reveal("atlas", i, sealed)).toThrow(/still open/);
    sim.advance(2n * DAY + HOUR);
    sim.reveal("atlas", i, sealed);
    expect(() => sim.reveal("atlas", i, sealed)).toThrow(/Already revealed/);
    sim.advance(DAY);
    expect(() => sim.reveal("atlas", i, sealed)).toThrow(/Reveal window is over/);
  });

  it("is readable by the buyer and nobody else", () => {
    const i = sim.bid("atlas", 820_000n);
    sim.advance(2n * DAY);
    sim.reveal("atlas", i, sealOpening(sim.privateState("atlas").bids["0"], "Atlas Paving", buyerBox.publicKey));
    const sealed = sim.getLedger().sealed_openings.lookup(i);
    expect(openSealed(sealed, buyerBox)).toMatchObject({ company: "Atlas Paving", opening: { amount: 820_000n } });
    expect(openSealed(sealed, newBoxKeys())).toBeNull();
  });

  it("rejects revealing someone else's bid", () => {
    const i = sim.bid("atlas", 820_000n);
    sim.advance(2n * DAY);
    expect(() => sim.reveal("borealis", i, "x")).toThrow(/Bid #0 is not available/);
    const ps = sim.privateState("borealis");
    sim.setActor("borealis", { ...ps, bids: { "0": { amount: 1n, salt: bytes(9) } } });
    expect(() => sim.reveal("borealis", i, "x")).toThrow(/did not place this bid/);
  });
});

describe("provably fair award", () => {
  it("awards the lowest bid and publishes only the winning price", () => {
    const { b, openings } = runToAward();
    expect(lowestBid(openings)).toBe(b);
    sim.award(b, openings);
    const l = sim.getLedger();
    expect(l.awarded).toBe(true);
    expect(l.winner).toBe(b);
    expect(l.winning_amount).toBe(640_000n);
    expect([...l.included].every(([, v]) => v)).toBe(true);
    expect(l.disputed.isEmpty()).toBe(true);
  });

  it("rejects awarding a bid that is not the lowest", () => {
    const { a, openings } = runToAward();
    expect(() => sim.award(a, openings)).toThrow(/not the lowest/);
  });

  it("rejects a buyer who lies about any opening", () => {
    const { b, openings } = runToAward();
    const forged = new Map(openings);
    forged.set(0n, { ...openings.get(0n)!, amount: 1n });
    expect(() => sim.award(b, forged)).toThrow(/does not match/);
  });

  it("rejects a forged winning price", () => {
    const { b, openings } = runToAward();
    expect(() => sim.award(b, openings, { winnerOpening: { ...openings.get(b)!, amount: 1n } })).toThrow(/Winning opening does not match/);
  });

  it("rejects excluding the winner itself", () => {
    const { b, openings } = runToAward();
    expect(() => sim.award(b, openings, { exclude: [b] })).toThrow(/must be an included bid/);
  });

  it("rejects awarding early, twice, or by anyone else", () => {
    const a = sim.bid("atlas", 500n);
    sim.advance(2n * DAY);
    const sealed = sealOpening(sim.privateState("atlas").bids["0"], "Atlas", buyerBox.publicKey);
    sim.reveal("atlas", a, sealed);
    const openings = new Map([[a, openSealed(sealed, buyerBox)!.opening]]);
    expect(() => sim.award(a, openings)).toThrow(/Reveal window is still open/);
    sim.advance(DAY);
    expect(() => sim.award(a, openings, { actor: "atlas" })).toThrow(/Buyer key/);
    sim.award(a, openings);
    expect(() => sim.award(a, openings)).toThrow(/Already awarded/);
  });

  it("lets the winner step forward by name, and only the winner", () => {
    const { b, openings } = runToAward();
    expect(() => sim.accept("borealis", "Borealis Bau")).toThrow(/Not awarded/);
    sim.award(b, openings);
    expect(() => sim.accept("atlas", "Atlas")).toThrow(/Bid #1 is not available/);
    sim.accept("borealis", "Borealis Bau GmbH");
    expect(sim.getLedger().winner_name).toBe("Borealis Bau GmbH");
    expect(() => sim.accept("borealis", "again")).toThrow(/Already accepted/);
  });
});

describe("disputes", () => {
  it("lets an unfairly excluded cheaper bidder contest the award on-chain", () => {
    const { b, c, openings } = runToAward();
    // The buyer "can't decrypt" Borealis (cheapest) and awards Cobalt.
    sim.award(c, openings, { exclude: [b] });
    expect(sim.getLedger().included.lookup(b)).toBe(false);
    sim.dispute("borealis", b);
    const l = sim.getLedger();
    expect(l.contested).toBe(true);
    expect(l.disputes).toBe(1n);
    expect(l.disputed.lookup(b)).toBe(640_000n);
    expect(() => sim.dispute("borealis", b)).toThrow(/Already disputed/);
  });

  it("rejects disputes from included bidders and from bids that were not lower", () => {
    const { a, b, c, openings } = runToAward();
    sim.award(c, openings, { exclude: [a, b] });
    expect(() => sim.dispute("atlas", a)).toThrow(/not lower than the winner/);
    sim.setActor("cobalt", sim.privateState("cobalt"));
    expect(() => sim.dispute("cobalt", c)).toThrow(/counted in the award/);
  });

  it("rejects disputes from bidders who never revealed", () => {
    const a = sim.bid("atlas", 300n);
    const b = sim.bid("borealis", 900n);
    sim.advance(2n * DAY);
    const sealed = sealOpening(sim.privateState("borealis").bids[b.toString()], "Borealis", buyerBox.publicKey);
    sim.reveal("borealis", b, sealed);
    sim.advance(DAY);
    sim.award(b, new Map([[b, openSealed(sealed, buyerBox)!.opening]]));
    expect(() => sim.dispute("atlas", a)).toThrow(/never revealed/);
  });

  it("rejects disputes before the award", () => {
    const { b } = runToAward();
    expect(() => sim.dispute("borealis", b)).toThrow(/Not awarded yet/);
  });
});
