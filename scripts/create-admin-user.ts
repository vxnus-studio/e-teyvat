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

  const rawAuthUrl = process.env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_URL;

  if (!rawAuthUrl) {
    console.error("❌ Error: NEON_AUTH_BASE_URL is not configured in environment or .env.local.");
    console.log("Please set NEON_AUTH_BASE_URL (e.g. https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth)\n");
    process.exit(1);
  }

  const cleanBase = rawAuthUrl.replace(/\/$/, "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  console.log(`Connected to Neon Auth Base: ${cleanBase}\n`);

  const emailInput = await askQuestion("Enter Admin Email: ");
  const adminEmail = emailInput.trim().toLowerCase();

  if (!adminEmail || !adminEmail.includes("@")) {
    console.error("❌ A valid email is required.");
    process.exit(1);
  }

  const adminPassword = await askQuestion("Enter Admin Password (min 8 chars): ");

  if (!adminPassword || adminPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  const name = (await askQuestion("Enter Admin Name [default: Archon Admin]: ")) || "Archon Admin";

  console.log("\nProvisioning admin user on Neon Managed Auth server...");

  const signupUrl = `${cleanBase}/sign-up/email`;

  try {
    const res = await fetch(signupUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": siteUrl,
      },
      body: JSON.stringify({
        name,
        email: adminEmail,
        password: adminPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok || res.status === 200 || res.status === 201) {
      console.log("\n✅ Admin User Successfully Provisioned in Neon Auth!");
      console.log("--------------------------------------------------");
      console.log(`• ID:       ${data.user?.id || "neon-user"}`);
      console.log(`• Name:     ${data.user?.name || name}`);
      console.log(`• Email:    ${data.user?.email || adminEmail}`);
      console.log(`• Auth URL: ${cleanBase}`);
      console.log("--------------------------------------------------");
      console.log("You can now sign in at: /admin/login\n");
    } else {
      const errorMsg = data.message || data.error || res.statusText;
      if (typeof errorMsg === "string" && (errorMsg.toLowerCase().includes("already exists") || res.status === 422)) {
        console.log("\nℹ️  User already registered in Neon Auth with this email.");
        console.log("--------------------------------------------------");
        console.log(`• Email:    ${adminEmail}`);
        console.log("--------------------------------------------------");
        console.log("You can sign in directly at: /admin/login\n");
      } else {
        console.error(`\n❌ Failed to create user (HTTP ${res.status}): ${errorMsg}`);
      }
    }
  } catch (err: any) {
    console.error(`\n❌ Network error contacting Neon Auth at ${signupUrl}:`, err.message);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
