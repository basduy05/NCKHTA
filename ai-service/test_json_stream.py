import asyncio
import sys
import os

# allow import from app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.llm_service import get_llm
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import json

async def test():
    llm = get_llm()
    prompt = PromptTemplate.from_template("Give me a JSON object with a list of 2 colors. Return only JSON.")
    chain = prompt | llm | JsonOutputParser()
    
    try:
        print("Starting stream...")
        for chunk in chain.stream({}):
            print("CHUNK ->", chunk)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
