import requests
import json

url = "http://127.0.0.1:8000/api/analyze"
files = {'file': open('test_mock.json', 'r')}
try:
    response = requests.post(url, files=files)
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
