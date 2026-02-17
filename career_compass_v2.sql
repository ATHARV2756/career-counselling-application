-- ================================================================
-- Career Compass V2 Migration
-- Run this in phpMyAdmin AFTER the original career_compass.sql
-- ================================================================

USE career_compass;

-- ================================================================
-- ADD COLUMNS TO ADMINS TABLE
-- ================================================================
ALTER TABLE admins ADD COLUMN admin_code VARCHAR(50) DEFAULT NULL AFTER password;
ALTER TABLE admins ADD COLUMN counsellor_id VARCHAR(20) DEFAULT NULL AFTER admin_code;

-- Set default admin code for existing admin
UPDATE admins SET admin_code = 'CC-ADMIN-2026' WHERE role = 'admin';

-- Set counsellor IDs for existing counsellors
UPDATE admins SET counsellor_id = 'CC-1001' WHERE email = 'sarah@careercompass.com';
UPDATE admins SET counsellor_id = 'CC-1002' WHERE email = 'michael@careercompass.com';
UPDATE admins SET counsellor_id = 'CC-1003' WHERE email = 'emily@careercompass.com';
UPDATE admins SET counsellor_id = 'CC-1004' WHERE email = 'david@careercompass.com';

-- ================================================================
-- CHAT MESSAGES TABLE (Persistent chat storage)
-- ================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    sender_role ENUM('student', 'counsellor', 'admin') NOT NULL,
    receiver_id INT NOT NULL,
    receiver_role ENUM('student', 'counsellor', 'admin') NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    is_saved TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- APPOINTMENTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    counsellor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT DEFAULT NULL,
    student_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (counsellor_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ================================================================
-- ACTIVITY LOG TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    user_role ENUM('student', 'counsellor', 'admin') DEFAULT 'student',
    user_name VARCHAR(100) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX idx_chat_sender ON chat_messages(sender_id, sender_role);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id, receiver_role);
CREATE INDEX idx_chat_saved ON chat_messages(is_saved);
CREATE INDEX idx_appointments_student ON appointments(student_id);
CREATE INDEX idx_appointments_counsellor ON appointments(counsellor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_activity_created ON activity_log(created_at);

