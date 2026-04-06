-- Categorize old logs based on endpoint
UPDATE ai_logs SET feature = 'Dictionary Lookup' WHERE feature IS NULL AND endpoint LIKE '%dict%';
UPDATE ai_logs SET feature = 'Grammar Practice' WHERE feature IS NULL AND (endpoint LIKE '%grammar%' OR endpoint LIKE '%luyen_ngu_phap%');
UPDATE ai_logs SET feature = 'Vocab Extraction' WHERE feature IS NULL AND endpoint LIKE '%vocab%';
UPDATE ai_logs SET feature = 'Reading Passage' WHERE feature IS NULL AND endpoint LIKE '%reading%';
UPDATE ai_logs SET feature = 'IPA Lesson' WHERE feature IS NULL AND endpoint LIKE '%ipa%';
UPDATE ai_logs SET feature = 'Writing Evaluation' WHERE feature IS NULL AND endpoint LIKE '%writing%';
UPDATE ai_logs SET feature = 'Legacy' WHERE feature IS NULL;
