// SPDX-License-Identifier: Apache-2.0
//
// The rights map in TypeScript: grant construction, the same clash rule the
// circuit enforces (so the UI can explain a conflict before proving), license
// codes for handing a grant to its licensee, and the deploy-state check.

import type { Book, Grant, Ledger } from "./managed/carve/contract/index.js";
import { randomBytes } from "./witnesses.js";

export const REGIONS = ["North America", "Latin America", "UK & Ireland", "Europe", "Middle East & Africa", "South Asia", "East Asia", "Oceania"] as const;
export const CATEGORIES = ["Apparel", "Toys & games", "Food & drink", "Beauty", "Publishing", "Games & apps", "Home & living", "Advertising"] as const;

export type GrantInput = {
  regions: number[];
  categories: number[];
  /** Unix seconds, inclusive. */
  start: bigint;
  /** Unix seconds, exclusive. */
  end: bigint;
  exclusive: boolean;
  /** The licensee's key (licensee_key of their secret). */
  licensee: Uint8Array;
  terms?: Uint8Array;
  salt?: Uint8Array;
};

const mask = (idx: number[]) => Array.from({ length: 8 }, (_, i) => idx.includes(i));
export const indexes = (m: boolean[]) => m.flatMap((b, i) => (b ? [i] : []));

export const makeGrant = (g: GrantInput): Grant => ({
  regions: mask(g.regions),
  categories: mask(g.categories),
  start: g.start,
  end: g.end,
  exclusive: g.exclusive,
  licensee: g.licensee,
  terms: g.terms ?? new Uint8Array(32),
  salt: g.salt ?? randomBytes(),
});

/** Why a grant would be refused on its own, or null. */
export const grantProblem = (g: Grant): string | null => {
  if (!g.regions.some(Boolean)) return "Pick at least one region";
  if (!g.categories.some(Boolean)) return "Pick at least one category";
  if (g.end <= g.start) return "The end must come after the start";
  return null;
};

const shared = (a: boolean[], b: boolean[]) => a.some((x, i) => x && b[i]);

/** Mirrors the circuit: either exclusive, overlapping in time, region and category. */
export const clashes = (a: Grant, b: Grant) =>
  (a.exclusive || b.exclusive) && a.start < b.end && b.start < a.end && shared(a.regions, b.regions) && shared(a.categories, b.categories);

/** Grant numbers in the book that a new grant would clash with. */
export const conflicts = (book: Book, issued: number, g: Grant): number[] =>
  book.grants.slice(0, issued).flatMap((b, i) => (clashes(b, g) ? [i] : []));

export const covers = (g: Grant, region: number, category: number, at: bigint) =>
  g.regions[region] && g.categories[category] && g.start <= at && at < g.end;

/**
 * The constructor is not proven, so the deploy transaction could carry any
 * initial state. A book can be trusted when it started empty: every later
 * change went through a proven circuit.
 */
export const startedClean = (deployState: Ledger) =>
  deployState.issued === 0n && deployState.grants.isEmpty() && deployState.accepted.isEmpty() && deployState.checks.isEmpty();

// ── License codes ───────────────────────────────────────────────────────────
// What the licensor sends the licensee, privately (email, chat): the contract,
// the grant number and the full grant opening. The licensee checks it against
// the commitment on the ledger.

export type License = {
  address: string;
  id: number;
  title: string;
  /** Human-readable terms. Their SHA-256 is the grant's `terms`. */
  note: string;
  grant: Grant;
};

export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => Number.parseInt(x, 16));

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const bits = (m: boolean[]) => m.reduce((n, b, i) => n | (b ? 1 << i : 0), 0);
const unbits = (n: number) => Array.from({ length: 8 }, (_, i) => (n & (1 << i)) !== 0);

export const encodeLicense = (l: License): string => {
  const g = l.grant;
  const v = {
    v: 1,
    a: l.address,
    i: l.id,
    t: l.title,
    n: l.note,
    g: [bits(g.regions), bits(g.categories), g.start.toString(), g.end.toString(), g.exclusive ? 1 : 0, toHex(g.licensee), toHex(g.terms), toHex(g.salt)],
  };
  return b64url(new TextEncoder().encode(JSON.stringify(v)));
};

export const decodeLicense = (code: string): License | null => {
  try {
    const v = JSON.parse(new TextDecoder().decode(unb64url(code.trim())));
    if (v.v !== 1 || !/^[0-9a-f]{64}$/i.test(v.a)) return null;
    const [r, c, s, e, x, who, terms, salt] = v.g;
    return {
      address: v.a,
      id: Number(v.i),
      title: String(v.t),
      note: String(v.n),
      grant: {
        regions: unbits(r),
        categories: unbits(c),
        start: BigInt(s),
        end: BigInt(e),
        exclusive: x === 1,
        licensee: fromHex(who),
        terms: fromHex(terms),
        salt: fromHex(salt),
      },
    };
  } catch {
    return null;
  }
};

/** SHA-256 of the human-readable terms, stored in the grant. */
export const termsHash = async (note: string): Promise<Uint8Array> =>
  new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(note)));
