# Google Drive MCP Server (Multi-User)

This MCP server integrates with Google Drive to allow listing, reading, and searching files, as well as the ability to read and write to Google Sheets. **This version supports multiple users** with individual authentication and token management.

This project includes code originally developed by Anthropic, PBC, licensed under the MIT License from [this repo](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive).

## 🚀 Multi-User Features

- **Individual Authentication**: Each user has their own Google OAuth tokens
- **Database Storage**: User tokens are securely stored in PostgreSQL
- **Session Management**: Web-based OAuth flow with session support
- **Token Refresh**: Automatic token refresh for all users
- **User Management**: API endpoints for user status and management
- **Isolated Access**: Each user only accesses their own Google Drive/Sheets data

## Components

### Tools

- **gdrive_search**

  - **Description**: Search for files in Google Drive.
  - **Input**:
    - `userId` (string): User ID for authentication.
    - `query` (string): Search query.
    - `pageToken` (string, optional): Token for the next page of results.
    - `pageSize` (number, optional): Number of results per page (max 100).
  - **Output**: Returns file names and MIME types of matching files.

- **gdrive_read_file**

  - **Description**: Read contents of a file from Google Drive.
  - **Input**:
    - `userId` (string): User ID for authentication.
    - `fileId` (string): ID of the file to read.
  - **Output**: Returns the contents of the specified file.

- **gsheets_read**

  - **Description**: Read data from a Google Spreadsheet with flexible options for ranges and formatting.
  - **Input**:
    - `userId` (string): User ID for authentication.
    - `spreadsheetId` (string): The ID of the spreadsheet to read.
    - `ranges` (array of strings, optional): Optional array of A1 notation ranges (e.g., `['Sheet1!A1:B10']`). If not provided, reads the entire sheet.
    - `sheetId` (number, optional): Specific sheet ID to read. If not provided with ranges, reads the first sheet.
  - **Output**: Returns the specified data from the spreadsheet.

- **gsheets_update_cell**
  - **Description**: Update a cell value in a Google Spreadsheet.
  - **Input**:
    - `userId` (string): User ID for authentication.
    - `fileId` (string): ID of the spreadsheet.
    - `range` (string): Cell range in A1 notation (e.g., `'Sheet1!A1'`).
    - `value` (string): New cell value.
  - **Output**: Confirms the updated value in the specified cell.

### Resources

The server provides access to Google Drive files:

- **Files** (`gdrive:///<file_id>`)
  - Supports all file types
  - Google Workspace files are automatically exported:
    - Docs → Markdown
    - Sheets → CSV
    - Presentations → Plain text
    - Drawings → PNG
  - Other files are provided in their native format

## Quick Start (Multi-User Setup)

For detailed setup instructions, see [setup-multi-user.md](./setup-multi-user.md).

### Prerequisites

- PostgreSQL database
- Google Cloud project with Drive and Sheets APIs enabled
- Node.js 18+

### 1. Environment Setup

Create a `.env` file:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_gdrive?schema=public"

# Google OAuth
CLIENT_ID="your-google-client-id"
CLIENT_SECRET="your-google-client-secret"
REDIRECT_URI="http://localhost:3000/auth/google/callback"

# Session
SESSION_SECRET="your-super-secret-session-key"
PORT=3000
```

### 2. Database Setup

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run build
```

### 3. Start Services

```bash
# Terminal 1: Web server (for OAuth)
node server.js

# Terminal 2: MCP server
node dist/index.js
```

### 4. User Authentication

For each user:

```bash
# 1. Set user session
curl http://localhost:3000/login/user123

# 2. Start OAuth (opens browser)
curl http://localhost:3000/auth/google

# 3. Complete OAuth in browser
# 4. Verify authentication
curl http://localhost:3000/users/user123/status
```

### 5. Using with MCP Clients

All tool calls must include `userId`:

```json
{
  "method": "tools/call",
  "params": {
    "name": "gdrive_search",
    "arguments": {
      "userId": "user123",
      "query": "my documents"
    }
  }
}
```

## API Endpoints

The web server provides these endpoints:

- `GET /health` - Health check
- `GET /login/:userId` - Set user session
- `GET /users` - List all users
- `GET /users/:userId/status` - Check user authentication status
- `GET /auth/google` - Start OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /drive/files` - Test Drive access
- `GET /sheets/:spreadsheetId` - Test Sheets access

## Usage with Desktop App

To integrate this server with the desktop app, add the following to your app's server configuration:

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@isaacphi/mcp-gdrive"],
      "env": {
        "DATABASE_URL": "postgresql://username:password@localhost:5432/mcp_gdrive?schema=public",
        "CLIENT_ID": "<CLIENT_ID>",
        "CLIENT_SECRET": "<CLIENT_SECRET>",
        "REDIRECT_URI": "http://localhost:3000/auth/google/callback",
        "SESSION_SECRET": "<SESSION_SECRET>"
      }
    }
  }
}
```

**Note**: For multi-user setup, you'll also need to run the web server (`node server.js`) for OAuth authentication.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
