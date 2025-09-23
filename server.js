import express from "express";
import session from "express-session";
import {
  getAuthUrl,
  handleOAuthCallback,
  getValidCredentials,
  loadCredentialsQuietly,
} from "./dist/auth.js";
import { google } from "googleapis";
import prisma from "./dist/tools/prisma.js";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// Use sessions to store userId (for demo; use a real auth system in production)
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/login/:userId", async (req, res) => {
  const userId = req.params.userId;
  req.session.userId = userId;

  // Ensure user exists in DB
  await prisma.user.upsert({
    where: { id: userId },
    update: {}, // nothing to update right now
    create: { id: userId, email: `${userId}@example.com` }, // email is required if @unique
  });

  res.json({
    message: `Logged in as user ${userId}`,
    userId,
    sessionId: req.sessionID,
  });
});

// User management endpoints
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        tokens: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/users/:userId/status", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tokens: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hasValidTokens =
      user.tokens && user.tokens.accessToken && user.tokens.refreshToken;

    res.json({
      userId,
      hasValidTokens,
      tokenExpiry: user.tokens?.expiryDate,
      isAuthenticated: hasValidTokens,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check user status" });
  }
});

// 1. Start Google OAuth login
app.get("/auth/google", async (req, res) => {
  // Use session first, fallback to query param
  let userId = req.session.userId || req.query.userId;

  if (!userId) {
    return res.status(401).json({
      error: "Login first with /login/:userId or pass ?userId=",
    });
  }

  // Ensure user exists in DB
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: `${userId}@example.com` },
  });

  try {
    const url = getAuthUrl();

    // For test script: return JSON instead of redirect
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({ authUrl: url, userId });
    }

    // For browsers: redirect
    res.redirect(url);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate auth URL",
      details: error.message,
    });
  }
});

// 2. Handle Google OAuth callback
app.get("/auth/google/callback", async (req, res) => {
  let userId = req.session.userId;
  const code = req.query.code;

  if (!code)
    return res.status(400).json({ error: "Missing authorization code" });

  // If user doesn’t exist, create one automatically
  if (!userId) {
    userId = `user-${Date.now()}`;
    req.session.userId = userId;
    await prisma.user.create({
      data: { id: userId, email: `${userId}@example.com` },
    });
  }

  try {
    await handleOAuthCallback(userId, code);
    res.json({
      message: "Google account connected successfully!",
      userId,
      nextSteps: "You can now use the MCP server with your Google Drive data",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to connect Google account",
      details: error.message,
    });
  }
});

// 3. Test Google API access for the current user
app.get("/drive/files", async (req, res) => {
  const userId = req.session.userId;
  if (!userId)
    return res.status(401).json({ error: "Login first to set userId" });

  try {
    const client = await getValidCredentials(userId);
    const drive = google.drive({ version: "v3", auth: client });
    const files = await drive.files.list({ pageSize: 10 });
    res.json({
      userId,
      files: files.data.files,
      totalFiles: files.data.files?.length || 0,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to access Google Drive",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}`);
});
