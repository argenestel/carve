// SPDX-License-Identifier: Apache-2.0
//
// Private state for Carve. The identity secret, the licensor's book and the
// grants a licensee holds stay on the user's device. Circuits receive them as
// private ZK inputs and disclose only commitments and what a licensee chooses
// to prove.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Book, Grant, Ledger } from "./managed/carve/contract/index.js";

export const CarvePrivateStateId = "carvePrivateState" as const;

export type CarvePrivateState = {
  /** This user's identity. The same secret yields their licensor and licensee keys. */
  readonly secret: Uint8Array;
  /** The licensor's book, on the licensor's device only. */
  readonly book: Book | null;
  /** Grants this user holds as licensee, by grant number. */
  readonly held: Record<string, Grant>;
};

export const randomBytes = (n = 32): Uint8Array => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const BOOK_SIZE = 16;

export const emptyGrant = (): Grant => ({
  regions: Array(8).fill(false),
  categories: Array(8).fill(false),
  start: 0n,
  end: 0n,
  exclusive: false,
  licensee: new Uint8Array(32),
  terms: new Uint8Array(32),
  salt: new Uint8Array(32),
});

export const emptyBook = (salt: Uint8Array = randomBytes()): Book => ({
  grants: Array.from({ length: BOOK_SIZE }, emptyGrant),
  salt,
});

/** Private state for someone opening a new book. */
export const newLicensor = (secret: Uint8Array = randomBytes()): CarvePrivateState => ({ secret, book: emptyBook(), held: {} });

/** Private state for a licensee (or anyone without the book). */
export const newHolder = (secret: Uint8Array = randomBytes(), held: Record<string, Grant> = {}): CarvePrivateState => ({ secret, book: null, held });

/** The time a proof claims. A little behind the wall clock, as block times lag. */
export const realClock = (): bigint => BigInt(Math.floor(Date.now() / 1000) - 120);

type Ctx = WitnessContext<Ledger, CarvePrivateState>;
type R<T> = [CarvePrivateState, T];

export const makeWitnesses = (clock: () => bigint = realClock) => ({
  secret: ({ privateState: ps }: Ctx): R<Uint8Array> => [ps, ps.secret],
  my_book: ({ privateState: ps }: Ctx): R<Book> => {
    if (!ps.book) throw new Error("The book for this property is not on this device");
    return [ps, ps.book];
  },
  keep_book: ({ privateState: ps }: Ctx, b: Book): R<[]> => [{ ...ps, book: b }, []],
  held_grant: ({ privateState: ps }: Ctx, id: bigint): R<Grant> => {
    const g = ps.held[id.toString()];
    if (!g) throw new Error(`Grant #${Number(id) + 1} is not on this device`);
    return [ps, g];
  },
  current_time: ({ privateState: ps }: Ctx): R<bigint> => [ps, clock()],
});

export const witnesses = makeWitnesses();
