-- Alter the events table to increase event_type column length
ALTER TABLE events MODIFY COLUMN event_type VARCHAR(50) NOT NULL; 