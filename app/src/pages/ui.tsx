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

export const useNow = (everyMs = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
};

export const countdown = (to: number, now: number) => {
  let s = Math.max(0, Math.floor((to - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
};

export const Copy = ({ text, label = "Copy" }: { text: string; label?: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      className="ghost-btn"
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
