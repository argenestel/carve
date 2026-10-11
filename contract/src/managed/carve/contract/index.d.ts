import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Grant = { regions: boolean[];
                      categories: boolean[];
                      start: bigint;
                      end: bigint;
                      exclusive: boolean;
                      licensee: Uint8Array;
                      terms: Uint8Array;
                      salt: Uint8Array
                    };

export type Book = { grants: Grant[]; salt: Uint8Array };

export type Coverage = { grant: bigint;
                         region: bigint;
                         category: bigint;
                         exclusive: boolean;
                         at: bigint
                       };

export type Witnesses<PS> = {
  secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  my_book(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Book];
  keep_book(context: __compactRuntime.WitnessContext<Ledger, PS>, b_0: Book): [PS, []];
  held_grant(context: __compactRuntime.WitnessContext<Ledger, PS>, id_0: bigint): [PS, Grant];
  current_time(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  issue(context: __compactRuntime.CircuitContext<PS>, g_0: Grant): __compactRuntime.CircuitResults<PS, []>;
  accept(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  prove_rights(context: __compactRuntime.CircuitContext<PS>,
               id_0: bigint,
               region_0: bigint,
               category_0: bigint,
               check_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  issue(context: __compactRuntime.CircuitContext<PS>, g_0: Grant): __compactRuntime.CircuitResults<PS, []>;
  accept(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  prove_rights(context: __compactRuntime.CircuitContext<PS>,
               id_0: bigint,
               region_0: bigint,
               category_0: bigint,
               check_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  book_size(): bigint;
  licensor_key(sk_0: Uint8Array): Uint8Array;
  licensee_key(sk_0: Uint8Array): Uint8Array;
  grant_commitment(g_0: Grant): Uint8Array;
  book_commitment(b_0: Book): bigint;
  well_formed(g_0: Grant): boolean;
  clashes(a_0: Grant, b_0: Grant): boolean;
  covers(g_0: Grant, region_0: bigint, category_0: bigint, t_0: bigint): boolean;
}

export type Circuits<PS> = {
  book_size(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  licensor_key(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  licensee_key(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  grant_commitment(context: __compactRuntime.CircuitContext<PS>, g_0: Grant): __compactRuntime.CircuitResults<PS, Uint8Array>;
  book_commitment(context: __compactRuntime.CircuitContext<PS>, b_0: Book): __compactRuntime.CircuitResults<PS, bigint>;
  well_formed(context: __compactRuntime.CircuitContext<PS>, g_0: Grant): __compactRuntime.CircuitResults<PS, boolean>;
  clashes(context: __compactRuntime.CircuitContext<PS>, a_0: Grant, b_0: Grant): __compactRuntime.CircuitResults<PS, boolean>;
  covers(context: __compactRuntime.CircuitContext<PS>,
         g_0: Grant,
         region_0: bigint,
         category_0: bigint,
         t_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  issue(context: __compactRuntime.CircuitContext<PS>, g_0: Grant): __compactRuntime.CircuitResults<PS, []>;
  accept(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  prove_rights(context: __compactRuntime.CircuitContext<PS>,
               id_0: bigint,
               region_0: bigint,
               category_0: bigint,
               check_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly title: string;
  readonly licensor: Uint8Array;
  readonly book: bigint;
  readonly issued: bigint;
  grants: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  accepted: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: bigint): boolean;
    [Symbol.iterator](): Iterator<bigint>
  };
  checks: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Coverage;
    [Symbol.iterator](): Iterator<[Uint8Array, Coverage]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>, name_0: string): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
