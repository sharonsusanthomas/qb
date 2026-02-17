import sqlite3
import os

DB_PATH = "question_bank.db"

subjects = [
    ('CS101', 'Data Structures'),
    ('CS102', 'Algorithms'),
    ('CS201', 'DBMS'),
    ('CS301', 'Computer Networks'),
    ('CS302', 'Software Engineering'),
    ('CS401', 'Artificial Intelligence'),
    ('CS402', 'Machine Learning'),
    ('CS403', 'Cyber Security'),
    ('CS501', 'Cloud Computing'),
    ('MA101', 'Discrete Mathematics'),
    ('PH101', 'Engineering Physics')
]

# (subject_id, topic_name)
# IDs will be assigned sequentially 1, 2, 3...
topics = [
    # CS101 - Data Structures (ID 1)
    (1, 'Arrays'), (1, 'Stacks'), (1, 'Queues'), (1, 'Trees'), (1, 'Linked Lists'), (1, 'Graphs'), (1, 'Hashing'), (1, 'Heaps'),
    # CS102 - Algorithms (ID 2)
    (2, 'Sorting'), (2, 'Dynamic Programming'), (2, 'Greedy Algorithms'), (2, 'Divide and Conquer'), (2, 'Backtracking'), (2, 'Graph Algorithms'),
    # CS201 - DBMS (ID 3)
    (3, 'Normalization'), (3, 'Transactions'), (3, 'SQL Queries'), (3, 'NoSQL Databases'), (3, 'Indexing'), (3, 'Concurrency Control'),
    # CS301 - Computer Networks (ID 4)
    (4, 'OSI Model'), (4, 'TCP/IP'), (4, 'Routing Protocols'), (4, 'Network Security'), (4, 'IP Adressing'), (4, 'HTTP/HTTPS'),
    # CS302 - Software Engineering (ID 5)
    (5, 'Agile Methodology'), (5, 'SDLC Models'), (5, 'Software Testing'), (5, 'Design Patterns'), (5, 'Requirement Engineering'),
    # CS401 - Artificial Intelligence (ID 6)
    (6, 'Search Algorithms'), (6, 'Neural Networks'), (6, 'Natural Language Processing'), (6, 'Expert Systems'), (6, 'Knowledge Representation'),
    # CS402 - Machine Learning (ID 7)
    (7, 'Linear Regression'), (7, 'Decision Trees'), (7, 'Support Vector Machines'), (7, 'Clustering'), (7, 'Deep Learning'),
    # CS403 - Cyber Security (ID 8)
    (8, 'Cryptography'), (8, 'Malware Analysis'), (8, 'Ethical Hacking'), (8, 'Network Defense'), (8, 'Incident Response'),
    # CS501 - Cloud Computing (ID 9)
    (9, 'Virtualization'), (9, 'SaaS/PaaS/IaaS'), (9, 'Cloud Architecture'), (9, 'Serverless Computing'), (9, 'Cloud Security')
]

# (subject_id, outcome_code, description)
course_outcomes = [
    # CS101
    (1, 'CO1', 'Understand basic data structures like arrays and stacks'),
    (1, 'CO2', 'Apply trees and graphs to solve complex problems'),
    (1, 'CO3', 'Implement efficient searching and sorting techniques'),
    (1, 'CO4', 'Analyze time and space complexity of data structures'),
    
    # CS102
    (2, 'CO1', 'Analyze algorithm complexity and efficiency'),
    (2, 'CO2', 'Develop algorithms using dynamic programming'),
    (2, 'CO3', 'Apply greedy strategies for optimization problems'),
    
    # CS201
    (3, 'CO1', 'Design normalized database schemas'),
    (3, 'CO2', 'Write complex SQL queries for data retrieval'),
    (3, 'CO3', 'Understand database transaction properties and recovery'),
    
    # CS301
    (4, 'CO1', 'Explain the functions of OSI and TCP/IP layers'),
    (4, 'CO2', 'Configure routing and switching in networks'),
    (4, 'CO3', 'Identify network security threats and countermeasures'),
    
    # CS401
    (6, 'CO1', 'Apply heuristic search techniques for problem solving'),
    (6, 'CO2', 'Understand fundamentals of machine learning in AI'),
    
    # CS402
    (7, 'CO1', 'Implement supervised and unsupervised learning models'),
    (7, 'CO2', 'Evaluate model performance using statistical metrics')
]

def seed():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database {DB_PATH} not found. Please run the app once to create tables.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Clear existing data to ensure a clean slate with correct IDs
        print("Clearing old metadata...")
        cursor.execute("DELETE FROM topics")
        cursor.execute("DELETE FROM course_outcomes")
        cursor.execute("DELETE FROM subjects")
        
        # Reset auto-increment
        try:
            cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('subjects', 'topics', 'course_outcomes')")
        except sqlite3.OperationalError:
            pass

        print("Inserting new subjects...")
        for code, name in subjects:
            cursor.execute("INSERT INTO subjects (course_code, subject_name) VALUES (?, ?)", (code, name))
        
        print("Inserting new topics...")
        for sid, name in topics:
            cursor.execute("INSERT INTO topics (subject_id, topic_name) VALUES (?, ?)", (sid, name))
            
        print("Inserting new course outcomes...")
        for sid, code, desc in course_outcomes:
            cursor.execute("INSERT INTO course_outcomes (subject_id, outcome_code, description) VALUES (?, ?, ?)", (sid, code, desc))
            
        conn.commit()
        print("\nSuccessfully updated database with expanded subjects, topics, and COs!")
        print(f"Total Subjects: {len(subjects)}")
        print(f"Total Topics: {len(topics)}")
        print(f"Total COs: {len(course_outcomes)}")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed()
