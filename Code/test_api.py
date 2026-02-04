"""
For local testing only. Uses the test fixture tests/fixtures/sample_cas.json
(formerly test_mock.json). POSTs it to /api/analyze. Run with backend up:
  python Code/test_api.py (from project root)
"""
import os
import requests
import json

url = "http://127.0.0.1:8000/api/analyze"
_script_dir = os.path.dirname(os.path.abspath(__file__))
fixture_path = os.path.join(_script_dir, "..", "tests", "fixtures", "sample_cas.json")
files = {"file": open(fixture_path, "r")}
try:
    response = requests.post(url, files=files)
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
