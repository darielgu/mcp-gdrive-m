import express from "express";
import session from "express-session";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import { google } from "googleapis";

import {
  getAuthUrl,
  handleOAuthCallback,
  getValidCredentials,
} from "./dist/auth.js";
import prisma from "./dist/tools/prisma.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(morgan("tiny"));
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // your Vite/React dev server
    credentials: true,
  })
);
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24h
  })
);

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  console.log(Object.keys(prisma.user.fields));

  if (!email || !password) {
    return res.status(400).json({ error: "missing required fields" });
  }

  try {
    const user = await prisma.user.create({
      data: { email, password },
    });

    req.session.userId = user.id;
    const url = getAuthUrl();

    return res.json({ authUrl: url, userId: user.id });
  } catch (err) {
    console.error("Signup failed:", err); // 👈 log full error
    if (err.code === "P2002") {
      return res.status(409).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Failed to sign up", details: err.message });
  }
});

// 2. Handle Google OAuth callback
// app.get("/auth/google/callback", async (req, res) => {
//   let userId = req.session.userId;
//   const code = req.query.code;

//   if (!code)
//     return res.status(400).json({ error: "Missing authorization code" });

//   // If user doesn’t exist, create one automatically
//   if (!userId) {
//     userId = `user-${Date.now()}`;
//     req.session.userId = userId;
//     await prisma.user.create({
//       data: { id: userId, email: `${userId}@example.com` },
//     });
//   }

//   try {
//     await handleOAuthCallback(userId, code);
//     res.json({
//       message: "Google account connected successfully!",
//       userId,
//       nextSteps: "You can now use the MCP server with your Google Drive data",
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to connect Google account",
//       details: error.message,
//     });
//   }
// });
app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  const userId = req.session.userId;

  if (!code)
    return res.status(400).json({ error: "Missing authorization code" });
  if (!userId)
    return res
      .status(401)
      .json({ error: "No active session. Please sign up first." });

  try {
    await handleOAuthCallback(userId, code);
    res.json({
      message: "Google account connected successfully!",
      userId,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "OAuth callback failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}`);
});
