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
