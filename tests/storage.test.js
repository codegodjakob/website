const { describe, it, expect } = require("vitest");
const storageUtils = require("../shared/storage.js");
const constants = require("../shared/constants.js");

function createMemoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

describe("shared/storage", () => {
  it("filters visible items using visibility map override", () => {
    const items = [
      { id: "a", enabled: true },
      { id: "b", enabled: true },
      { id: "c", enabled: false }
    ];
    const visibility = { a: true, b: false };
    const filtered = storageUtils.filterVisibleItems(items, visibility);
    expect(filtered.map((item) => item.id)).toEqual(["a"]);
  });

  it("resolves categories from modern and legacy fields", () => {
    expect(storageUtils.resolveItemCategories({ categories: ["Case Study", "Case Study", " " ] })).toEqual([
      "Case Study"
    ]);
    expect(storageUtils.resolveItemCategories({ category: "Editorial" })).toEqual(["Editorial"]);
  });

  it("migrates legacy state to versioned schema", () => {
    const keys = constants.STORAGE_KEYS;
    const memoryStorage = createMemoryStorage({
      [keys.DATA]: JSON.stringify([{ title: "Hello", category: "Work", enabled: "true" }]),
      [keys.SOCIAL]: JSON.stringify({ spotify: "spotify.com/user" })
    });

    const result = storageUtils.migrateState(memoryStorage, constants);
    expect(result.changed).toBe(true);
    expect(memoryStorage.getItem(keys.STATE_VERSION)).toBe(String(constants.CURRENT_STATE_VERSION));

    const migratedItems = JSON.parse(memoryStorage.getItem(keys.DATA));
    expect(Array.isArray(migratedItems)).toBe(true);
    expect(migratedItems[0].categories).toEqual(["Work"]);
    expect(migratedItems[0].url).toMatch(/^page\.html\?id=/);
  });
});
