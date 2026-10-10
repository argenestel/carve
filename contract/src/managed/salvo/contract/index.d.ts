import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Phase { empty = 0, open = 1, playing = 2, over = 3 }

export type Ship = { x: bigint; y: bigint; vertical: boolean };

export type Fleet = { ships: Ship[]; salt: Uint8Array };

export type Shot = { x: bigint; y: bigint };

export type Witnesses<PS> = {
  player_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  my_fleet(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Fleet];
  current_time(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  join(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  play(context: __compactRuntime.CircuitContext<PS>,
       salvo_0: Shot[],
       count_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claim_timeout(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resign(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  show_fleet(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  join(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  play(context: __compactRuntime.CircuitContext<PS>,
       salvo_0: Shot[],
       count_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claim_timeout(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resign(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  show_fleet(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  board_size(): bigint;
  fleet_cells(): bigint;
  ship_length(i_0: bigint): bigint;
  player_key(sk_0: Uint8Array): Uint8Array;
  fleet_commitment(f_0: Fleet): Uint8Array;
  cell(x_0: bigint, y_0: bigint): bigint;
  is_hit(f_0: Fleet, x_0: bigint, y_0: bigint): boolean;
  is_legal(f_0: Fleet): boolean;
}

export type Circuits<PS> = {
  board_size(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  fleet_cells(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  ship_length(context: __compactRuntime.CircuitContext<PS>, i_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  player_key(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  fleet_commitment(context: __compactRuntime.CircuitContext<PS>, f_0: Fleet): __compactRuntime.CircuitResults<PS, Uint8Array>;
  cell(context: __compactRuntime.CircuitContext<PS>, x_0: bigint, y_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  is_hit(context: __compactRuntime.CircuitContext<PS>,
         f_0: Fleet,
         x_0: bigint,
         y_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  is_legal(context: __compactRuntime.CircuitContext<PS>, f_0: Fleet): __compactRuntime.CircuitResults<PS, boolean>;
  join(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  play(context: __compactRuntime.CircuitContext<PS>,
       salvo_0: Shot[],
       count_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  claim_timeout(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resign(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  show_fleet(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly move_time: bigint;
  readonly phase: Phase;
  readonly player1: Uint8Array;
  readonly player2: Uint8Array;
  readonly fleet1: Uint8Array;
  readonly fleet2: Uint8Array;
  readonly turn: bigint;
  readonly incoming: Shot[];
  readonly incoming_count: bigint;
  shots_at1: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
  shots_at2: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
  readonly hits_on1: bigint;
  readonly hits_on2: bigint;
  readonly moves: bigint;
  readonly deadline: bigint;
  readonly winner: bigint;
  readonly by_timeout: boolean;
  readonly shown1: Ship[];
  readonly shown2: Ship[];
  readonly is_shown1: boolean;
  readonly is_shown2: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               seconds_per_move_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
