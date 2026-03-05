import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_persona_flow():
    # 1. Create a persona
    persona_data = {"faculty_name": "Test Prof " + str(requests.utils.quote("1"))} # Avoid duplicates if rerun
    print(f"Creating persona: {persona_data}")
    r = requests.post(f"{BASE_URL}/faculty/personas", json=persona_data)
    print(f"Create Persona Status: {r.status_code}")
    if r.status_code != 201:
        print(f"Error: {r.text}")
        # Try to continue if it already exists
        if r.status_code == 400:
             print("Persona likely exists, continuing...")
        else:
            return

    # 2. List personas to get ID
    r = requests.get(f"{BASE_URL}/faculty/personas")
    personas = r.json()
    test_persona = next((p for p in personas if "Test Prof" in p["faculty_name"]), None)
    
    if not test_persona:
        print("Could not find created persona in list")
        return
    
    persona_id = test_persona["id"]
    print(f"Found Persona ID: {persona_id}")

    # 3. Add Golden Question
    question_data = {"question_text": "What is the complexity of Bubblesort?", "subject": "Data Structures"}
    print(f"Adding golden question to persona {persona_id}")
    r = requests.post(f"{BASE_URL}/faculty/personas/{persona_id}/examples", json=question_data)
    print(f"Add Question Status: {r.status_code}")
    if r.status_code != 201:
        print(f"Error: {r.text}")
        return

    # 4. List again and check if question is present
    r = requests.get(f"{BASE_URL}/faculty/personas")
    personas = r.json()
    test_persona_updated = next((p for p in personas if p["id"] == persona_id), None)
    
    if test_persona_updated and "golden_questions" in test_persona_updated:
        gq_count = len(test_persona_updated["golden_questions"])
        print(f"Retrieved Persona Golden Questions Count: {gq_count}")
        if gq_count > 0:
            print("SUCCESS: Golden question found in persona profile!")
            print(f"Sample Question: {test_persona_updated['golden_questions'][0]['question_text']}")
        else:
            print("FAILURE: Golden questions list is empty in response")
    else:
        print("FAILURE: golden_questions key missing in response")

if __name__ == "__main__":
    test_persona_flow()
