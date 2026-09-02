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
  console.log("       E-Teyvat Managed Neon Auth Provisioning     ");
  console.log("==================================================\n");

  const neonAuthUrl =
    process.env.NEON_AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL ||
    process.env.NEON_AUTH_URL ||
    process.env.NEXT_PUBLIC_NEON_AUTH_URL;

  if (!neonAuthUrl) {
    console.error("❌ Error: NEON_AUTH_BASE_URL is not configured in .env.local.");
    console.log("Please add NEON_AUTH_BASE_URL to your .env.local (e.g. https://ep-xxx.auth.neon.tech)\n");
    process.exit(1);
  }

  console.log(`Connected to Neon Auth: ${neonAuthUrl}\n`);

  const adminEmail = await askQuestion("Enter Admin Email (e.g. admin@e-teyvat.vxnus.xyz): ");
  if (!adminEmail) {
    console.error("❌ Email is required.");
    process.exit(1);
  }

  const adminPassword = await askQuestion("Enter Admin Password: ");
  if (!adminPassword || adminPassword.length < 6) {
    console.error("❌ Password must be at least 6 characters long.");
    process.exit(1);
  }

  const name = (await askQuestion("Enter Admin Name [default: Archon Admin]: ")) || "Archon Admin";

  console.log("\nProvisioning user via Neon Auth service API...");

  try {
    const res = await fetch(`${neonAuthUrl.replace(/\/$/, "")}/api/v1/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEON_AUTH_API_KEY
          ? { Authorization: `Bearer ${process.env.NEON_AUTH_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        name,
        role: "admin",
      }),
    });

    const data = await res.json();

    if (res.ok || res.status === 201) {
      console.log("\n✅ Admin User Successfully Created in Neon Auth!");
      console.log("--------------------------------------------------");
      console.log(`• ID:       ${data.id || data.user?.id || "neon-user"}`);
      console.log(`• Email:    ${adminEmail}`);
      console.log(`• Role:     admin`);
      console.log(`• Auth URL: ${neonAuthUrl}`);
      console.log("--------------------------------------------------");
      console.log("You can now sign in at /admin/login\n");
    } else {
      console.error("\n⚠️  Neon Auth API returned:", data.error || data.message || res.statusText);
      console.log("If the user already exists in Neon Auth, you can log in directly at /admin/login.\n");
    }
  } catch (err) {
    console.error("\n❌ Failed to communicate with Neon Auth service:", err);
    console.log("Check that NEON_AUTH_BASE_URL is accessible and valid.\n");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
