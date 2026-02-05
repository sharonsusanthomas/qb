import requests

url = "http://localhost:8000/api/v1/generate-from-notes/"

# Create a dummy file mimicking a PDF (but invalid content)
with open("dummy.pdf", "wb") as f:
    f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n")

files = {'file': ('dummy.pdf', open('dummy.pdf', 'rb'), 'application/pdf')}
data = {
    'subject': 'Test Subject',
    'topic': 'Test Topic',
    'bloom_level': 'RBT1',
    'difficulty': 'EASY',
    'marks': 10
}

try:
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
