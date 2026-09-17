import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  normalizeRecentEstimateEntries,
  removeFromRecentEstimateEntries,
  touchRecentEstimateEntries,
} from "../src/lib/recent-estimates";

describe("recent-estimates", () => {
  it("normalize filtra y ordena por lastAccessed desc", () => {
    const out = normalizeRecentEstimateEntries([
      { id: "a", lastAccessed: 10 },
      { id: "b", lastAccessed: 30 },
      { id: "a", lastAccessed: 50 },
      { id: "", lastAccessed: 1 },
      null,
    ]);
    assert.deepEqual(out, [
      { id: "b", lastAccessed: 30 },
      { id: "a", lastAccessed: 10 },
    ]);
  });

  it("touch mueve al frente y deduplica por id", () => {
    const next = touchRecentEstimateEntries(
      [
        { id: "a", lastAccessed: 10 },
        { id: "b", lastAccessed: 20 },
      ],
      "b",
      { now: 99, max: 50 }
    );
    assert.deepEqual(next, [
      { id: "b", lastAccessed: 99 },
      { id: "a", lastAccessed: 10 },
    ]);
  });

  it("remove elimina un id", () => {
    const next = removeFromRecentEstimateEntries(
      [
        { id: "a", lastAccessed: 10 },
        { id: "b", lastAccessed: 20 },
      ],
      "a"
    );
    assert.deepEqual(next, [{ id: "b", lastAccessed: 20 }]);
  });
});

