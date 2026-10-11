import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_1 = __compactRuntime.CompactTypeBoolean;

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Coverage_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_3.alignment()))));
  }
  fromValue(value_0) {
    return {
      grant: _descriptor_0.fromValue(value_0),
      region: _descriptor_0.fromValue(value_0),
      category: _descriptor_0.fromValue(value_0),
      exclusive: _descriptor_1.fromValue(value_0),
      at: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.grant).concat(_descriptor_0.toValue(value_0.region).concat(_descriptor_0.toValue(value_0.category).concat(_descriptor_1.toValue(value_0.exclusive).concat(_descriptor_3.toValue(value_0.at)))));
  }
}

const _descriptor_4 = new _Coverage_0();

const _descriptor_5 = new __compactRuntime.CompactTypeVector(8, _descriptor_1);

class _Grant_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment())))))));
  }
  fromValue(value_0) {
    return {
      regions: _descriptor_5.fromValue(value_0),
      categories: _descriptor_5.fromValue(value_0),
      start: _descriptor_3.fromValue(value_0),
      end: _descriptor_3.fromValue(value_0),
      exclusive: _descriptor_1.fromValue(value_0),
      licensee: _descriptor_2.fromValue(value_0),
      terms: _descriptor_2.fromValue(value_0),
      salt: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0.regions).concat(_descriptor_5.toValue(value_0.categories).concat(_descriptor_3.toValue(value_0.start).concat(_descriptor_3.toValue(value_0.end).concat(_descriptor_1.toValue(value_0.exclusive).concat(_descriptor_2.toValue(value_0.licensee).concat(_descriptor_2.toValue(value_0.terms).concat(_descriptor_2.toValue(value_0.salt))))))));
  }
}

const _descriptor_6 = new _Grant_0();

const _descriptor_7 = __compactRuntime.CompactTypeField;

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_9 = new __compactRuntime.CompactTypeVector(16, _descriptor_6);

class _Book_0 {
  alignment() {
    return _descriptor_9.alignment().concat(_descriptor_2.alignment());
  }
  fromValue(value_0) {
    return {
      grants: _descriptor_9.fromValue(value_0),
      salt: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_9.toValue(value_0.grants).concat(_descriptor_2.toValue(value_0.salt));
  }
}

const _descriptor_10 = new _Book_0();

const _descriptor_11 = new __compactRuntime.CompactTypeVector(2, _descriptor_2);

class _Either_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_1.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_12 = new _Either_0();

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_14 = new _ContractAddress_0();

const _descriptor_15 = __compactRuntime.CompactTypeOpaqueString;

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.secret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named secret');
    }
    if (typeof(witnesses_0.my_book) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named my_book');
    }
    if (typeof(witnesses_0.keep_book) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named keep_book');
    }
    if (typeof(witnesses_0.held_grant) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named held_grant');
    }
    if (typeof(witnesses_0.current_time) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named current_time');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      book_size(context, ...args_1) {
        return { result: pureCircuits.book_size(...args_1), context };
      },
      licensor_key(context, ...args_1) {
        return { result: pureCircuits.licensor_key(...args_1), context };
      },
      licensee_key(context, ...args_1) {
        return { result: pureCircuits.licensee_key(...args_1), context };
      },
      grant_commitment(context, ...args_1) {
        return { result: pureCircuits.grant_commitment(...args_1), context };
      },
      book_commitment(context, ...args_1) {
        return { result: pureCircuits.book_commitment(...args_1), context };
      },
      well_formed(context, ...args_1) {
        return { result: pureCircuits.well_formed(...args_1), context };
      },
      clashes(context, ...args_1) {
        return { result: pureCircuits.clashes(...args_1), context };
      },
      covers(context, ...args_1) {
        return { result: pureCircuits.covers(...args_1), context };
      },
      issue: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`issue: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const g_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('issue',
                                     'argument 1 (as invoked from Typescript)',
                                     'carve.compact line 165 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(g_0) === 'object' && Array.isArray(g_0.regions) && g_0.regions.length === 8 && g_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(g_0.categories) && g_0.categories.length === 8 && g_0.categories.every((t) => typeof(t) === 'boolean') && typeof(g_0.start) === 'bigint' && g_0.start >= 0n && g_0.start <= 18446744073709551615n && typeof(g_0.end) === 'bigint' && g_0.end >= 0n && g_0.end <= 18446744073709551615n && typeof(g_0.exclusive) === 'boolean' && g_0.licensee.buffer instanceof ArrayBuffer && g_0.licensee.BYTES_PER_ELEMENT === 1 && g_0.licensee.length === 32 && g_0.terms.buffer instanceof ArrayBuffer && g_0.terms.BYTES_PER_ELEMENT === 1 && g_0.terms.length === 32 && g_0.salt.buffer instanceof ArrayBuffer && g_0.salt.BYTES_PER_ELEMENT === 1 && g_0.salt.length === 32)) {
          __compactRuntime.typeError('issue',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'carve.compact line 165 char 1',
                                     'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                     g_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_6.toValue(g_0),
            alignment: _descriptor_6.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._issue_0(context, partialProofData, g_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      accept: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`accept: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const id_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('accept',
                                     'argument 1 (as invoked from Typescript)',
                                     'carve.compact line 187 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(id_0) === 'bigint' && id_0 >= 0n && id_0 <= 255n)) {
          __compactRuntime.typeError('accept',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'carve.compact line 187 char 1',
                                     'Uint<0..256>',
                                     id_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(id_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._accept_0(context, partialProofData, id_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      prove_rights: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`prove_rights: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const id_0 = args_1[1];
        const region_0 = args_1[2];
        const category_0 = args_1[3];
        const check_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('prove_rights',
                                     'argument 1 (as invoked from Typescript)',
                                     'carve.compact line 197 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(id_0) === 'bigint' && id_0 >= 0n && id_0 <= 255n)) {
          __compactRuntime.typeError('prove_rights',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'carve.compact line 197 char 1',
                                     'Uint<0..256>',
                                     id_0)
        }
        if (!(typeof(region_0) === 'bigint' && region_0 >= 0n && region_0 <= 255n)) {
          __compactRuntime.typeError('prove_rights',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'carve.compact line 197 char 1',
                                     'Uint<0..256>',
                                     region_0)
        }
        if (!(typeof(category_0) === 'bigint' && category_0 >= 0n && category_0 <= 255n)) {
          __compactRuntime.typeError('prove_rights',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'carve.compact line 197 char 1',
                                     'Uint<0..256>',
                                     category_0)
        }
        if (!(check_0.buffer instanceof ArrayBuffer && check_0.BYTES_PER_ELEMENT === 1 && check_0.length === 32)) {
          __compactRuntime.typeError('prove_rights',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'carve.compact line 197 char 1',
                                     'Bytes<32>',
                                     check_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(id_0).concat(_descriptor_0.toValue(region_0).concat(_descriptor_0.toValue(category_0).concat(_descriptor_2.toValue(check_0)))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._prove_rights_0(context,
                                              partialProofData,
                                              id_0,
                                              region_0,
                                              category_0,
                                              check_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      issue: this.circuits.issue,
      accept: this.circuits.accept,
      prove_rights: this.circuits.prove_rights
    };
    this.provableCircuits = {
      issue: this.circuits.issue,
      accept: this.circuits.accept,
      prove_rights: this.circuits.prove_rights
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const name_0 = args_0[1];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('issue', new __compactRuntime.ContractOperation());
    state_0.setOperation('accept', new __compactRuntime.ContractOperation());
    state_0.setOperation('prove_rights', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(''),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(1n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(2n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(3n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(4n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(5n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(6n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_15.toValue(name_0),
                                                                                              alignment: _descriptor_15.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = this._licensor_key_0(this._secret_0(context, partialProofData));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(1n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = this._book_commitment_0(this._my_book_0(context,
                                                          partialProofData));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(2n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_1),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _blockTimeLt_0(context, partialProofData, time_0) {
    return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                     partialProofData,
                                                                     [
                                                                      { dup: { n: 2 } },
                                                                      { idx: { cached: true,
                                                                               pushPath: false,
                                                                               path: [
                                                                                      { tag: 'value',
                                                                                        value: { value: _descriptor_0.toValue(2n),
                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                      { push: { storage: false,
                                                                                value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(time_0),
                                                                                                                             alignment: _descriptor_3.alignment() }).encode() } },
                                                                      'lt',
                                                                      { popeq: { cached: true,
                                                                                 result: undefined } }]).value);
  }
  _blockTimeGte_0(context, partialProofData, time_0) {
    return !this._blockTimeLt_0(context, partialProofData, time_0);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_10, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_11, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_6, value_0);
    return result_0;
  }
  _book_size_0() { return 16n; }
  _secret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.secret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('secret',
                                 'return value',
                                 'carve.compact line 69 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _my_book_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.my_book(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && Array.isArray(result_0.grants) && result_0.grants.length === 16 && result_0.grants.every((t) => typeof(t) === 'object' && Array.isArray(t.regions) && t.regions.length === 8 && t.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(t.categories) && t.categories.length === 8 && t.categories.every((t) => typeof(t) === 'boolean') && typeof(t.start) === 'bigint' && t.start >= 0n && t.start <= 18446744073709551615n && typeof(t.end) === 'bigint' && t.end >= 0n && t.end <= 18446744073709551615n && typeof(t.exclusive) === 'boolean' && t.licensee.buffer instanceof ArrayBuffer && t.licensee.BYTES_PER_ELEMENT === 1 && t.licensee.length === 32 && t.terms.buffer instanceof ArrayBuffer && t.terms.BYTES_PER_ELEMENT === 1 && t.terms.length === 32 && t.salt.buffer instanceof ArrayBuffer && t.salt.BYTES_PER_ELEMENT === 1 && t.salt.length === 32) && result_0.salt.buffer instanceof ArrayBuffer && result_0.salt.BYTES_PER_ELEMENT === 1 && result_0.salt.length === 32)) {
      __compactRuntime.typeError('my_book',
                                 'return value',
                                 'carve.compact line 70 char 1',
                                 'struct Book<grants: Vector<16, struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>>, salt: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_10.toValue(result_0),
      alignment: _descriptor_10.alignment()
    });
    return result_0;
  }
  _keep_book_0(context, partialProofData, b_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.keep_book(witnessContext_0,
                                                                    b_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 0 )) {
      __compactRuntime.typeError('keep_book',
                                 'return value',
                                 'carve.compact line 71 char 1',
                                 '[]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _held_grant_0(context, partialProofData, id_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.held_grant(witnessContext_0,
                                                                     id_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'object' && Array.isArray(result_0.regions) && result_0.regions.length === 8 && result_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(result_0.categories) && result_0.categories.length === 8 && result_0.categories.every((t) => typeof(t) === 'boolean') && typeof(result_0.start) === 'bigint' && result_0.start >= 0n && result_0.start <= 18446744073709551615n && typeof(result_0.end) === 'bigint' && result_0.end >= 0n && result_0.end <= 18446744073709551615n && typeof(result_0.exclusive) === 'boolean' && result_0.licensee.buffer instanceof ArrayBuffer && result_0.licensee.BYTES_PER_ELEMENT === 1 && result_0.licensee.length === 32 && result_0.terms.buffer instanceof ArrayBuffer && result_0.terms.BYTES_PER_ELEMENT === 1 && result_0.terms.length === 32 && result_0.salt.buffer instanceof ArrayBuffer && result_0.salt.BYTES_PER_ELEMENT === 1 && result_0.salt.length === 32)) {
      __compactRuntime.typeError('held_grant',
                                 'return value',
                                 'carve.compact line 72 char 1',
                                 'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _current_time_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.current_time(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('current_time',
                                 'return value',
                                 'carve.compact line 73 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_3.toValue(result_0),
      alignment: _descriptor_3.alignment()
    });
    return result_0;
  }
  _licensor_key_0(sk_0) {
    return this._persistentHash_0([new Uint8Array([99, 97, 114, 118, 101, 58, 108, 105, 99, 101, 110, 115, 111, 114, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0]);
  }
  _licensee_key_0(sk_0) {
    return this._persistentHash_0([new Uint8Array([99, 97, 114, 118, 101, 58, 108, 105, 99, 101, 110, 115, 101, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   sk_0]);
  }
  _grant_commitment_0(g_0) {
    return this._persistentHash_0([new Uint8Array([99, 97, 114, 118, 101, 58, 103, 114, 97, 110, 116, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   this._persistentHash_1(g_0)]);
  }
  _book_commitment_0(b_0) { return this._transientHash_0(b_0); }
  _some_0(v_0) {
    return v_0[0] || v_0[1] || v_0[2] || v_0[3] || v_0[4] || v_0[5] || v_0[6]
           ||
           v_0[7];
  }
  _shared_0(a_0, b_0) {
    return a_0[0] && b_0[0] || a_0[1] && b_0[1] || a_0[2] && b_0[2]
           ||
           a_0[3] && b_0[3]
           ||
           a_0[4] && b_0[4]
           ||
           a_0[5] && b_0[5]
           ||
           a_0[6] && b_0[6]
           ||
           a_0[7] && b_0[7];
  }
  _has_0(v_0, k_0) {
    return this._equal_0(k_0, 0n) && v_0[0] || this._equal_1(k_0, 1n) && v_0[1]
           ||
           this._equal_2(k_0, 2n) && v_0[2]
           ||
           this._equal_3(k_0, 3n) && v_0[3]
           ||
           this._equal_4(k_0, 4n) && v_0[4]
           ||
           this._equal_5(k_0, 5n) && v_0[5]
           ||
           this._equal_6(k_0, 6n) && v_0[6]
           ||
           this._equal_7(k_0, 7n) && v_0[7];
  }
  _well_formed_0(g_0) {
    let t_0;
    return (t_0 = g_0.start, t_0 < g_0.end) && this._some_0(g_0.regions)
           &&
           this._some_0(g_0.categories);
  }
  _clashes_0(a_0, b_0) {
    let t_0, t_1;
    return (a_0.exclusive || b_0.exclusive) && (t_1 = a_0.start, t_1 < b_0.end)
           &&
           (t_0 = b_0.start, t_0 < a_0.end)
           &&
           this._shared_0(a_0.regions, b_0.regions)
           &&
           this._shared_0(a_0.categories, b_0.categories);
  }
  _covers_0(g_0, region_0, category_0, t_0) {
    let t_1;
    return this._has_0(g_0.regions, region_0)
           &&
           this._has_0(g_0.categories, category_0)
           &&
           (t_1 = g_0.start, t_1 <= t_0)
           &&
           t_0 < g_0.end;
  }
  _place_0(v_0, n_0, g_0) {
    return [this._equal_22(n_0, 0n) ? g_0 : v_0[0],
            this._equal_23(n_0, 1n) ? g_0 : v_0[1],
            this._equal_20(n_0, 2n) ? g_0 : v_0[2],
            this._equal_21(n_0, 3n) ? g_0 : v_0[3],
            this._equal_18(n_0, 4n) ? g_0 : v_0[4],
            this._equal_19(n_0, 5n) ? g_0 : v_0[5],
            this._equal_16(n_0, 6n) ? g_0 : v_0[6],
            this._equal_17(n_0, 7n) ? g_0 : v_0[7],
            this._equal_14(n_0, 8n) ? g_0 : v_0[8],
            this._equal_15(n_0, 9n) ? g_0 : v_0[9],
            this._equal_12(n_0, 10n) ? g_0 : v_0[10],
            this._equal_13(n_0, 11n) ? g_0 : v_0[11],
            this._equal_10(n_0, 12n) ? g_0 : v_0[12],
            this._equal_11(n_0, 13n) ? g_0 : v_0[13],
            this._equal_8(n_0, 14n) ? g_0 : v_0[14],
            this._equal_9(n_0, 15n) ? g_0 : v_0[15]];
  }
  _now_0(context, partialProofData) {
    const t_0 = this._current_time_0(context, partialProofData);
    __compactRuntime.assert(this._blockTimeGte_0(context, partialProofData, t_0),
                            'Clock is ahead of the chain');
    __compactRuntime.assert(this._blockTimeLt_0(context,
                                                partialProofData,
                                                ((t1) => {
                                                  if (t1 > 18446744073709551615n) {
                                                    throw new __compactRuntime.CompactError('carve.compact line 139 char 22: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                                  }
                                                  return t1;
                                                })(t_0 + 1800n)),
                            'Clock is behind the chain');
    return t_0;
  }
  _holding_0(context, partialProofData, id_0) {
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_0.toValue(4n),
                                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'There is no grant with that number');
    const g_0 = this._held_grant_0(context, partialProofData, id_0);
    __compactRuntime.assert(this._equal_24(this._grant_commitment_0(g_0),
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_0.toValue(4n),
                                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_0.toValue(id_0),
                                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'These are not the terms that were issued');
    __compactRuntime.assert(this._equal_25(g_0.licensee,
                                           this._licensee_key_0(this._secret_0(context,
                                                                               partialProofData))),
                            'This grant names a different licensee');
    return g_0;
  }
  _issue_0(context, partialProofData, g_0) {
    __compactRuntime.assert(this._equal_26(this._licensor_key_0(this._secret_0(context,
                                                                               partialProofData)),
                                           _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                     partialProofData,
                                                                                                     [
                                                                                                      { dup: { n: 0 } },
                                                                                                      { idx: { cached: false,
                                                                                                               pushPath: false,
                                                                                                               path: [
                                                                                                                      { tag: 'value',
                                                                                                                        value: { value: _descriptor_0.toValue(1n),
                                                                                                                                 alignment: _descriptor_0.alignment() } }] } },
                                                                                                      { popeq: { cached: false,
                                                                                                                 result: undefined } }]).value)),
                            'Only the licensor can issue grants');
    const old_0 = this._my_book_0(context, partialProofData);
    __compactRuntime.assert(this._book_commitment_0(old_0)
                            ===
                            _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_0.toValue(2n),
                                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'The book on this device is not the one on the ledger');
    const n_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(3n),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(n_0 < this._book_size_0(), 'This book is full');
    __compactRuntime.assert(this._well_formed_0(g_0),
                            'A grant needs a region, a category and an end after its start');
    this._folder_0(context,
                   partialProofData,
                   ((context, partialProofData, t_0, i_0) =>
                    {
                      if (i_0 < n_0) {
                        __compactRuntime.assert(!this._clashes_0(old_0.grants[i_0],
                                                                 g_0),
                                                'Overlaps an exclusive grant already issued');
                      }
                      return t_0;
                    }),
                   [],
                   [0n,
                    1n,
                    2n,
                    3n,
                    4n,
                    5n,
                    6n,
                    7n,
                    8n,
                    9n,
                    10n,
                    11n,
                    12n,
                    13n,
                    14n,
                    15n]);
    const k_0 = ((t1) => {
                  if (t1 > 255n) {
                    throw new __compactRuntime.CompactError('carve.compact line 177 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 255');
                  }
                  return t1;
                })(n_0);
    const next_0 = { grants: this._place_0(old_0.grants, k_0, g_0),
                     salt: old_0.salt };
    this._keep_book_0(context, partialProofData, next_0);
    const tmp_0 = this._book_commitment_0(next_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(2n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(tmp_0),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = this._grant_commitment_0(g_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(4n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(k_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_1),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_2 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(3n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_8.toValue(tmp_2),
                                                                alignment: _descriptor_8.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _accept_0(context, partialProofData, id_0) {
    const k_0 = id_0;
    this._holding_0(context, partialProofData, k_0);
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_0.toValue(5n),
                                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(k_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'This grant is already accepted');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(5n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(k_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _prove_rights_0(context, partialProofData, id_0, region_0, category_0, check_0)
  {
    const k_0 = id_0;
    const r_0 = region_0;
    const c_0 = category_0;
    const q_0 = check_0;
    const g_0 = this._holding_0(context, partialProofData, k_0);
    __compactRuntime.assert(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_0.toValue(5n),
                                                                                                                  alignment: _descriptor_0.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(k_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'Accept the grant before using it');
    __compactRuntime.assert(!_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_0.toValue(6n),
                                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(q_0),
                                                                                                                                               alignment: _descriptor_2.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'This check has already been answered');
    const t_0 = this._now_0(context, partialProofData);
    __compactRuntime.assert(this._covers_0(g_0, r_0, c_0, t_0),
                            'That grant does not cover this region and category today');
    const tmp_0 = { grant: k_0,
                    region: r_0,
                    category: c_0,
                    exclusive: g_0.exclusive,
                    at: t_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_0.toValue(6n),
                                                                  alignment: _descriptor_0.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(q_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(tmp_0),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_17(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_18(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_20(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_21(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_22(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_23(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_24(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_25(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_26(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _folder_0(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 16; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get title() {
      return _descriptor_15.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_0.toValue(0n),
                                                                                                    alignment: _descriptor_0.alignment() } }] } },
                                                                         { popeq: { cached: false,
                                                                                    result: undefined } }]).value);
    },
    get licensor() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(1n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get book() {
      return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(2n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get issued() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_0.toValue(3n),
                                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    grants: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(4n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(4n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 255n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'carve.compact line 63 char 1',
                                     'Uint<0..256>',
                                     key_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(4n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 255n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'carve.compact line 63 char 1',
                                     'Uint<0..256>',
                                     key_0)
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(4n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[4];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    accepted: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(5n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(5n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const elem_0 = args_0[0];
        if (!(typeof(elem_0) === 'bigint' && elem_0 >= 0n && elem_0 <= 255n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'carve.compact line 64 char 1',
                                     'Uint<0..256>',
                                     elem_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(5n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(elem_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return self_0.asMap().keys().map((elem) => _descriptor_0.fromValue(elem.value))[Symbol.iterator]();
      }
    },
    checks: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(6n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                                                                 alignment: _descriptor_3.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(6n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'carve.compact line 66 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(6n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(key_0),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'carve.compact line 66 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(6n),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_2.toValue(key_0),
                                                                                                     alignment: _descriptor_2.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[6];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_2.fromValue(key.value),      _descriptor_4.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  secret: (...args) => undefined,
  my_book: (...args) => undefined,
  keep_book: (...args) => undefined,
  held_grant: (...args) => undefined,
  current_time: (...args) => undefined
});
export const pureCircuits = {
  book_size: (...args_0) => {
    if (args_0.length !== 0) {
      throw new __compactRuntime.CompactError(`book_size: expected 0 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    return _dummyContract._book_size_0();
  },
  licensor_key: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`licensor_key: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('licensor_key',
                                 'argument 1',
                                 'carve.compact line 76 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    return _dummyContract._licensor_key_0(sk_0);
  },
  licensee_key: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`licensee_key: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('licensee_key',
                                 'argument 1',
                                 'carve.compact line 80 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    return _dummyContract._licensee_key_0(sk_0);
  },
  grant_commitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`grant_commitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const g_0 = args_0[0];
    if (!(typeof(g_0) === 'object' && Array.isArray(g_0.regions) && g_0.regions.length === 8 && g_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(g_0.categories) && g_0.categories.length === 8 && g_0.categories.every((t) => typeof(t) === 'boolean') && typeof(g_0.start) === 'bigint' && g_0.start >= 0n && g_0.start <= 18446744073709551615n && typeof(g_0.end) === 'bigint' && g_0.end >= 0n && g_0.end <= 18446744073709551615n && typeof(g_0.exclusive) === 'boolean' && g_0.licensee.buffer instanceof ArrayBuffer && g_0.licensee.BYTES_PER_ELEMENT === 1 && g_0.licensee.length === 32 && g_0.terms.buffer instanceof ArrayBuffer && g_0.terms.BYTES_PER_ELEMENT === 1 && g_0.terms.length === 32 && g_0.salt.buffer instanceof ArrayBuffer && g_0.salt.BYTES_PER_ELEMENT === 1 && g_0.salt.length === 32)) {
      __compactRuntime.typeError('grant_commitment',
                                 'argument 1',
                                 'carve.compact line 84 char 1',
                                 'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                 g_0)
    }
    return _dummyContract._grant_commitment_0(g_0);
  },
  book_commitment: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`book_commitment: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const b_0 = args_0[0];
    if (!(typeof(b_0) === 'object' && Array.isArray(b_0.grants) && b_0.grants.length === 16 && b_0.grants.every((t) => typeof(t) === 'object' && Array.isArray(t.regions) && t.regions.length === 8 && t.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(t.categories) && t.categories.length === 8 && t.categories.every((t) => typeof(t) === 'boolean') && typeof(t.start) === 'bigint' && t.start >= 0n && t.start <= 18446744073709551615n && typeof(t.end) === 'bigint' && t.end >= 0n && t.end <= 18446744073709551615n && typeof(t.exclusive) === 'boolean' && t.licensee.buffer instanceof ArrayBuffer && t.licensee.BYTES_PER_ELEMENT === 1 && t.licensee.length === 32 && t.terms.buffer instanceof ArrayBuffer && t.terms.BYTES_PER_ELEMENT === 1 && t.terms.length === 32 && t.salt.buffer instanceof ArrayBuffer && t.salt.BYTES_PER_ELEMENT === 1 && t.salt.length === 32) && b_0.salt.buffer instanceof ArrayBuffer && b_0.salt.BYTES_PER_ELEMENT === 1 && b_0.salt.length === 32)) {
      __compactRuntime.typeError('book_commitment',
                                 'argument 1',
                                 'carve.compact line 91 char 1',
                                 'struct Book<grants: Vector<16, struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>>, salt: Bytes<32>>',
                                 b_0)
    }
    return _dummyContract._book_commitment_0(b_0);
  },
  well_formed: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`well_formed: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const g_0 = args_0[0];
    if (!(typeof(g_0) === 'object' && Array.isArray(g_0.regions) && g_0.regions.length === 8 && g_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(g_0.categories) && g_0.categories.length === 8 && g_0.categories.every((t) => typeof(t) === 'boolean') && typeof(g_0.start) === 'bigint' && g_0.start >= 0n && g_0.start <= 18446744073709551615n && typeof(g_0.end) === 'bigint' && g_0.end >= 0n && g_0.end <= 18446744073709551615n && typeof(g_0.exclusive) === 'boolean' && g_0.licensee.buffer instanceof ArrayBuffer && g_0.licensee.BYTES_PER_ELEMENT === 1 && g_0.licensee.length === 32 && g_0.terms.buffer instanceof ArrayBuffer && g_0.terms.BYTES_PER_ELEMENT === 1 && g_0.terms.length === 32 && g_0.salt.buffer instanceof ArrayBuffer && g_0.salt.BYTES_PER_ELEMENT === 1 && g_0.salt.length === 32)) {
      __compactRuntime.typeError('well_formed',
                                 'argument 1',
                                 'carve.compact line 110 char 1',
                                 'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                 g_0)
    }
    return _dummyContract._well_formed_0(g_0);
  },
  clashes: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`clashes: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const a_0 = args_0[0];
    const b_0 = args_0[1];
    if (!(typeof(a_0) === 'object' && Array.isArray(a_0.regions) && a_0.regions.length === 8 && a_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(a_0.categories) && a_0.categories.length === 8 && a_0.categories.every((t) => typeof(t) === 'boolean') && typeof(a_0.start) === 'bigint' && a_0.start >= 0n && a_0.start <= 18446744073709551615n && typeof(a_0.end) === 'bigint' && a_0.end >= 0n && a_0.end <= 18446744073709551615n && typeof(a_0.exclusive) === 'boolean' && a_0.licensee.buffer instanceof ArrayBuffer && a_0.licensee.BYTES_PER_ELEMENT === 1 && a_0.licensee.length === 32 && a_0.terms.buffer instanceof ArrayBuffer && a_0.terms.BYTES_PER_ELEMENT === 1 && a_0.terms.length === 32 && a_0.salt.buffer instanceof ArrayBuffer && a_0.salt.BYTES_PER_ELEMENT === 1 && a_0.salt.length === 32)) {
      __compactRuntime.typeError('clashes',
                                 'argument 1',
                                 'carve.compact line 116 char 1',
                                 'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                 a_0)
    }
    if (!(typeof(b_0) === 'object' && Array.isArray(b_0.regions) && b_0.regions.length === 8 && b_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(b_0.categories) && b_0.categories.length === 8 && b_0.categories.every((t) => typeof(t) === 'boolean') && typeof(b_0.start) === 'bigint' && b_0.start >= 0n && b_0.start <= 18446744073709551615n && typeof(b_0.end) === 'bigint' && b_0.end >= 0n && b_0.end <= 18446744073709551615n && typeof(b_0.exclusive) === 'boolean' && b_0.licensee.buffer instanceof ArrayBuffer && b_0.licensee.BYTES_PER_ELEMENT === 1 && b_0.licensee.length === 32 && b_0.terms.buffer instanceof ArrayBuffer && b_0.terms.BYTES_PER_ELEMENT === 1 && b_0.terms.length === 32 && b_0.salt.buffer instanceof ArrayBuffer && b_0.salt.BYTES_PER_ELEMENT === 1 && b_0.salt.length === 32)) {
      __compactRuntime.typeError('clashes',
                                 'argument 2',
                                 'carve.compact line 116 char 1',
                                 'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                 b_0)
    }
    return _dummyContract._clashes_0(a_0, b_0);
  },
  covers: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`covers: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const g_0 = args_0[0];
    const region_0 = args_0[1];
    const category_0 = args_0[2];
    const t_0 = args_0[3];
    if (!(typeof(g_0) === 'object' && Array.isArray(g_0.regions) && g_0.regions.length === 8 && g_0.regions.every((t) => typeof(t) === 'boolean') && Array.isArray(g_0.categories) && g_0.categories.length === 8 && g_0.categories.every((t) => typeof(t) === 'boolean') && typeof(g_0.start) === 'bigint' && g_0.start >= 0n && g_0.start <= 18446744073709551615n && typeof(g_0.end) === 'bigint' && g_0.end >= 0n && g_0.end <= 18446744073709551615n && typeof(g_0.exclusive) === 'boolean' && g_0.licensee.buffer instanceof ArrayBuffer && g_0.licensee.BYTES_PER_ELEMENT === 1 && g_0.licensee.length === 32 && g_0.terms.buffer instanceof ArrayBuffer && g_0.terms.BYTES_PER_ELEMENT === 1 && g_0.terms.length === 32 && g_0.salt.buffer instanceof ArrayBuffer && g_0.salt.BYTES_PER_ELEMENT === 1 && g_0.salt.length === 32)) {
      __compactRuntime.typeError('covers',
                                 'argument 1',
                                 'carve.compact line 122 char 1',
                                 'struct Grant<regions: Vector<8, Boolean>, categories: Vector<8, Boolean>, start: Uint<0..18446744073709551616>, end: Uint<0..18446744073709551616>, exclusive: Boolean, licensee: Bytes<32>, terms: Bytes<32>, salt: Bytes<32>>',
                                 g_0)
    }
    if (!(typeof(region_0) === 'bigint' && region_0 >= 0n && region_0 <= 255n)) {
      __compactRuntime.typeError('covers',
                                 'argument 2',
                                 'carve.compact line 122 char 1',
                                 'Uint<0..256>',
                                 region_0)
    }
    if (!(typeof(category_0) === 'bigint' && category_0 >= 0n && category_0 <= 255n)) {
      __compactRuntime.typeError('covers',
                                 'argument 3',
                                 'carve.compact line 122 char 1',
                                 'Uint<0..256>',
                                 category_0)
    }
    if (!(typeof(t_0) === 'bigint' && t_0 >= 0n && t_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('covers',
                                 'argument 4',
                                 'carve.compact line 122 char 1',
                                 'Uint<0..18446744073709551616>',
                                 t_0)
    }
    return _dummyContract._covers_0(g_0, region_0, category_0, t_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
