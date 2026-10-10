// Minimal Node `assert` for browser builds of dependencies that call it.
function assert(value: unknown, message?: string): asserts value {
  if (!value) throw new Error(message ?? "Assertion failed");
}
assert.ok = assert;
assert.equal = (a: unknown, b: unknown, m?: string) => assert(a == b, m ?? `${a} == ${b}`);
assert.strictEqual = (a: unknown, b: unknown, m?: string) => assert(a === b, m ?? `${a} === ${b}`);
assert.notEqual = (a: unknown, b: unknown, m?: string) => assert(a != b, m ?? `${a} != ${b}`);
export default assert;
export const ok = assert;
