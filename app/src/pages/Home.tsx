// SPDX-License-Identifier: Apache-2.0
import { useState } from "react";
import { go } from "../App";
import { isAddress, recentTenders } from "../lib/tender";
import { shortAddress } from "../lib/wallet";

export const Home = () => {
  const [addr, setAddr] = useState("");
  const recent = recentTenders();
  const valid = isAddress(addr.trim());
  return (
    <main className="home">
      <section className="hero">
        <h1>
          Sealed bids.
          <br />
          Provably fair awards.
        </h1>
        <p className="big">Prices stay hidden until the deadline. The buyer proves the lowest bid won. Losing prices are never published.</p>
      </section>
      <section className="home-grid">
        <div className="tile">
          <h2>Run a tender</h2>
          <p className="fine">Set a ceiling and deadlines, then qualify suppliers.</p>
          <button className="cta" onClick={() => go("/new")}>
            New tender
          </button>
        </div>
        <div className="tile">
          <h2>Bid on a tender</h2>
          <p className="fine">Paste the tender address the buyer shared with you.</p>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) go(`/t/${addr.trim()}`);
            }}
          >
            <input className="field" placeholder="Contract address" value={addr} onChange={(e) => setAddr(e.target.value)} />
            <button className="cta" disabled={!valid}>
              Open
            </button>
          </form>
        </div>
      </section>
      {recent.length > 0 && (
        <section>
          <h3 className="label">Your tenders</h3>
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.address}>
                <a href={`#/t/${r.address}`}>
                  <strong>{r.title}</strong>
                  <span className="tag">{r.role}</span>
                  <code>{shortAddress(r.address)}</code>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};
