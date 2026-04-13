import arxiv
import sys
import json

def fetch_arxiv(query, max_results=10):
    client = arxiv.Client()
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance
    )

    results = []
    try:
        for r in client.results(search):
            results.append({
                "title": r.title,
                "authors": [author.name for author in r.authors],
                "summary": r.summary,
                "published": r.published.strftime("%Y-%m-%d"),
                "entry_id": r.entry_id,
                "pdf_url": r.pdf_url,
                "primary_category": r.primary_category
            })
        return results
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Mohon berikan query pencarian."}))
        sys.exit(1)

    search_query = " ".join(sys.argv[1:])
    data = fetch_arxiv(search_query)
    print(json.dumps(data, indent=4, ensure_ascii=False))
