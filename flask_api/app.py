from flask import Flask, request, jsonify
import sys
import os
import logging

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Menambahkan path fetchers ke sistem agar bisa diimport
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'fetchers')))

import arxiv_fetcher
import wiki_fetcher
import nerdfont_fetcher
import github_fetcher

app = Flask(__name__)

@app.route('/arxiv', methods=['GET'])
def get_arxiv():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Query required"}), 400
    return jsonify(arxiv_fetcher.fetch_arxiv(query))

@app.route('/wikipedia', methods=['GET'])
def get_wikipedia():
    query = request.args.get('q')
    lang = request.args.get('lang', 'id')
    if not query:
        return jsonify({"error": "Query required"}), 400
    return jsonify(wiki_fetcher.fetch_wikipedia_data(query, lang))

@app.route('/nerdfont', methods=['GET'])
def get_nerdfont():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Query required"}), 400
    return jsonify(nerdfont_fetcher.fetch_fonts(query))

@app.route('/github/scan', methods=['POST'])
def scan_github():
    data = request.json
    owner = data.get('owner')
    repo = data.get('repo')
    token = data.get('token')
    path = data.get('path', '')
    
    if not owner or not repo:
        return jsonify({"error": "Owner and repo required"}), 400
    
    logger.info(f"Scanning Github: {owner}/{repo} path='{path}'")
    result = github_fetcher.scan_recursive(owner, repo, token, path)
    
    if isinstance(result, dict) and "error" in result:
        status_code = 403 if "403" in result["error"] else 500
        logger.error(f"Scan Error: {result['error']}")
        return jsonify(result), status_code
        
    return jsonify(result)

@app.route('/github/content', methods=['POST'])
def get_github_content():
    data = request.json
    owner = data.get('owner')
    repo = data.get('repo')
    token = data.get('token')
    path = data.get('path')
    
    if not owner or not repo or not path:
        return jsonify({"error": "Owner, repo, and path required"}), 400
        
    logger.info(f"Fetching Content: {owner}/{repo} file='{path}'")
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    file_info = github_fetcher.github_api_request(url, token)
    
    if isinstance(file_info, dict) and "error" in file_info:
        status_code = 403 if "403" in file_info["error"] else 500
        logger.error(f"Content Request Error: {file_info['error']}")
        return jsonify(file_info), status_code

    if isinstance(file_info, dict) and "download_url" in file_info:
        content = github_fetcher.fetch_file_content(file_info['download_url'], token)
        if isinstance(content, dict) and "error" in content:
            return jsonify(content), 500
        return jsonify({"name": path.split('/')[-1], "content": content})
    else:
        return jsonify({"error": f"File '{path}' not found or metadata missing."}), 404

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled Exception: {str(e)}")
    return jsonify({"error": "Internal Server Error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
