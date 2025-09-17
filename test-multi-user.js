#!/usr/bin/env node

/**
 * Test script for multi-user MCP Google Drive setup
 */

import fetch from "node-fetch";
import open from "open"; // <--- add this

const BASE_URL = "http://localhost:3001";
const TEST_USER_ID = "test-user-" + Date.now();

let lastAuthUrl = null;

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   GET ${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success:`, JSON.stringify(data, null, 2));

      // Capture authUrl if this is the OAuth test
      if (data.authUrl) {
        lastAuthUrl = data.authUrl;
      }

      return true;
    } else {
      console.log(`   ❌ Error:`, data);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Network Error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Multi-User MCP Google Drive Tests");
  console.log("=".repeat(50));

  let allTestsPassed = true;

  allTestsPassed &= await testEndpoint("/health", "Health check");
  allTestsPassed &= await testEndpoint(`/login/${TEST_USER_ID}`, "User login");
  allTestsPassed &= await testEndpoint(
    `/users/${TEST_USER_ID}/status`,
    "User status (before auth)"
  );
  allTestsPassed &= await testEndpoint("/users", "List all users");
  allTestsPassed &= await testEndpoint(
    `/auth/google?userId=${TEST_USER_ID}`,
    "OAuth URL generation"
  );

  console.log("\n" + "=".repeat(50));

  if (allTestsPassed) {
    console.log("🎉 All basic tests passed!");

    if (lastAuthUrl) {
      console.log(`🌐 Opening OAuth URL in browser: ${lastAuthUrl}`);
      await open(lastAuthUrl); // <-- auto-launch browser
    }

    console.log("\nNext steps:");
    console.log("1. Complete OAuth flow in the browser you just opened");
    console.log("2. Check user status again to verify authentication");
    console.log("3. Test Google Drive access with /drive/files");
    console.log("4. Use the MCP server with your userId:", TEST_USER_ID);
  } else {
    console.log("❌ Some tests failed. Please check your setup:");
    console.log("1. Make sure the web server is running: node server.js");
    console.log("2. Check your .env file configuration");
    console.log("3. Verify database connection");
  }

  console.log(`\nTest user ID: ${TEST_USER_ID}`);
  console.log("You can use this ID for testing MCP tool calls.");
}

if (typeof fetch === "undefined") {
  console.log("❌ This script requires node-fetch. Install it with:");
  console.log("   npm install node-fetch");
  process.exit(1);
}

runTests().catch(console.error);
