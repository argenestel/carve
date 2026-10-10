// SPDX-License-Identifier: Apache-2.0
import { type Placement, fleetProblem, randomPlacement } from "@salvo/contract";
import { useState } from "react";
import { Board } from "./Board";

/** Tap a ship to pick it up, tap water to move it there, tap it again to turn it. */
export const FleetEditor = ({ ships, onChange, disabled }: { ships: Placement[]; onChange: (s: Placement[]) => void; disabled?: boolean }) => {
  const [sel, setSel] = useState<number | null>(null);
  const [nope, setNope] = useState(false);

  const tryPlace = (i: number, p: Placement) => {
    const next = ships.map((s, j) => (j === i ? p : s));
    if (fleetProblem(next)) {
      setNope(true);
      setTimeout(() => setNope(false), 350);
      return false;
    }
    onChange(next);
    return true;
  };

  return (
    <div className={`editor ${nope ? "nope" : ""}`}>
      <Board
        ships={ships}
        selected={sel}
        disabled={disabled}
        onShip={
          disabled
            ? undefined
            : (i) => {
                if (sel === i) tryPlace(i, { ...ships[i], vertical: !ships[i].vertical });
                else setSel(i);
              }
        }
        onCell={sel === null || disabled ? undefined : (x, y) => tryPlace(sel, { ...ships[sel], x, y }) && setSel(null)}
      />
      <div className="editor-tools">
        <button type="button" className="chip" disabled={disabled} onClick={() => (setSel(null), onChange(randomPlacement()))}>
          ↻ Shuffle
        </button>
        <span className="hint">{sel === null ? "Tap a ship to move it" : "Tap water to move · tap the ship to turn"}</span>
      </div>
    </div>
  );
};
