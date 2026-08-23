import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { ingestTeyvatArtifact } from "../lib/teyvat/persistence/ingest.ts";

try {
  console.log(JSON.stringify(await ingestTeyvatArtifact(), null, 2));
} catch (error) {
  const cause = error && typeof error === "object" && "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  console.error(cause instanceof Error ? cause.message : cause ?? error);
  process.exitCode = 1;
}
