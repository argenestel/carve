// SPDX-License-Identifier: Apache-2.0
import { type Grant, makeGrant } from "@carve/contract";
import { go } from "../App";
import { heldLicenses, recentBooks } from "../lib/carve";
import { RightsMap } from "./RightsMap";

// The illustration: a book mid-season, and a new grant that clashes with #1.
const art = (regions: number[], categories: number[], exclusive = true): Grant =>
  makeGrant({ regions, categories, start: 0n, end: 1n, exclusive, licensee: new Uint8Array(32), salt: new Uint8Array(32) });
const ART = [
  { id: 0, grant: art([5], [2]) },
  { id: 1, grant: art([2, 3], [0, 1]) },
  { id: 2, grant: art([0], [4, 5], false) },
  { id: 3, grant: art([6, 7], [3]) },
  { id: 4, grant: art([1], [6, 7]) },
];
const DRAFT = { regions: [false, false, false, false, false, true, true, false], categories: [false, false, true, false, false, false, false, false] };

export const Home = () => {
  const books = recentBooks();
  const held = heldLicenses();
  return (
    <main className="home">
      <div className="hero-grid">
        <section className="hero">
          <h1>
            Sell exclusive rights.
            <br />
            <em>Keep your book private.</em>
          </h1>
          <p>
            License a character, a brand or a song by region, category and time. Every new grant is proven not to overlap an exclusive one, and nobody sees who
            bought what.
          </p>
          <div className="hero-actions">
            <button className="btn primary big" onClick={() => go("/new")}>
              Open a book
            </button>
            <button className="btn big" onClick={() => go("/me")}>
              I'm a licensee
            </button>
          </div>
        </section>
        <div className="hero-art" aria-hidden>
          <RightsMap layers={ART} draft={DRAFT} clashIds={[0]} />
        </div>
      </div>

      <ol className="how">
        <li>
          <b>Issue</b> The licensor's proof checks the new grant against their whole private book. An overlap can't be issued.
        </li>
        <li>
          <b>Accept</b> The licensee checks their terms against the ledger and countersigns with a proof that they're the one named.
        </li>
        <li>
          <b>Prove</b> A retailer asks "licensed for food in South Asia?" The licensee proves it, and shows nothing else.
        </li>
      </ol>

      {(books.length > 0 || held.length > 0) && (
        <div className="recent-grid">
          {books.length > 0 && (
            <section className="recent">
              <h2>Books</h2>
              {books.map((r) => (
                <a key={r.address} href={`#/b/${r.address}`}>
                  <span>{r.title}</span>
                  <span className="mono muted">{r.address.slice(0, 10)}…</span>
                </a>
              ))}
            </section>
          )}
          {held.length > 0 && (
            <section className="recent">
              <h2>Licenses</h2>
              {held.map((h) => (
                <a key={`${h.address}${h.id}`} href={`#/l/${h.code}`}>
                  <span>
                    {h.title} · #{h.id + 1}
                  </span>
                  <span className="mono muted">{h.address.slice(0, 10)}…</span>
                </a>
              ))}
            </section>
          )}
        </div>
      )}
    </main>
  );
};
