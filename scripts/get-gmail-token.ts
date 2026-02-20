/**
 * Run with: npx tsx scripts/get-gmail-token.ts
 *
 * Starts a temporary server on port 3000 to capture the OAuth callback,
 * then exchanges the code for a refresh token.
 */

import { google } from "googleapis";
import http from "http";

import { config } from "dotenv";
config({ path: ".env.local" });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = "http://localhost:3000/api/auth/callback/google";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/drive.file",
  ],
});

// Start temporary HTTP server to capture callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3000`);

  if (url.pathname === "/" || url.pathname === "/api/auth/callback/google") {
    const code = url.searchParams.get("code");

    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 80px auto; text-align: center;">
            <div style="background: #1f2223; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #e0ff82; margin: 0;">RASMA</h1>
            </div>
            <div style="background: #fff; padding: 32px; border: 1px solid #e5e6e6; border-radius: 0 0 12px 12px;">
              <h2 style="color: #37955b;">Gmail autorizado correctamente</h2>
              <p style="color: #415762;">Puede cerrar esta ventana.</p>
            </div>
          </div>
        `);

        console.log("\n=== SUCCESS ===\n");
        console.log("Add this to your .env.local:\n");
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log("");

        // Shutdown after a moment
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error exchanging code");
        console.error("Error:", err);
        setTimeout(() => process.exit(1), 1000);
      }
    } else {
      const error = url.searchParams.get("error");
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(`Error: ${error || "No code received"}`);
      console.error("OAuth error:", error);
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, () => {
  console.log("\n=== Google OAuth Token Generator (Gmail + Calendar + Drive) ===\n");
  console.log("Temporary server running on port 3000.\n");
  console.log("Open this URL in your browser (sign in as contacto@rasma.cl):\n");
  console.log(authUrl);
  console.log("\nWaiting for callback...\n");
});
