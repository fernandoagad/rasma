import * as fs from "fs";
import * as path from "path";

// Load .env.local before any other imports
const envPath = path.join(__dirname, "..", ".env.local");
const env = fs.readFileSync(envPath, "utf8");
for (const line of env.split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0 && !line.startsWith("#")) {
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();
    process.env[key] = val;
  }
}

async function main() {
  // Dynamic import after env is loaded
  const { sendTestEmail } = await import("../src/lib/email");

  console.log("Sending test email from", process.env.EMAIL_FROM, "to fernandoagad@gmail.com...");
  const ok = await sendTestEmail("fernandoagad@gmail.com");
  console.log(ok ? "Email sent successfully!" : "Failed to send email");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
