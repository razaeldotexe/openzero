import json
import sys
import urllib.request
import logging

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

FONTS_JSON_URL = "https://raw.githubusercontent.com/ryanoasis/nerd-fonts/master/bin/scripts/lib/fonts.json"


def fetch_fonts(query=None):
    try:
        logger.info(f"Fetching fonts data from GitHub...")
        with urllib.request.urlopen(FONTS_JSON_URL) as response:
            data = json.loads(response.read().decode())

        fonts = data.get("fonts", [])

        if query:
            logger.info(f"Filtering fonts by query: {query}")
            query = query.lower()
            filtered_fonts = [
                f
                for f in fonts
                if query in f.get("unpatchedName", "").lower()
                or query in f.get("patchedName", "").lower()
                or query in f.get("folderName", "").lower()
            ]
            return filtered_fonts
        else:
            return fonts

    except Exception as e:
        logger.error(f"Error fetching fonts: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    search_query = sys.argv[1] if len(sys.argv) > 1 else None
    result = fetch_fonts(search_query)
    print(json.dumps(result))
