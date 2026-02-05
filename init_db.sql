CREATE DATABASE IF NOT EXISTS question_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE question_bank;

CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    bloom_level ENUM('RBT1', 'RBT2', 'RBT3', 'RBT4', 'RBT5', 'RBT6') NOT NULL,
    difficulty ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    marks INT NOT NULL,
    question_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_subject_topic (subject, topic),
    INDEX idx_bloom_difficulty (bloom_level, difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batch_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(255),
    total_questions INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batch_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_plan_id INT,
    question_id INT,
    sequence_number INT,
    FOREIGN KEY (batch_plan_id) REFERENCES batch_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Check for duplicate topics and clean them up

USE question_bank;

-- Show duplicates
SELECT subject_id, topic_name, COUNT(*) as count 
FROM topics 
GROUP BY subject_id, topic_name 
HAVING count > 1;

-- If you see duplicates above, run this to remove them:
-- DELETE t1 FROM topics t1
-- INNER JOIN topics t2 
-- WHERE t1.id > t2.id 
-- AND t1.subject_id = t2.subject_id 
-- AND t1.topic_name = t2.topic_name;

-- Show all topics to verify
SELECT t.id, s.course_code, s.subject_name, t.topic_name 
FROM topics t 
JOIN subjects s ON t.subject_id = s.id 
ORDER BY s.course_code, t.topic_name;
 -- Add subjects and topics tables to the existing database

USE question_bank;

-- Subjects table with course code
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    subject_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_course_code (course_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Topics table linked to subjects
CREATE TABLE IF NOT EXISTS topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_subject_id (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for Computer Science subjects
INSERT INTO subjects (course_code, subject_name) VALUES
('CS101', 'Data Structures'),
('CS102', 'Algorithms'),
('CS201', 'Database Management Systems'),
('CS202', 'Operating Systems'),
('CS301', 'Computer Networks'),
('CS302', 'Software Engineering');

-- Sample topics for Data Structures (CS101)
INSERT INTO topics (subject_id, topic_name) VALUES
(1, 'Arrays'),
(1, 'Linked Lists'),
(1, 'Stacks'),
(1, 'Queues'),
(1, 'Trees'),
(1, 'Graphs'),
(1, 'Hashing');

-- Sample topics for Algorithms (CS102)
INSERT INTO topics (subject_id, topic_name) VALUES
(2, 'Sorting Algorithms'),
(2, 'Searching Algorithms'),
(2, 'Dynamic Programming'),
(2, 'Greedy Algorithms'),
(2, 'Divide and Conquer'),
(2, 'Graph Algorithms');

-- Sample topics for DBMS (CS201)
INSERT INTO topics (subject_id, topic_name) VALUES
(3, 'ER Diagrams'),
(3, 'Normalization'),
(3, 'SQL Queries'),
(3, 'Transactions'),
(3, 'Indexing'),
(3, 'Concurrency Control');

-- Sample topics for Operating Systems (CS202)
INSERT INTO topics (subject_id, topic_name) VALUES
(4, 'Process Management'),
(4, 'Memory Management'),
(4, 'File Systems'),
(4, 'Deadlocks'),
(4, 'CPU Scheduling'),
(4, 'Synchronization');

-- Sample topics for Computer Networks (CS301)
INSERT INTO topics (subject_id, topic_name) VALUES
(5, 'OSI Model'),
(5, 'TCP/IP'),
(5, 'Routing Protocols'),
(5, 'Network Security'),
(5, 'DNS'),
(5, 'HTTP/HTTPS');

-- Sample topics for Software Engineering (CS302)
INSERT INTO topics (subject_id, topic_name) VALUES
(6, 'SDLC Models'),
(6, 'Requirements Engineering'),
(6, 'Design Patterns'),
(6, 'Testing'),
(6, 'Agile Methodology'),
(6, 'Version Control');
 -- Add status column to questions table

USE question_bank;

-- Add status enum column
ALTER TABLE questions 
ADD COLUMN status ENUM('DEDUPE_PENDING', 'DEDUPE_APPROVED', 'APPROVED') 
DEFAULT 'DEDUPE_PENDING' 
AFTER question_text;

-- Update existing questions to DEDUPE_PENDING
UPDATE questions SET status = 'DEDUPE_PENDING' WHERE status IS NULL;
