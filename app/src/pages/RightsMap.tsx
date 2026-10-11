// SPDX-License-Identifier: Apache-2.0
//
// The rights map: regions down, categories across. Each grant fills the cells
// it covers; a draft grant is outlined, and cells where it clashes are struck.

import { CATEGORIES, type Grant, REGIONS } from "@carve/contract";

export const CATEGORY_SHORT = ["Apparel", "Toys", "Food", "Beauty", "Books", "Apps", "Home", "Ads"];
export const REGION_SHORT = ["N. America", "Latin Am.", "UK & IE", "Europe", "MEA", "S. Asia", "E. Asia", "Oceania"];

const TONES = ["#2f7d78", "#7b4b94", "#c08a1e", "#4f7a3a", "#3f5f9e", "#b0563a", "#b4577d", "#6b6b2f"];
export const tone = (id: number) => TONES[id % TONES.length];

export type Layer = { id: number; grant: Grant };

type Props = {
  layers?: Layer[];
  draft?: { regions: boolean[]; categories: boolean[] } | null;
  clashIds?: number[];
  onRegion?: (i: number) => void;
  onCategory?: (i: number) => void;
  small?: boolean;
  disabled?: boolean;
};

export const RightsMap = ({ layers = [], draft, clashIds = [], onRegion, onCategory, small, disabled }: Props) => {
  const live = !disabled && (onRegion || onCategory);
  return (
    <div className={`rmap ${small ? "small" : ""} ${live ? "live" : ""}`} role="grid">
      <span className="corner" />
      {CATEGORIES.map((c, j) => (
        <button
          key={c}
          type="button"
          className={`head col ${draft?.categories[j] ? "on" : ""}`}
          title={c}
          disabled={!onCategory || disabled}
          onClick={() => onCategory?.(j)}
        >
          <span>{small ? CATEGORY_SHORT[j].slice(0, 1) : CATEGORY_SHORT[j]}</span>
        </button>
      ))}
      {REGIONS.map((r, i) => (
        <Row key={r} i={i} layers={layers} draft={draft} clashIds={clashIds} onRegion={onRegion} small={small} disabled={disabled} />
      ))}
    </div>
  );
};

const Row = ({ i, layers, draft, clashIds, onRegion, small, disabled }: Props & { i: number; layers: Layer[]; clashIds: number[] }) => (
  <>
    <button
      type="button"
      className={`head row ${draft?.regions[i] ? "on" : ""}`}
      title={REGIONS[i]}
      disabled={!onRegion || disabled}
      onClick={() => onRegion?.(i)}
    >
      {small ? REGION_SHORT[i].slice(0, 2) : REGION_SHORT[i]}
    </button>
    {CATEGORIES.map((_, j) => {
      const here = layers.filter((l) => l.grant.regions[i] && l.grant.categories[j]);
      const solid = here.find((l) => l.grant.exclusive);
      const shared = here.filter((l) => !l.grant.exclusive);
      const picked = !!draft && draft.regions[i] && draft.categories[j];
      const clash = picked && here.some((l) => clashIds.includes(l.id));
      const style = solid
        ? { background: tone(solid.id) }
        : shared.length
          ? { background: `repeating-linear-gradient(135deg, ${tone(shared[0].id)} 0 4px, transparent 4px 9px)` }
          : undefined;
      return (
        <span
          key={j}
          className={`rcell ${picked ? "picked" : ""} ${clash ? "clash" : ""}`}
          style={style}
          title={`${REGIONS[i]} × ${CATEGORIES[j]}${here.length ? ` · grant ${here.map((l) => `#${l.id + 1}`).join(", ")}` : ""}`}
        >
          {clash ? <X /> : solid && !small ? <b>#{solid.id + 1}</b> : null}
        </span>
      );
    })}
  </>
);

const X = () => (
  <svg viewBox="0 0 20 20" className="x" aria-hidden>
    <path d="M4 4 16 16M16 4 4 16" />
  </svg>
);
