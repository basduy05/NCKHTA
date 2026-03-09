import json_repair
import json

def test():
    chunks = [
        '{\n  "meanings": [\n    {\n',
        '      "pos": "adj",\n      "definition_en": "very famous and',
        ' talked about a lot",\n      "definition_vn": "rất nổi tiếng",\n',
        '      "examples": ["He is a legendary figure."]\n    }\n  ]\n}'
    ]
    
    acc = ""
    for c in chunks:
        acc += c
        print("--- ACCUMULATED ---")
        print(acc)
        try:
            parsed = json_repair.repair_json(acc, return_objects=True)
            print("REPAIRED:", json.dumps(parsed, ensure_ascii=False))
        except Exception as e:
            print("ERROR:", e)

if __name__ == "__main__":
    test()
