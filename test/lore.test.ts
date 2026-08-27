import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getTeyvatLoreQueries } from "../lib/teyvat/engine.ts";

describe("Lore Engine", () => {
  it("should calculate overview counts correctly", async () => {
    const loreQueries = await getTeyvatLoreQueries();
    const overview = loreQueries.overview();

    assert.ok(overview.totalDocuments > 0, "Should have indexed lore documents");
    assert.ok(overview.bookVolumeCount > 0, "Should have book volumes");
    assert.ok(overview.artifactStoryCount > 0, "Should have artifact stories");
    assert.ok(overview.weaponLoreCount > 0, "Should have weapon lore");
    assert.ok(overview.monsterLoreCount > 0, "Should have monster lore");
  });

  it("should search across book volumes and return snippets", async () => {
    const loreQueries = await getTeyvatLoreQueries();
    const result = loreQueries.search({ query: "Dandelion", category: "book" });

    assert.ok(result.items.length > 0, "Should find matching book volume");
    assert.equal(result.items[0].category, "book");
    assert.ok(result.items[0].snippet.length > 0);
  });

  it("should retrieve full book volume anthology for a specific title", async () => {
    const loreQueries = await getTeyvatLoreQueries();
    const book = loreQueries.getBook("the-fox-in-the-dandelion-sea");

    assert.ok(book !== null, "Should find The Fox in the Dandelion Sea");
    assert.equal(book?.name, "The Fox in the Dandelion Sea");
    assert.ok(book?.volumes.length > 0, "Should have multi-volume content");
    assert.ok(book?.volumes[0].content.length > 0, "Volume 1 should have readable text");
  });

  it("should filter by artifact category", async () => {
    const loreQueries = await getTeyvatLoreQueries();
    const result = loreQueries.search({ category: "artifact", limit: 5 });

    assert.ok(result.items.length > 0);
    assert.ok(result.items.every((item) => item.category === "artifact"));
  });
});
