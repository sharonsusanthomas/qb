import sqlite3

def check():
    conn = sqlite3.connect('question_bank.db')
    cursor = conn.cursor()
    
    print("\n--- Detailed Column Info for 'questions' table ---")
    cursor.execute("PRAGMA table_info(questions)")
    cols = cursor.fetchall()
    for col in cols:
        print(f"ID: {col[0]}, Name: {col[1]}, Type: {col[2]}")
        
    print("\n--- Detailed Column Info for 'faculty_personas' table ---")
    cursor.execute("PRAGMA table_info(faculty_personas)")
    cols = cursor.fetchall()
    for col in cols:
        print(f"ID: {col[0]}, Name: {col[1]}, Type: {col[2]}")

    conn.close()

if __name__ == "__main__":
    check()
