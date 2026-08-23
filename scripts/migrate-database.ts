import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { migrate } from "drizzle-orm/neon-http/migrator";
import { getDatabase } from "../db/client.ts";

await migrate(getDatabase(), { migrationsFolder: "./drizzle" });
console.log("Database migrations applied.");
