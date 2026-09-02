import { config } from "dotenv";
config({ path: ".env.local" });
config();

import readline from "node:readline";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  console.log("==================================================");
  console.log("     E-Teyvat Managed Neon Auth Provisioning       ");
  console.log("==================================================\n");

  const neonAuthUrl = process.env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_URL;

  if (!neonAuthUrl) {
    console.error("❌ Error: NEON_AUTH_BASE_URL is not configured in .env.local.");
    console.log("Please add NEON_AUTH_BASE_URL to your .env.local (e.g. https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth)\n");
    process.exit(1);
  }

  const baseUrl = neonAuthUrl.replace(/\/$/, "");
  console.log(`Connected to Neon Auth Base: ${baseUrl}\n`);

  const adminEmail = await askQuestion("Enter Admin Email (e.g. admin@e-teyvat.vxnus.xyz): ");
  if (!adminEmail) {
    console.error("❌ Email is required.");
    process.exit(1);
  }

  const adminPassword = await askQuestion("Enter Admin Password: ");
  if (!adminPassword || adminPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters long for Neon Auth.");
    process.exit(1);
  }

  const name = (await askQuestion("Enter Admin Name [default: Archon Admin]: ")) || "Archon Admin";

  console.log("\nProvisioning admin user on Neon Managed Auth server...");

  // Standard Better Auth endpoints supported by Neon Auth:
  // 1. /sign-up/email (Standard Better Auth)
  // 2. /api/v1/auth/signup (Neon REST API)
  const candidateEndpoints = [
    { url: `${baseUrl}/sign-up/email`, body: { email: adminEmail, password: adminPassword, name, role: "admin" } },
    { url: `${baseUrl}/api/v1/auth/signup`, body: { email: adminEmail, password: adminPassword, name, role: "admin" } },
    { url: `${baseUrl}/signup`, body: { email: adminEmail, password: adminPassword, name, role: "admin" } },
  ];

  let success = false;
  let lastError = "";

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(endpoint.body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok || res.status === 200 || res.status === 201) {
        console.log("\n✅ Admin User Successfully Provisioned in Neon Auth!");
        console.log("--------------------------------------------------");
        console.log(`• ID:       ${data.user?.id || data.id || "neon-user"}`);
        console.log(`• Name:     ${name}`);
        console.log(`• Email:    ${adminEmail}`);
        console.log(`• Role:     admin`);
        console.log(`• Auth URL: ${baseUrl}`);
        console.log("--------------------------------------------------");
        console.log("You can now log in at: /admin/login\n");
        success = true;
        break;
      } else {
        lastError = data.message || data.error || res.statusText || `HTTP ${res.status}`;
        // If user already exists
        if (typeof lastError === "string" && lastError.toLowerCase().includes("already exists")) {
          console.log("\nℹ️  User already registered in Neon Auth with this email.");
          console.log("You can directly sign in at /admin/login\n");
          success = true;
          break;
        }
      }
    } catch (err: any) {
      lastError = err.message || String(err);
    }
  }

  if (!success) {
    console.error(`\n⚠️  Could not provision user via Neon Auth endpoints.`);
    console.error(`Reason: ${lastError}`);
    console.log("\nTroubleshooting tips:");
    console.log("1. Verify NEON_AUTH_BASE_URL in .env.local matches your Neon Console configuration.");
    console.log("2. Ensure Managed Auth is enabled on your Neon branch under Auth -> Configuration.");
    console.log("3. If you signed up via the Neon Web UI, you can sign in directly at /admin/login.\n");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
