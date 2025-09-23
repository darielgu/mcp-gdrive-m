import os
import asyncio
import json
from mcp import ClientSession, stdio_client
from params import get_gdrive_server_params
from dotenv import load_dotenv
load_dotenv()

server_params = get_gdrive_server_params()

# Pick the userId you authenticated earlier
USER_ID = os.getenv("GDRIVE_TEST_USER_ID", "test-user-1758592253842")
USER_ID = 'user-1758598086483'

async def poc(folder_id: str):
    async with stdio_client(server_params) as (read, write): 
        async with ClientSession(read, write) as session: 
            await session.initialize() 
            print("DEBUG userId:", USER_ID)


            # Step 1: search for files
            search_req = await session.call_tool(
                "gdrive_search",
                {
                    "query": "Test",
                    "userId": USER_ID,   #  new required param
                }
            )
            print(search_req)
            raw_text = search_req.content[0].text

            file_info = []
            for line in raw_text.splitlines():
                if line.strip() and not line.startswith("Found"):
                    if "(application/vnd.google-apps.folder)" in line:
                        continue

                    parts = line.split()
                    file_id = parts[0]

                    # everything between file_id and "(mimeType)"
                    name_with_type = " ".join(parts[1:])
                    name = name_with_type.rsplit("(", 1)[0].strip()

                    file_info.append({"id": file_id, "name": name})

            print(f"\nExtracted files:\n", file_info)
            
            # Step 2: read from list of files
            for file in file_info:
                print(f"\nReading file: {file['name']} (ID: {file['id']})")
                file_cont = await session.call_tool(
                    "gdrive_read_file",
                    {
                        "fileId": file['id'],
                        "userId": USER_ID,   # 👈 pass userId here too
                    }
                )
                print(f'\n', file_cont.content[0].text[:500])  # first 500 chars


if __name__ == "__main__":
    import sys
    folder_id = sys.argv[1] if len(sys.argv) > 1 else "random"
    asyncio.run(poc(folder_id))
