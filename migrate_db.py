import sqlite3

# Simple migration script using raw sqlite3
def migrate():
    conn = sqlite3.connect('question_bank.db')
    cursor = conn.cursor()
    
    # Check if faculty_name exists in questions table
    cursor.execute("PRAGMA table_info(questions)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'faculty_name' not in columns:
        print("Adding faculty_name column to questions table...")
        try:
            cursor.execute("ALTER TABLE questions ADD COLUMN faculty_name VARCHAR(255)")
            print("Success: faculty_name column added.")
        except Exception as e:
            print(f"Error adding column: {e}")
    else:
        print("faculty_name column already exists in questions table.")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
