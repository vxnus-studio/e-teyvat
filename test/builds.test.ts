import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { getTeyvatBuildQueries } from "../lib/teyvat/engine.ts";

describe("Character Build Recommendations", () => {
  const buildQueries = getTeyvatBuildQueries();

  it("should retrieve and hydrate build recommendations for Furina", async () => {
    const builds = await buildQueries.getCharacterBuilds("furina");
    assert.ok(Array.isArray(builds), "builds should be an array");
    assert.ok(builds.length > 0, "should have at least one build for furina");

    const primaryBuild = builds[0];
    assert.strictEqual(primaryBuild.characterSlug, "furina");
    assert.strictEqual(primaryBuild.role, "Off-Field Sub-DPS & Buffer");
    assert.ok(primaryBuild.isPrimary, "should be marked as primary build");

    // Verify weapon hydration
    assert.ok(primaryBuild.weapons.length > 0, "should have weapons");
    const bisWeapon = primaryBuild.weapons.find((w) => w.tier === "BiS");
    assert.ok(bisWeapon, "should have a BiS weapon");
    assert.strictEqual(bisWeapon.weaponSlug, "splendor-of-tranquil-waters");
    assert.strictEqual(bisWeapon.entity?.name, "Splendor of Tranquil Waters");
    assert.strictEqual(bisWeapon.entity?.rarity, 5);
    assert.ok(typeof bisWeapon.entity?.image === "string", "weapon entity should have an image url");

    // Verify artifact hydration
    assert.ok(primaryBuild.artifacts.length > 0, "should have artifacts");
    const bisArtifact = primaryBuild.artifacts[0];
    assert.ok(bisArtifact.sets.length > 0, "should have artifact sets");
    assert.strictEqual(bisArtifact.sets[0].artifactSlug, "golden-troupe");
    assert.strictEqual(bisArtifact.sets[0].entity?.name, "Golden Troupe");

    // Verify team recommendations
    assert.ok(primaryBuild.teams.length > 0, "should have team recommendations");
    const firstTeam = primaryBuild.teams[0];
    assert.ok(firstTeam.members.length >= 4, "team should have 4 members");
    const neuviMember = firstTeam.members.find((m) => m.characterSlug === "neuvillette");
    assert.ok(neuviMember, "team should include neuvillette");
    assert.strictEqual(neuviMember.entity?.name, "Neuvillette");

    // Verify stats and priority
    assert.ok(primaryBuild.mainStats.sands.length > 0, "should have sands recommendations");
    assert.ok(primaryBuild.substatPriority.length > 0, "should have substat priority");
    assert.ok(primaryBuild.talentPriority.length > 0, "should have talent priority");
    assert.ok(primaryBuild.rotationGuide.length > 0, "should have rotation steps");
  });

  it("should return empty array for non-existent or unconfigured character", async () => {
    const builds = await buildQueries.getCharacterBuilds("non-existent-character-slug-xyz");
    assert.deepStrictEqual(builds, []);
  });
});
