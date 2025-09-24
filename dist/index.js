#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import { getValidCredentials, setupTokenRefresh, loadCredentialsQuietly, } from "./auth.js";
import { tools } from "./tools/index.js";
const drive = google.drive("v3");
const server = new Server({
    name: "example-servers/gdrive",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {
            schemes: ["gdrive"], // Declare that we handle gdrive:/// URIs
            listable: true, // Support listing available resources
            readable: true, // Support reading resource contents
        },
        tools: {},
    },
});
// Ensure we have valid credentials before making API calls
async function ensureAuth(userId) {
    const auth = await getValidCredentials(userId);
    google.options({ auth });
    return auth;
}
async function ensureAuthQuietly(userId) {
    const auth = await loadCredentialsQuietly(userId);
    if (auth) {
        google.options({ auth });
    }
    return auth;
}
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
    const userId = typeof request.params?.userId === "string"
        ? request.params.userId
        : undefined;
    if (!userId)
        throw new Error("Missing userId in request");
    await ensureAuthQuietly(userId);
    const pageSize = 10;
    const params = {
        pageSize,
        fields: "nextPageToken, files(id, name, mimeType)",
    };
    if (request.params?.cursor) {
        params.pageToken = request.params.cursor;
    }
    const res = await drive.files.list(params);
    const files = res.data.files;
    return {
        resources: files.map((file) => ({
            uri: `gdrive:///${file.id}`,
            mimeType: file.mimeType,
            name: file.name,
        })),
        nextCursor: res.data.nextPageToken,
    };
});
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const userId = typeof request.params?.userId === "string"
        ? request.params.userId
        : undefined;
    if (!userId)
        throw new Error("Missing userId in request");
    await ensureAuthQuietly(userId);
    const fileId = request.params.uri.replace("gdrive:///", "");
    const readFileTool = tools[1]; // gdrive_read_file is the second tool
    const result = await readFileTool.handler({ fileId, userId });
    // Extract the file contents from the tool response
    const fileContents = result.content[0].text.split("\n\n")[1]; // Skip the "Contents of file:" prefix
    return {
        contents: [
            {
                uri: request.params.uri,
                mimeType: "text/plain", // You might want to determine this dynamically
                text: fileContents,
            },
        ],
    };
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
        })),
    };
});
// Helper function to convert internal tool response to SDK format
function convertToolResponse(response) {
    return {
        _meta: {},
        content: response.content,
        isError: response.isError,
    };
}
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Get userId from tool arguments instead of request params
    const userId = typeof request.params?.arguments?.userId === "string"
        ? request.params.arguments.userId
        : undefined;
    if (!userId)
        throw new Error("Missing userId in request");
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
        throw new Error("Tool not found");
    }
    // Use the arguments directly (userId is already included)
    const toolArgs = request.params.arguments;
    const result = await tool.handler(toolArgs);
    return convertToolResponse(result);
});
async function startServer() {
    try {
        console.error("Starting server");
        // Remove forced authentication at startup (multi-user: auth per request)
        const transport = new StdioServerTransport();
        await server.connect(transport);
        // Set up periodic token refresh for all users
        setupTokenRefresh();
    }
    catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}
// Start server immediately
startServer().catch(console.error);
