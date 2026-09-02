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
    console.error("❌ Error: NEON_AUTH_BASE_URL is not configured in .env.local.");
    console.log("Please check your Neon Console: Project -> Branch -> Auth -> Configuration");
    console.log("Expected format: https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth\n");
    process.exit(1);
  }

  // Ensure trailing slash is removed and /auth is properly handled
  let cleanBase = rawAuthUrl.replace(/\/$/, "");
  
  // Neon Auth Base URLs can be:
  // 1) https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth
  // 2) https://ep-xxx.auth.neon.tech
  console.log(`Configured Neon Auth Base: ${cleanBase}\n`);

  const adminEmail = await askQuestion("Enter Admin Email (e.g. admin@e-teyvat.vxnus.xyz): ");
  if (!adminEmail) {
    console.error("❌ Email is required.");
    process.exit(1);
  }

  const adminPassword = await askQuestion("Enter Admin Password: ");
  if (!adminPassword || adminPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  const name = (await askQuestion("Enter Admin Name [default: Archon Admin]: ")) || "Archon Admin";

  console.log("\nTesting endpoints on your Neon Auth server...");

  // Try both direct and sub-path variants depending on whether the user gave the root or /auth path
  const candidateUrls = [
    `${cleanBase}/sign-up/email`,
    `${cleanBase}/auth/sign-up/email`,
    `${cleanBase.replace(/\/auth$/, "")}/sign-up/email`,
    `${cleanBase.replace(/\/auth$/, "")}/auth/sign-up/email`,
    `${cleanBase}/api/v1/auth/signup`,
    `${cleanBase}/signup`,
  ];

  let success = false;
  let lastAttemptInfo: { url: string; status: number; text: string } | null = null;

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name,
          role: "admin",
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      lastAttemptInfo = { url, status: res.status, text: data.message || data.error || text || res.statusText };

      if (res.ok || res.status === 200 || res.status === 201) {
        console.log("\n✅ Admin User Successfully Provisioned in Neon Auth!");
        console.log("--------------------------------------------------");
        console.log(`• ID:       ${data.user?.id || data.id || "neon-user"}`);
        console.log(`• Name:     ${name}`);
        console.log(`• Email:    ${adminEmail}`);
        console.log(`• Role:     admin`);
        console.log(`• Endpoint: ${url}`);
        console.log("--------------------------------------------------");
        console.log("You can now sign in at: /admin/login\n");
        success = true;
        break;
      } else if (res.status === 400 && typeof lastAttemptInfo.text === "string" && lastAttemptInfo.text.toLowerCase().includes("already exists")) {
        console.log("\nℹ️  User already exists in Neon Auth with this email.");
        console.log("You can log in directly at: /admin/login\n");
        success = true;
        break;
      }
    } catch (err: any) {
      lastAttemptInfo = { url, status: 0, text: err.message || String(err) };
    }
  }

  if (!success && lastAttemptInfo) {
    console.error(`\n❌ Could not reach signup endpoint on Neon Auth.`);
    console.error(`Last Attempted URL: ${lastAttemptInfo.url}`);
    console.error(`Response (HTTP ${lastAttemptInfo.status}): ${lastAttemptInfo.text.substring(0, 120)}`);
    console.log("\n🔍 Verification Checklist:");
    console.log("1. Check Neon Console: Project -> Branch -> Auth -> Configuration.");
    console.log("2. Verify that NEON_AUTH_BASE_URL includes the exact path shown in Neon (typically ending in `/neondb/auth`).");
    console.log(`   Example: https://ep-cool-wave-123456.neonauth.us-east-1.aws.neon.tech/neondb/auth`);
    console.log("3. If email/password signup is disabled in Neon Auth configuration, enable Email Provider in the Neon Console.\n");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
