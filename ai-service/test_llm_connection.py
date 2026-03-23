import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_cohere import ChatCohere
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY not found")
        return
    
    # Try the one in the code
    model_name = "gemini-2.5-flash-lite"
    print(f"Testing {model_name}...")
    try:
        llm = ChatGoogleGenerativeAI(model=model_name)
        res = llm.invoke("Hello")
        print(f"Success: {res.content}")
    except Exception as e:
        print(f"Failed {model_name}: {e}")
        
    # Try a known working one (1.5 flash)
    model_name = "gemini-1.5-flash"
    print(f"Testing {model_name}...")
    try:
        llm = ChatGoogleGenerativeAI(model=model_name)
        res = llm.invoke("Hello")
        print(f"Success: {res.content}")
    except Exception as e:
        print(f"Failed {model_name}: {e}")

def test_cohere():
    api_key = os.getenv("COHERE_API_KEY")
    if not api_key:
        print("COHERE_API_KEY not found")
        return
    
    model_name = "command-a"
    print(f"Testing {model_name}...")
    try:
        llm = ChatCohere(model=model_name)
        res = llm.invoke("Hello")
        print(f"Success: {res.content}")
    except Exception as e:
        print(f"Failed {model_name}: {e}")

    model_name = "command-r"
    print(f"Testing {model_name}...")
    try:
        llm = ChatCohere(model=model_name)
        res = llm.invoke("Hello")
        print(f"Success: {res.content}")
    except Exception as e:
        print(f"Failed {model_name}: {e}")

if __name__ == "__main__":
    test_gemini()
    test_cohere()
