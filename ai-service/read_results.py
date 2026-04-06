import json

data = json.load(open("model_results.json"))
for r in data:
    p = r["p"]
    m = r["m"]
    s = r["s"]
    ms = r.get("ms", 0)
    err = r.get("e", "")
    
    if s == "OK":
        print(f"OK  {p} {m} {ms}ms")
    else:
        tag = "EXPIRED" if "expired" in err.lower() else "ERROR"
        print(f"FAIL {p} {m} [{tag}]")
