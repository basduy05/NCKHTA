import json

with open("test_output.txt", "rb") as f:
    content = f.read().decode("utf-16le")

print("--- FULL TEST OUTPUT ---")
print(content)
print("--- END OUTPUT ---")

# Try to find JSON chunks
for line in content.split("\n"):
    if line.strip():
        try:
            # Chunks often look like data: {...}
            if line.startswith("data: "):
                data = json.loads(line[6:])
                print(f"JSON Chunk: {data}")
            elif line.startswith("{") and line.endswith("}"):
                data = json.loads(line)
                print(f"JSON Object: {data}")
        except:
            pass
