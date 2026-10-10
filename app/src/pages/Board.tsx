// SPDX-License-Identifier: Apache-2.0
import { BOARD, type Placement, SHIP_LENGTHS } from "@salvo/contract";
import type { ReactNode } from "react";

export type Mark = "hit" | "miss" | "target" | "incoming" | "pending" | null;

const COLS = "ABCDEFGH";
export const coord = (x: number, y: number) => `${COLS[x]}${y + 1}`;

type Props = {
  ships?: Placement[];
  /** Ships drawn as outlines (an opponent's revealed fleet). */
  ghost?: boolean;
  mark?: (x: number, y: number) => Mark;
  label?: (x: number, y: number) => ReactNode;
  onCell?: (x: number, y: number) => void;
  onShip?: (i: number) => void;
  selected?: number | null;
  disabled?: boolean;
  dim?: boolean;
};

export const Board = ({ ships = [], ghost, mark, label, onCell, onShip, selected = null, disabled, dim }: Props) => {
  const cells = [];
  for (let y = 0; y < BOARD; y++)
    for (let x = 0; x < BOARD; x++) {
      const m = mark?.(x, y) ?? null;
      cells.push(
        <button
          key={`${x}-${y}`}
          type="button"
          className={`cell ${m ?? ""}`}
          style={{ gridColumn: x + 2, gridRow: y + 2 }}
          disabled={disabled || !onCell}
          onClick={() => onCell?.(x, y)}
          aria-label={coord(x, y)}
        >
          {m === "hit" && <Cross />}
          {m === "miss" && <span className="dot" />}
          {label?.(x, y)}
        </button>,
      );
    }
  return (
    <div className={`board ${dim ? "dim" : ""} ${onCell && !disabled ? "live" : ""}`}>
      {[...COLS].map((c, x) => (
        <span key={c} className="axis" style={{ gridColumn: x + 2, gridRow: 1 }}>
          {c}
        </span>
      ))}
      {Array.from({ length: BOARD }, (_, y) => (
        <span key={y} className="axis" style={{ gridColumn: 1, gridRow: y + 2 }}>
          {y + 1}
        </span>
      ))}
      {ships.map((p, i) => {
        const len = SHIP_LENGTHS[i];
        return (
          <div
            key={i}
            className={`ship ${ghost ? "ghost" : ""} ${selected === i ? "selected" : ""} ${onShip ? "grab" : ""}`}
            style={{
              gridColumn: `${p.x + 2} / span ${p.vertical ? 1 : len}`,
              gridRow: `${p.y + 2} / span ${p.vertical ? len : 1}`,
            }}
            onClick={onShip ? () => onShip(i) : undefined}
          />
        );
      })}
      {cells}
    </div>
  );
};

const Cross = () => (
  <svg className="cross" viewBox="0 0 24 24" aria-hidden>
    <path d="M5 5.5 L19 18.5 M18.5 5 L5.5 19" />
  </svg>
);
