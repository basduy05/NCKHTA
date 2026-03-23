import os
import httpx
from typing import List, Dict, Any

# You can use a free Guardian API key or public if available.
# Let's use a demo/test key 'test' if none provided, which works with limits.
GUARDIAN_API_KEY = os.environ.get("GUARDIAN_API_KEY", "test")
# Let's also support NewsAPI just in case
NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY", "")

async def fetch_guardian_news(query: str = "science", limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch articles from The Guardian API. Good for Reading Comprehension topics.
    """
    url = "https://content.guardianapis.com/search"
    params = {
        "q": query,
        "api-key": GUARDIAN_API_KEY,
        "show-fields": "bodyText,headline,thumbnail",
        "page-size": limit
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            results = data.get("response", {}).get("results", [])
            articles = []
            for r in results:
                fields = r.get("fields", {})
                articles.append({
                    "title": fields.get("headline", r.get("webTitle")),
                    "content": fields.get("bodyText", ""),
                    "url": r.get("webUrl"),
                    "thumbnail": fields.get("thumbnail"),
                    "source": "The Guardian"
                })
            return articles
        except Exception as e:
            print(f"Guardian API error: {e}")
            return []

async def fetch_newsapi(query: str = "technology", limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch articles from NewsAPI if key is provided.
    """
    if not NEWSAPI_KEY:
        return []
        
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "apiKey": NEWSAPI_KEY,
        "language": "en",
        "pageSize": limit
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            articles = []
            for r in data.get("articles", []):
                articles.append({
                    "title": r.get("title"),
                    "content": r.get("content") or r.get("description", ""),
                    "url": r.get("url"),
                    "thumbnail": r.get("urlToImage"),
                    "source": r.get("source", {}).get("name", "NewsAPI")
                })
            return articles
        except Exception as e:
            print(f"NewsAPI error: {e}")
            return []

async def get_reading_sources(query: str = "science", limit: int = 5) -> List[Dict[str, Any]]:
    """
    Attempt to get news from Guardian, then NewsAPI.
    """
    articles = await fetch_guardian_news(query, limit)
    if not articles and NEWSAPI_KEY:
        articles = await fetch_newsapi(query, limit)
    
    # Filter out empty content
    articles = [a for a in articles if a["content"] and len(a["content"]) > 100]
    return articles
