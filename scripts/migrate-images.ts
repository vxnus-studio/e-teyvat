import { eq, isNull, and } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { entities } from "../db/schema";
import { imageFromData } from "../app/api/utils";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BATCH_SIZE = 5;
const DELAY_MS = 200;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log("🚀 Starting Image Migration to Cloudflare R2...");
  const db = getDatabase();

  // Find all active entities that don't have a custom image yet
  const rows = await db
    .select()
    .from(entities)
    .where(and(eq(entities.isActive, true), isNull(entities.customImageUrl)));

  console.log(`Found ${rows.length} entities to process.`);

  let successCount = 0;
  let missingCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (entity) => {
      try {
        const sourceUrl = imageFromData(entity.canonicalData as any);
        if (!sourceUrl) {
          console.warn(`⚠️ [${entity.kind}] ${entity.slug}: No source URL found.`);
          missingCount++;
          return;
        }

        // 1. Download image
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          console.warn(`❌ [${entity.kind}] ${entity.slug}: Failed to download (Status ${response.status}) - ${sourceUrl}`);
          missingCount++;
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Convert to AVIF
        const avifBuffer = await sharp(buffer)
          .avif({ quality: 80, effort: 4 })
          .toBuffer();

        // 3. Upload to R2
        const key = `${entity.kind}/${entity.slug}.avif`;
        await s3Client.send(
          new PutObjectCommand({
            Bucket: "eteyvat",
            Key: key,
            Body: avifBuffer,
            ContentType: "image/avif",
          })
        );

        // 4. Update Database
        await db
          .update(entities)
          .set({ customImageUrl: key })
          .where(eq(entities.id, entity.id));

        console.log(`✅ [${entity.kind}] ${entity.slug}: Uploaded successfully.`);
        successCount++;
      } catch (error) {
        console.error(`💥 [${entity.kind}] ${entity.slug}: Error processing!`, error);
        errorCount++;
      }
    }));

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < rows.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n🎉 Migration Complete!");
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⚠️ Missing/404: ${missingCount} (Upload manually via Admin)`);
  console.log(`❌ Errors: ${errorCount}`);
}

run().catch(console.error);
