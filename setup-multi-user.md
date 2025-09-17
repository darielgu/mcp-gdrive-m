# Multi-User Setup Guide

This guide will help you set up the MCP Google Drive server for multiple users.

## Prerequisites

1. **PostgreSQL Database**: You need a PostgreSQL database running
2. **Google Cloud Project**: Set up a Google Cloud project with Drive and Sheets APIs enabled
3. **Node.js**: Version 18 or higher

## 1. Environment Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/mcp_gdrive?schema=public"

# Google OAuth Configuration
CLIENT_ID="your-google-client-id"
CLIENT_SECRET="your-google-client-secret"
REDIRECT_URI="http://localhost:3000/auth/google/callback"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-in-production"

# Server Configuration
PORT=3000
```

## 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Drive API
   - Google Sheets API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Set the redirect URI to: `http://localhost:3000/auth/google/callback`
6. Copy the Client ID and Client Secret to your `.env` file

## 3. Database Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## 4. Build and Run

1. Build the project:

   ```bash
   npm run build
   ```

2. Start the web server (for OAuth flow):

   ```bash
   node server.js
   ```

3. In another terminal, start the MCP server:
   ```bash
   node dist/index.js
   ```

## 5. User Authentication Flow

### For each user:

1. **Set user session**:

   ```bash
   curl http://localhost:3000/login/user123
   ```

2. **Start OAuth flow**:

   ```bash
   curl http://localhost:3000/auth/google
   ```

   This will redirect to Google's OAuth page.

3. **Complete OAuth**:
   After user authorizes, they'll be redirected to the callback URL which will save their tokens.

4. **Verify authentication**:
   ```bash
   curl http://localhost:3000/users/user123/status
   ```

## 6. Using with MCP Clients

When calling MCP tools, always include the `userId` parameter:

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

## 7. API Endpoints

- `GET /health` - Health check
- `GET /login/:userId` - Set user session
- `GET /users` - List all users
- `GET /users/:userId/status` - Check user authentication status
- `GET /auth/google` - Start OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /drive/files` - Test Drive access
- `GET /sheets/:spreadsheetId` - Test Sheets access

## 8. Security Considerations

1. **Change default secrets**: Update `SESSION_SECRET` in production
2. **Use HTTPS**: In production, use HTTPS for OAuth redirects
3. **Database security**: Secure your PostgreSQL database
4. **User management**: Implement proper user authentication system
5. **Token storage**: Consider encrypting tokens at rest

## 9. Troubleshooting

### Common Issues:

1. **"Missing userId in request"**: Ensure you're passing userId in MCP tool calls
2. **"User must authenticate via Google OAuth first"**: User needs to complete OAuth flow
3. **Database connection errors**: Check DATABASE_URL and ensure PostgreSQL is running
4. **OAuth errors**: Verify CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI

### Debug Commands:

```bash
# Check database connection
npx prisma db pull

# View database contents
npx prisma studio

# Check user tokens
curl http://localhost:3000/users/user123/status
```

## 10. Production Deployment

For production deployment:

1. Use a production database (e.g., AWS RDS, Google Cloud SQL)
2. Set up proper environment variables
3. Use HTTPS for all endpoints
4. Implement proper user authentication
5. Set up monitoring and logging
6. Consider using Redis for session storage
7. Set up proper backup strategies for the database
