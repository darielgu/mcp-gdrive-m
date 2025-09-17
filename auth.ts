import { google } from "googleapis";
import prisma from "./tools/prisma.js"; // make sure you created lib/prisma.ts

export const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

// Create OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI // must match Google Cloud redirect URI
  );
}

// Step 1: Generate login URL
export function getAuthUrl() {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // ensures refresh_token is returned
  });
}

// Step 2: Handle callback and save tokens in DB
export async function handleOAuthCallback(userId: string, code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  await prisma.userToken.upsert({
    where: { userId },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    },
  });

  client.setCredentials(tokens);
  return client;
}

// Step 3: Load credentials quietly from DB
export async function loadCredentialsQuietly(userId: string) {
  const tokens = await prisma.userToken.findUnique({ where: { userId } });
  if (!tokens) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.accessToken ?? undefined,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: tokens.expiryDate?.getTime(),
  });

  // Refresh if expiring soon
  const now = Date.now();
  const expiry = tokens.expiryDate?.getTime() ?? 0;
  if (expiry - now < 5 * 60 * 1000 && tokens.refreshToken) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await prisma.userToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token ?? tokens.accessToken,
          refreshToken: credentials.refresh_token ?? tokens.refreshToken,
          expiryDate: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : tokens.expiryDate,
        },
      });
      client.setCredentials(credentials);
    } catch (err) {
      console.error("Failed to refresh token:", err);
      return null;
    }
  }

  return client;
}

// Step 4: Get valid credentials (redirect if missing)
export async function getValidCredentials(userId: string, forceAuth = false) {
  if (!forceAuth) {
    const quietAuth = await loadCredentialsQuietly(userId);
    if (quietAuth) return quietAuth;
  }
  throw new Error("User must authenticate via Google OAuth first");
}

// Step 5: Background refresh for all users
export function setupTokenRefresh() {
  console.log("Setting up automatic token refresh interval (45 minutes)");
  return setInterval(async () => {
    try {
      const tokens = await prisma.userToken.findMany();
      for (const t of tokens) {
        const client = await loadCredentialsQuietly(t.userId);
        if (client) {
          google.options({ auth: client });
          console.log(`Refreshed token for user ${t.userId}`);
        }
      }
    } catch (err) {
      console.error("Error in automatic token refresh:", err);
    }
  }, 45 * 60 * 1000);
}
