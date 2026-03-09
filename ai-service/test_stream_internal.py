import asyncio
from app.services.llm_service import lookup_dictionary_stream

async def test_stream():
    print("Starting dict stream for 'legendary'...")
    try:
        for chunk in lookup_dictionary_stream('legendary'):
            print("CHUNK:", chunk)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_stream())
