import urllib.request
import json

url = "https://pypi.org/pypi/libsql-experimental/json"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    releases = data.get("releases", {})
    latest_version = data.get("info", {}).get("version")
    print("Latest version:", latest_version)
    for file_info in releases.get(latest_version, []):
        print(file_info["filename"])
