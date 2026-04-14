import wikipediaapi
import sys
import json
import logging

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


def fetch_wikipedia_data(query, lang="id"):
    logger.info(f"Searching Wikipedia for: {query} (lang: {lang})")
    wiki = wikipediaapi.Wikipedia(
        user_agent="MyDiscordBot/1.0 (https://github.com/razaeldotexe/open-0)",
        language=lang,
        extract_format=wikipediaapi.ExtractFormat.WIKI,
    )

    page = wiki.page(query)

    if not page.exists():
        logger.warning(f"Wikipedia page not found: {query}")
        return {"error": "Halaman tidak ditemukan."}

    data = {
        "title": page.title,
        "summary": page.summary,
        "fullurl": page.fullurl,
    }

    logger.info(f"Fetched page: {page.title}")
    return data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Mohon berikan query pencarian."}))
        sys.exit(1)

    search_query = " ".join(sys.argv[1:])
    result = fetch_wikipedia_data(search_query)
    print(json.dumps(result, indent=4, ensure_ascii=False))
