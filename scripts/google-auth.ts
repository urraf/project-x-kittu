/**
 * One-time helper to connect Google Calendar / Meet.
 *
 *   1. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (a "Desktop app" OAuth client) in .env.local
 *   2. npm run google:auth
 *   3. Sign in with the Google account that should host the sessions
 *   4. Copy the printed GOOGLE_REFRESH_TOKEN into your hosting environment
 *
 * Nothing is stored by this script; the token is only printed to your terminal.
 */
import "./load-env";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first (Google Cloud → APIs & Services → Credentials → OAuth client ID → Desktop app).");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  if (url.searchParams.get("state") !== state || !code) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Sign-in failed: ${url.searchParams.get("error") ?? "invalid response"}. Close this tab and try again.`);
    return;
  }
  const { port } = server.address() as { port: number };
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `http://127.0.0.1:${port}/callback`, grant_type: "authorization_code" }),
  });
  const json = (await tokenRes.json()) as { refresh_token?: string; error?: string; error_description?: string };
  if (!json.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Google didn't return a refresh token. See the terminal.");
    console.error("\n✗ No refresh token returned:", json.error_description ?? json.error ?? json);
    console.error("  Remove the app's access at https://myaccount.google.com/permissions and run this again.");
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("Connected. You can close this tab and return to the terminal.");
    console.log("\n✓ Google connected. Add this to your environment variables:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${json.refresh_token}\n`);
  }
  server.close();
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address() as { port: number };
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://127.0.0.1:${port}/callback`,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  console.log("Open this link in your browser and sign in with the account that will host the sessions:\n");
  console.log(auth.toString());
  console.log("\nWaiting for Google…");
});
