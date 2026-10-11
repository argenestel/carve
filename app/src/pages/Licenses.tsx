// SPDX-License-Identifier: Apache-2.0
import { heldLicenses, myLicenseeId } from "../lib/carve";
import { Copy } from "./ui";

export const LicensesPage = () => {
  const id = myLicenseeId();
  const held = heldLicenses();
  return (
    <main className="me">
      <section className="id-card">
        <span className="eyebrow">Your licensee ID</span>
        <p className="mono big-id">{id}</p>
        <Copy text={id} label="Copy ID" className="btn" />
        <p className="muted">Send this to a licensor. Grants issued to it can only be accepted and used from this browser.</p>
      </section>

      <section className="grants">
        <h2>Your licenses</h2>
        {held.length === 0 && <p className="muted">None yet. Open the license link a licensor sends you.</p>}
        {held.map((h) => (
          <a key={`${h.address}${h.id}`} className="grant-row" href={`#/l/${h.code}`}>
            <span className="num">#{h.id + 1}</span>
            <span className="who">
              <b>{h.title}</b>
              <span className="mono muted">{h.address.slice(0, 12)}…</span>
            </span>
            <span className="state">Open</span>
          </a>
        ))}
      </section>
    </main>
  );
};
