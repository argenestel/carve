// SPDX-License-Identifier: Apache-2.0
//
// One book's live ledger, this browser's private state for it, and a runner
// that connects Lace, opens the contract and calls a circuit.

import type { CarvePrivateState, Ledger } from "@carve/contract";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "../App";
import { canRead, fetchLedger, isAddress, loadPrivateState, makeProviders, onReaderChange, openBook, rememberBook, watchLedger } from "../lib/carve";
import { errorText } from "./ui";

export const useBook = (address: string) => {
  const { connect } = useWallet();
  const [readable, setReadable] = useState(canRead());
  const [l, setL] = useState<Ledger | null | undefined>(undefined);
  const [ps, setPs] = useState<CarvePrivateState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: the deployed-contract handle from midnight-js
  const contract = useRef<any>(null);
  const valid = isAddress(address);

  useEffect(() => onReaderChange(() => setReadable(canRead())), []);
  useEffect(() => {
    if (valid) loadPrivateState(address).then(setPs);
  }, [address, valid]);
  useEffect(() => {
    if (!readable || !valid) return;
    let alive = true;
    fetchLedger(address)
      .then((x) => {
        if (!alive) return;
        setL(x);
        if (x) rememberBook(address, x.title);
      })
      .catch((e) => alive && setError(errorText(e)));
    const sub = watchLedger(address).subscribe({ next: (x) => alive && setL(x), error: () => {} });
    return () => {
      alive = false;
      sub.unsubscribe();
    };
  }, [address, readable, valid]);

  /** Run a circuit. Re-opens the contract when the private state changed underneath it. */
  const run = async (label: string, fn: (c: unknown) => Promise<unknown>, reopen = false) => {
    setError(null);
    setBusy(label);
    try {
      const w = await connect();
      if (!contract.current || reopen) contract.current = await openBook(await makeProviders(w), address);
      await fn(contract.current);
      setPs(await loadPrivateState(address));
      setL(await fetchLedger(address));
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const reload = async () => setPs(await loadPrivateState(address));

  return { valid, readable, l, ps, busy, error, setError, run, reload, connect };
};
