import { google } from "googleapis";
import { getValidCredentials } from "../auth.js";
export const schema = {
    name: "gsheets_update_cell",
    description: "Update a cell value in a Google Spreadsheet",
    inputSchema: {
        type: "object",
        properties: {
            userId: {
                type: "string",
                description: "User ID for authentication",
            },
            fileId: {
                type: "string",
                description: "ID of the spreadsheet",
            },
            range: {
                type: "string",
                description: "Cell range in A1 notation (e.g. 'Sheet1!A1')",
            },
            value: {
                type: "string",
                description: "New cell value",
            },
        },
        required: ["userId", "fileId", "range", "value"],
    },
};
export async function updateCell(args) {
    try {
        // Get user-specific authentication
        const auth = await getValidCredentials(args.userId);
        const sheets = google.sheets({ version: "v4", auth });
        const { fileId, range, value } = args;
        await sheets.spreadsheets.values.update({
            spreadsheetId: fileId,
            range: range,
            valueInputOption: "RAW",
            requestBody: {
                values: [[value]],
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Updated cell ${range} to value: ${value}`,
                },
            ],
            isError: false,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error updating cell: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
            isError: true,
        };
    }
}
