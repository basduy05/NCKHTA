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

async def get_reading_sources_by_level(level: str = "B1", topic: str = "general", limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch articles tailored to student CEFR level:
    - A1/A2: shorter length, everyday topics (lifestyle, animals, sports)
    - B1/B2: medium length, cultural, technology, environmental topics
    - C1/C2: full articles, scientific, global affairs, in-depth analysis
    """
    level_queries = {
        "A1": "animals lifestyle hobbies",
        "A2": "travel food sports daily life",
        "B1": "environment education technology culture",
        "B2": "science climate innovation society",
        "C1": "economics philosophy global politics research",
        "C2": "advanced scientific research international diplomacy"
    }
    
    selected_query = topic if topic and topic != "general" else level_queries.get(level.upper(), "technology science")
    articles = await get_reading_sources(query=selected_query, limit=limit)
    
    # Adapt length based on CEFR level
    max_words_map = {"A1": 150, "A2": 250, "B1": 400, "B2": 600, "C1": 1000, "C2": 2000}
    max_words = max_words_map.get(level.upper(), 500)
    
    for a in articles:
        words = a["content"].split()
        if len(words) > max_words:
            a["content"] = " ".join(words[:max_words]) + "..."
        a["cefr_level"] = level.upper()
        
    return articles
