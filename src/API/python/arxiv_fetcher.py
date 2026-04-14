import arxiv
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


def fetch_arxiv(query, max_results=10):
    logger.info(f"Searching ArXiv for query: {query}")
    client = arxiv.Client()
    search = arxiv.Search(
        query=query, max_results=max_results, sort_by=arxiv.SortCriterion.Relevance
    )

    results = []
    try:
        for r in client.results(search):
            results.append(
                {
                    "title": r.title,
                    "authors": [author.name for author in r.authors],
                    "summary": r.summary,
                    "published": r.published.strftime("%Y-%m-%d"),
                    "entry_id": r.entry_id,
                    "pdf_url": r.pdf_url,
                    "primary_category": r.primary_category,
                }
            )
        logger.info(f"Found {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"ArXiv Search Error: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Mohon berikan query pencarian."}))
        sys.exit(1)

    search_query = " ".join(sys.argv[1:])
    data = fetch_arxiv(search_query)
    print(json.dumps(data, indent=4, ensure_ascii=False))
