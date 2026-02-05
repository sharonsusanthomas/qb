-- Add status column to questions table

USE question_bank;

-- Add status enum column
ALTER TABLE questions 
ADD COLUMN status ENUM('DEDUPE_PENDING', 'DEDUPE_APPROVED', 'APPROVED') 
DEFAULT 'DEDUPE_PENDING' 
AFTER question_text;

-- Update existing questions to DEDUPE_PENDING
UPDATE questions SET status = 'DEDUPE_PENDING' WHERE status IS NULL;
