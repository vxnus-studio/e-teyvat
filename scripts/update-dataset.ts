import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { ARTIFACT_PATH, MANIFEST_PATH } from "../lib/teyvat/artifact.ts";
import { ingestTeyvatArtifact } from "../lib/teyvat/persistence/ingest.ts";
import { getTeyvatBannerQueries } from "../lib/teyvat/persistence/banners.ts";

async function main() {
  console.log("=================================================");
  console.log("🚀 STARTING E-TEYVAT DATA & BANNER UPDATE PIPELINE");
  console.log("=================================================\n");

  const startTime = performance.now();

  // 1. Build Teyvat Projection Artifact
  console.log("📦 STEP 1: Rebuilding Teyvat projection artifact from canonical data...");
  execSync("node --experimental-strip-types scripts/build-teyvat-artifact.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // Verify artifact exists and manifest is valid
  if (!existsSync(ARTIFACT_PATH) || !existsSync(MANIFEST_PATH)) {
    throw new Error("Artifact or manifest was not generated.");
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  console.log(`✅ Projection built successfully (Revision: ${manifest.revision.slice(0, 12)}..., Entities: ${manifest.counts.entities})\n`);

  // 2. Validate Local Engine & Domain Resolution
  console.log("🔍 STEP 2: Verifying projection domains & entity queries...");
  execSync("node --experimental-strip-types scripts/verify-teyvat-domain.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("✅ Local domain verification passed.\n");

  // 3. Database Ingestion (if DATABASE_URL is provided)
  if (process.env.DATABASE_URL) {
    console.log("🗄️  STEP 3: Ingesting projection artifact into Neon Postgres...");
    const ingestResult = await ingestTeyvatArtifact();
    console.log("✅ Ingestion complete:", ingestResult);

    // 4. Synchronize Banners & Recalculate Rerun Pressure
    console.log("\n⚔️  STEP 4: Synchronizing banner phases & rerun pressure telemetry...");
    execSync("node --experimental-strip-types scripts/sync-banners.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Banner synchronization & rerun pressure calculation complete.\n");

    // 5. Verification & Telemetry Check
    console.log("📡 STEP 5: Verifying active banner phase & health status...");
    const bannerQueries = await getTeyvatBannerQueries();
    const overview = await bannerQueries.overview();
    console.log(`Current Active Phase: ${overview.currentPhase ? overview.currentPhase.phaseKey : "None"} (Sequence: ${overview.currentPhase?.sequenceIndex ?? "N/A"})`);
    console.log(`Total Banner Phases: ${overview.phases.length}`);
    console.log(`Total Character Appearances: ${overview.appearances.length}`);
    console.log(`Total Weapon Appearances: ${overview.weaponAppearances.length}`);
  } else {
    console.log("⚠️  DATABASE_URL not detected in environment. Ingestion & database sync steps skipped.");
    console.log("    To ingest into Postgres, configure DATABASE_URL in .env.local and rerun.");
  }

  const durationSec = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log("\n=================================================");
  console.log(`🎉 DATA UPDATE PIPELINE FINISHED IN ${durationSec}s`);
  console.log("=================================================");
}

main().catch((err) => {
  console.error("❌ Update pipeline failed:", err);
  process.exit(1);
});
