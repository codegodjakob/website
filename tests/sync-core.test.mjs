import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const syncCore = require("../shared/sync-core.js");
const constants = require("../shared/constants.js");

function createMemoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    }
  };
}

describe("shared/sync-core", () => {
  it("collects known state keys from storage", () => {
    const keys = constants.STATE_KEYS;
    const storage = createMemoryStorage({
      [keys[0]]: JSON.stringify([{ id: "a" }]),
      [keys[1]]: JSON.stringify({ a: true })
    });
    const state = syncCore.collectState(storage, keys);
    expect(state[keys[0]][0].id).toBe("a");
    expect(state[keys[1]].a).toBe(true);
  });

  it("applies remote state only when changed", () => {
    const keys = constants.STATE_KEYS;
    const storage = createMemoryStorage({
      [keys[0]]: JSON.stringify([{ id: "a" }])
    });

    const changed = syncCore.applyState(storage, { [keys[0]]: [{ id: "b" }] }, keys);
    const unchanged = syncCore.applyState(storage, { [keys[0]]: [{ id: "b" }] }, keys);

    expect(changed).toBe(true);
    expect(unchanged).toBe(false);
    expect(JSON.parse(storage.getItem(keys[0]))[0].id).toBe("b");
  });
});
