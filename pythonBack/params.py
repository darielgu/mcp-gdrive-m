from mcp import StdioServerParameters

def get_gdrive_server_params():
    return StdioServerParameters(
        command="node",
        args=["/Users/darielgutierrez/Desktop/mcp-gdrive-m/dist/index.js"]
    )
