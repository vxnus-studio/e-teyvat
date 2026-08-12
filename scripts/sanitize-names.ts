import { like, or, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { entities } from "../db/schema";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

async function run() {
  console.log("🚀 Starting Name Sanitization...");
  const db = getDatabase();

  // Find all entities that have quotes in their name
  const rows = await db
    .select()
    .from(entities)
    .where(
      or(
        like(entities.name, '%"%'),
        like(entities.name, "%'%")
      )
    );

  console.log(`Found ${rows.length} entities to sanitize.`);

  let successCount = 0;
  let errorCount = 0;

  for (const entity of rows) {
    try {
      // Clean quotes from the beginning and end
      // e.g., "\"The Catch\"" -> "The Catch"
      let cleanedName = entity.name.trim();
      if (cleanedName.startsWith('"') && cleanedName.endsWith('"')) {
        cleanedName = cleanedName.substring(1, cleanedName.length - 1);
      }
      if (cleanedName.startsWith("'") && cleanedName.endsWith("'")) {
        cleanedName = cleanedName.substring(1, cleanedName.length - 1);
      }
      
      // Update Database
      if (cleanedName !== entity.name) {
        await db
          .update(entities)
          .set({ name: cleanedName })
          .where(eq(entities.id, entity.id));

        console.log(`✅ Cleaned: [${entity.kind}] ${entity.name} -> ${cleanedName}`);
        successCount++;
      }
    } catch (error) {
      console.error(`💥 Error processing [${entity.kind}] ${entity.name}:`, error);
      errorCount++;
    }
  }

  console.log("\n🎉 Sanitization Complete!");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

run().catch(console.error);
