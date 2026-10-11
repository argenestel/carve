// SPDX-License-Identifier: Apache-2.0
import { useEffect, useState } from "react";
import { WalletError } from "../lib/wallet";

export const Busy = ({ label }: { label: string }) => (
  <>
    <span className="spin" /> {label}…
  </>
);

/** Turn circuit assertion failures and wallet errors into one readable line. */
export const errorText = (e: unknown): string | null => {
  // Connection problems already show in the banner.
  if (e instanceof WalletError) return null;
  const m = String((e as Error)?.message ?? e);
  const assert = m.match(/failed assert: (.*)/);
  if (assert) return assert[1];
  if (/reject|denied|cancel/i.test(m)) return "Cancelled in Lace.";
  if (/insufficient|not enough|dust/i.test(m)) return "Not enough tDUST to pay the fee. Fund your Lace wallet from the Preprod faucet.";
  return m.length > 240 ? `${m.slice(0, 240)}…` : m;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Jan 2027" for a Unix time in seconds. */
export const month = (t: bigint) => {
  const d = new Date(Number(t) * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
/** "Jan 2027 – Dec 2027": the end is exclusive, so show the month before it. */
export const period = (start: bigint, end: bigint) => `${month(start)} – ${month(end - 1n)}`;

export const useNow = (everyMs = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
};

export const Copy = ({ text, label = "Copy", className = "ghost-btn" }: { text: string; label?: string; className?: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
};

export const Notice = ({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) => (
  <main className="notice">
    <h1>{title}</h1>
    {children}
  </main>
);

export const short = (hex: string) => `${hex.slice(0, 8)}…${hex.slice(-4)}`;
