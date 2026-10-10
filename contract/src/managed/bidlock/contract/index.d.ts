import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Opening = { amount: bigint; salt: Uint8Array };

export type Witnesses<PS> = {
  buyer_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  supplier_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  supplier_path(context: __compactRuntime.WitnessContext<Ledger, PS>,
                leaf_0: Uint8Array): [PS, { leaf: Uint8Array,
                                            path: { sibling: { field: bigint },
                                                    goes_left: boolean
                                                  }[]
                                          }];
  new_bid(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Opening];
  remember_bid(context: __compactRuntime.WitnessContext<Ledger, PS>,
               index_0: bigint,
               bid_0: Opening): [PS, []];
  my_bid(context: __compactRuntime.WitnessContext<Ledger, PS>, index_0: bigint): [PS, Opening];
  award_openings(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Opening[]];
  award_included(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean[]];
  award_winner(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Opening];
}

export type ImpureCircuits<PS> = {
  qualify(context: __compactRuntime.CircuitContext<PS>, commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submit_bid(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  reveal_bid(context: __compactRuntime.CircuitContext<PS>,
             index_0: bigint,
             sealed_opening_0: string): __compactRuntime.CircuitResults<PS, []>;
  award(context: __compactRuntime.CircuitContext<PS>, winner_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  accept_award(context: __compactRuntime.CircuitContext<PS>, name_0: string): __compactRuntime.CircuitResults<PS, []>;
  dispute(context: __compactRuntime.CircuitContext<PS>, index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  qualify(context: __compactRuntime.CircuitContext<PS>, commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submit_bid(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  reveal_bid(context: __compactRuntime.CircuitContext<PS>,
             index_0: bigint,
             sealed_opening_0: string): __compactRuntime.CircuitResults<PS, []>;
  award(context: __compactRuntime.CircuitContext<PS>, winner_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  accept_award(context: __compactRuntime.CircuitContext<PS>, name_0: string): __compactRuntime.CircuitResults<PS, []>;
  dispute(context: __compactRuntime.CircuitContext<PS>, index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  max_bids(): bigint;
  buyer_commitment(sk_0: Uint8Array): Uint8Array;
  supplier_commitment(sk_0: Uint8Array): Uint8Array;
  bid_commitment(o_0: Opening, tender_0: Uint8Array): Uint8Array;
  bid_nullifier(sk_0: Uint8Array, tender_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  max_bids(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  buyer_commitment(context: __compactRuntime.CircuitContext<PS>,
                   sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  supplier_commitment(context: __compactRuntime.CircuitContext<PS>,
                      sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  bid_commitment(context: __compactRuntime.CircuitContext<PS>,
                 o_0: Opening,
                 tender_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  bid_nullifier(context: __compactRuntime.CircuitContext<PS>,
                sk_0: Uint8Array,
                tender_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  qualify(context: __compactRuntime.CircuitContext<PS>, commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submit_bid(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  reveal_bid(context: __compactRuntime.CircuitContext<PS>,
             index_0: bigint,
             sealed_opening_0: string): __compactRuntime.CircuitResults<PS, []>;
  award(context: __compactRuntime.CircuitContext<PS>, winner_index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  accept_award(context: __compactRuntime.CircuitContext<PS>, name_0: string): __compactRuntime.CircuitResults<PS, []>;
  dispute(context: __compactRuntime.CircuitContext<PS>, index_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly title: string;
  readonly tender_id: Uint8Array;
  readonly buyer_key: Uint8Array;
  readonly ceiling: bigint;
  readonly closes_at: bigint;
  readonly reveal_until: bigint;
  readonly buyer: Uint8Array;
  suppliers: {
    isFull(): boolean;
    checkRoot(rt_0: { field: bigint }): boolean;
    root(): __compactRuntime.MerkleTreeDigest;
    firstFree(): bigint;
    pathForLeaf(index_0: bigint, leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array>;
    findPathForLeaf(leaf_0: Uint8Array): __compactRuntime.MerkleTreePath<Uint8Array> | undefined;
    history(): Iterator<__compactRuntime.MerkleTreeDigest>
  };
  qualified: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly supplier_count: bigint;
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  bids: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  readonly bid_count: bigint;
  sealed_openings: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): string;
    [Symbol.iterator](): Iterator<[bigint, string]>
  };
  included: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): boolean;
    [Symbol.iterator](): Iterator<[bigint, boolean]>
  };
  readonly awarded: boolean;
  readonly winner: bigint;
  readonly winning_amount: bigint;
  readonly accepted: boolean;
  readonly winner_name: string;
  readonly contested: boolean;
  readonly disputes: bigint;
  disputed: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
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
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               name_0: string,
               id_0: Uint8Array,
               key_0: Uint8Array,
               max_price_0: bigint,
               close_0: bigint,
               reveal_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
