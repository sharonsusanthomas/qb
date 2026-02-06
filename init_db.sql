CREATE DATABASE IF NOT EXISTS question_bank
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE question_bank;

-- ---------------- SUBJECTS ----------------

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    subject_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_course_code (course_code)
) ENGINE=InnoDB;

-- ---------------- TOPICS ----------------

CREATE TABLE IF NOT EXISTS topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_subject_topic (subject_id, topic_name),
    INDEX idx_subject_id (subject_id)
) ENGINE=InnoDB;

-- ---------------- QUESTIONS ----------------

CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    bloom_level ENUM('RBT1','RBT2','RBT3','RBT4','RBT5','RBT6') NOT NULL,
    difficulty ENUM('EASY','MEDIUM','HARD') NOT NULL,
    marks INT NOT NULL,
    question_text TEXT NOT NULL,
    status ENUM('DEDUPE_PENDING', 'DEDUPE_APPROVED', 'DUPLICATE_FLAGGED', 'APPROVED')
           DEFAULT 'DEDUPE_PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_subject (subject),
    INDEX idx_topic (topic),
    INDEX idx_bloom_difficulty (bloom_level, difficulty),
    FULLTEXT INDEX ft_question_text (question_text)
) ENGINE=InnoDB;

-- ---------------- DUPLICATE MATCHES ----------------

CREATE TABLE IF NOT EXISTS duplicate_matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    match_question_id INT NOT NULL,
    similarity_score FLOAT,
    verdict VARCHAR(50),
    reason TEXT,

    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (match_question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------- BATCH PLANS ----------------

CREATE TABLE IF NOT EXISTS batch_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(255),
    total_questions INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------- BATCH QUESTIONS ----------------

CREATE TABLE IF NOT EXISTS batch_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_plan_id INT NOT NULL,
    question_id INT NOT NULL,
    sequence_number INT,

    FOREIGN KEY (batch_plan_id) REFERENCES batch_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,

    UNIQUE KEY uniq_batch_question (batch_plan_id, question_id)
) ENGINE=InnoDB;
INSERT INTO subjects (course_code, subject_name) VALUES
('CS101','Data Structures'),
('CS102','Algorithms'),
('CS201','DBMS'),
('CS202','Operating Systems'),
('CS301','Computer Networks'),
('CS302','Software Engineering');

INSERT INTO topics (subject_id, topic_name) VALUES
(1,'Arrays'),(1,'Stacks'),(1,'Queues'),(1,'Trees'),
(2,'Sorting'),(2,'Dynamic Programming'),
(3,'Normalization'),(3,'Transactions'),
(4,'Deadlocks'),(4,'CPU Scheduling');
