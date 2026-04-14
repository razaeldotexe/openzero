import json
import sys
import urllib.request
import urllib.error
import logging

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


def github_api_request(url, token=None):
    """Makes a request to the GitHub API."""
    headers = {
        "User-Agent": "MyDiscordBot/1.0",
        "Accept": "application/vnd.github.v3+json",
    }
    if token:
        headers["Authorization"] = f"token {token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as e:
        logger.error(f"GitHub API Error: {str(e)}")
        return {"error": str(e)}


def scan_recursive(owner, repo, token=None, path=""):
    """Recursively scans the repository for all .md files."""
    logger.info(f"Scanning directory: {path if path else 'root'}")
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    contents = github_api_request(url, token)

    if isinstance(contents, dict) and "error" in contents:
        return []

    if not isinstance(contents, list):
        return []

    md_files = []
    for item in contents:
        if item["type"] == "dir":
            # Recursive call for subdirectories
            md_files.extend(scan_recursive(owner, repo, token, item["path"]))
        elif item["type"] == "file" and item["name"].endswith(".md"):
            logger.info(f"Found Markdown file: {item['path']}")
            md_files.append(
                {
                    "name": item["name"],
                    "path": item["path"],
                    "download_url": item["download_url"],
                }
            )

    return md_files


def fetch_file_content(download_url, token=None):
    """Fetches the raw content of a file from GitHub."""
    headers = {"User-Agent": "MyDiscordBot/1.0"}
    if token:
        headers["Authorization"] = f"token {token}"

    req = urllib.request.Request(download_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode("utf-8")
    except Exception as e:
        logger.error(f"Error fetching file content: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(
            json.dumps(
                {
                    "error": "Usage: python github_fetcher.py <owner> <repo> <token> [path] [is_file]"
                }
            )
        )
        sys.exit(1)

    owner = sys.argv[1]
    repo = sys.argv[2]
    token = sys.argv[3]
    path = sys.argv[4] if len(sys.argv) > 4 else ""
    is_file = sys.argv[5] == "true" if len(sys.argv) > 5 else False

    try:
        if is_file:
            # Fetch specific file using path
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
            file_info = github_api_request(url, token)
            if isinstance(file_info, dict) and "download_url" in file_info:
                content = fetch_file_content(file_info["download_url"], token)
                print(json.dumps({"name": path.split("/")[-1], "content": content}))
            else:
                print(json.dumps({"error": f"File '{path}' not found."}))
        else:
            # Recursive scan from root or certain path
            files = scan_recursive(owner, repo, token, path)
            print(json.dumps(files))
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        print(json.dumps({"error": str(e)}))
