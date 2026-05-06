# Script to replace the _save_to_db_and_neo4j function with a correctly indented version
import pathlib

filepath = pathlib.Path('app/routers/student.py')
content = filepath.read_text(encoding='utf-8')

# Define corrected function lines (as list of strings, each ending with \n)
corrected_lines = [
    "    def _save_to_db_and_neo4j(key, original, data, latency_ms=0):\n",
    "        saved_success = False\n",
    "        # Debug: log incoming data\n",
    "        meanings = data.get(\"meanings\", [])\n",
    "        first_def = meanings[0].get(\"definition_en\") if meanings else \"N/A\"\n",
    "        print(f\"[SAVE DEBUG] Saving word='{key}', meanings_count={len(meanings)}, first_def_en='{first_def[:60]}...'\")\n",
    "\n",
    "        # Save to SQLite dictionary_cache\n",
    "        try:\n",
    "            mc = len(data.get(\"meanings\", []))\n",
    "            c = get_db()\n",
    "            try:\n",
    "                c.execute(\n",
    "                    \"\"\"INSERT OR REPLACE INTO dictionary_cache (word, word_original, data_json, meanings_count, updated_at)\n",
    "                       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)\"\"\",\n",
    "                    (key, original, json.dumps(data, ensure_ascii=False), mc)\n",
    "                )\n",
    "                c.commit()\n",
    "                saved_success = True\n",
    "            finally:\n",
    "                c.close()\n",
    "            print(f\"[DB SAVE] dictionary_cache success for: {key}\")\n",
    "        except Exception as e:\n",
    "            print(f\"[DB SAVE] dictionary_cache error: {e}\")\n",
    "\n",
    "        # Save meanings to Neo4j\n",
    "        try:\n",
    "            all_synonyms = []\n",
    "            all_antonyms = []\n",
    "            primary_meaning_en = \"\"\n",
    "            primary_meaning_vn = \"\"\n",
    "            primary_pos = data.get(\"pos\", \"\")\n",
    "\n",
    "            for i, meaning in enumerate(data.get(\"meanings\", [])):\n",
    "                if i == 0:\n",
    "                    primary_meaning_en = meaning.get(\"definition_en\", \"\")\n",
    "                    primary_meaning_vn = meaning.get(\"definition_vn\", \"\")\n",
    "                    primary_pos = meaning.get(\"pos\", primary_pos)\n",
    "                all_synonyms.extend(meaning.get(\"synonyms\", []))\n",
    "                all_antonyms.extend(meaning.get(\"antonyms\", []))\n",
    "\n",
    "            graph_service.save_word_to_graph({\n",
    "                \"word\": key.lower(),\n",
    "                \"phonetic\": data.get(\"phonetic_uk\", \"\"),\n",
    "                \"audio_url\": data.get(\"audio_url\", \"\"),\n",
    "                \"pos\": primary_pos,\n",
    "                \"meaning_en\": primary_meaning_en,\n",
    "                \"meaning_vn\": primary_meaning_vn,\n",
    "                \"example\": (data.get(\"meanings\", [{}])[0].get(\"examples\") or [\"\"])[0].split(\"|\")[0] if data.get(\"meanings\") else \"\",\n",
    "                \"level\": data.get(\"level\", \"B1\"),\n",
    "                \"word_family\": data.get(\"word_family\", []),\n",
    "                \"collocations\": data.get(\"collocations\", []),\n",
    "                \"idioms\": data.get(\"idioms\", []),\n",
    "                \"synonyms\": list(set(all_synonyms))[:5],\n",
    "                \"antonyms\": list(set(all_antonyms))[:3],\n",
    "            })\n",
    "\n",
    "            # Save full raw JSON to Neo4j for persistent caching\n",
    "            graph_service.set_dictionary_cache(key.lower(), data)\n",
    "        except Exception as e:\n",
    "            print(f\"[Neo4j SAVE] error: {e}\")\n",
    "\n",
    "        # Post-save actions only if DB save succeeded\n",
    "        if saved_success:\n",
    "            # Determine completeness once\n",
    "            is_complete = llm_service.is_data_complete(data)\n",
    "\n",
    "            # Update in-memory cache ONLY if data is complete\n",
    "            if is_complete:\n",
    "                try:\n",
    "                    norm_key = key.lower().strip()\n",
    "                    with llm_service._cache_lock:\n",
    "                        llm_service._dict_cache[norm_key] = {\"data\": data, \"ts\": time.time()}\n",
    "                    print(f\"[MEMORY CACHE] Updated for '{norm_key}'\")\n",
    "                except Exception as e:\n",
    "                    print(f\"[MEMORY CACHE] Update failed: {e}\")\n",
    "\n",
    "            # Log to AI monitoring system\n",
    "            try:\n",
    "                log_ai_request(\n",
    "                    user_id=user[\"id\"],\n",
    "                    endpoint=\"dictionary/lookup\",\n",
    "                    model=\"AI Stream\",\n",
    "                    difficulty=\"easy\",\n",
    "                    latency_ms=latency_ms,\n",
    "                    status=\"success\" if is_complete else \"partial\",\n",
    "                    feature=\"Dictionary Re-Lookup\",\n",
    "                    response_content=json.dumps(data, ensure_ascii=False)[:500]\n",
    "                )\n",
    "            except Exception as e:\n",
    "                print(f\"[MONITOR] Log failed: {e}\")\n",
]

# Replace lines 1126-1218 inclusive (1-indexed). Convert to 0-index.
lines = content.splitlines(keepends=True)
start = 1126 - 1
end = 1218  # slice end is exclusive? We'll replace from start to end (inclusive) -> slice start:end+1
# Actually lines indices: start_idx = 1125, end_idx = 1217 inclusive.
start_idx = 1125
end_idx = 1217
# Ensure we have that many lines
if len(lines) < end_idx+1:
    print(f"File only has {len(lines)} lines, cannot replace at 1126-1218")
    exit(1)

# Build new content
new_lines = lines[:start_idx] + corrected_lines + lines[end_idx+1:]
new_content = ''.join(new_lines)
filepath.write_text(new_content, encoding='utf-8')
print(f"Replaced lines {start_idx+1}-{end_idx+1} with {len(corrected_lines)} lines.")
