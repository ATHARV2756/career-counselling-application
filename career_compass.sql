-- ================================================================
-- Career Compass Database Schema
-- Import this file into phpMyAdmin to create the full database
-- ================================================================

CREATE DATABASE IF NOT EXISTS career_compass CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE career_compass;

-- ================================================================
-- 1. USERS TABLE (Students / Regular Users)
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    stream VARCHAR(50) DEFAULT NULL,
    grade_level VARCHAR(30) DEFAULT NULL,
    profile_image VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 2. ADMINS & COUNSELLORS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'counsellor') NOT NULL DEFAULT 'counsellor',
    specialty VARCHAR(100) DEFAULT NULL,
    experience VARCHAR(50) DEFAULT NULL,
    rating DECIMAL(2,1) DEFAULT 0.0,
    avatar_color VARCHAR(20) DEFAULT '#4A90E2',
    bio TEXT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 3. CAREERS TABLE (50+ career options)
-- ================================================================
CREATE TABLE IF NOT EXISTS careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    salary_range VARCHAR(100) DEFAULT NULL,
    growth VARCHAR(100) DEFAULT NULL,
    skills JSON DEFAULT NULL,
    roadmap JSON DEFAULT NULL,
    education_required VARCHAR(255) DEFAULT NULL,
    match_keywords JSON DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ================================================================
-- 4. ASSESSMENT RESPONSES TABLE (Raw assessment data)
-- ================================================================
CREATE TABLE IF NOT EXISTS assessment_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_type ENUM('aptitude', 'interest', 'personality') NOT NULL,
    responses JSON NOT NULL,
    score DECIMAL(5,2) DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ================================================================
-- 5. REPORTS TABLE (Generated career recommendation reports)
-- ================================================================
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    report_title VARCHAR(200) DEFAULT 'Career Recommendation Report',
    aptitude_score DECIMAL(5,2) DEFAULT NULL,
    interest_profile JSON DEFAULT NULL,
    personality_profile JSON DEFAULT NULL,
    recommended_careers JSON DEFAULT NULL,
    summary TEXT DEFAULT NULL,
    strengths JSON DEFAULT NULL,
    areas_to_improve JSON DEFAULT NULL,
    status ENUM('pending', 'generated', 'reviewed') DEFAULT 'generated',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT DEFAULT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ================================================================
-- DEFAULT ADMIN & COUNSELLOR ACCOUNTS
-- Passwords are: admin123 and counsellor123 (bcrypt hashed)
-- ================================================================
INSERT INTO admins (name, email, password, role, specialty, experience, rating, avatar_color, bio) VALUES
('System Admin', 'admin@careercompass.com', '$2y$10$8K1p/a0dVxGMaBjKQe3Yp.3Oi1YdP3FQvZ8Kiz2nG8gJwX5FN1nWe', 'admin', 'System Administration', '10+ years', 5.0, '#7C3AED', 'System administrator with full platform access.'),
('Dr. Sarah Johnson', 'sarah@careercompass.com', '$2y$10$RZdVfQh9Y5tKhEibzA7tYeFNBpsqJz3nH6Q7nFfvtKx2mPb6AYxSW', 'counsellor', 'Technology & Engineering', '15+ years', 4.9, '#4A90E2', 'Expert in technology and engineering career guidance with 15+ years of industry experience.'),
('Michael Chen', 'michael@careercompass.com', '$2y$10$RZdVfQh9Y5tKhEibzA7tYeFNBpsqJz3nH6Q7nFfvtKx2mPb6AYxSW', 'counsellor', 'Business & Finance', '12+ years', 4.8, '#26A69A', 'Specialist in business and finance career paths with MBA from top university.'),
('Emily Rodriguez', 'emily@careercompass.com', '$2y$10$RZdVfQh9Y5tKhEibzA7tYeFNBpsqJz3nH6Q7nFfvtKx2mPb6AYxSW', 'counsellor', 'Healthcare & Medicine', '10+ years', 4.9, '#EC407A', 'Healthcare career counsellor with extensive background in nursing and medical education.'),
('David Williams', 'david@careercompass.com', '$2y$10$RZdVfQh9Y5tKhEibzA7tYeFNBpsqJz3nH6Q7nFfvtKx2mPb6AYxSW', 'counsellor', 'Creative Arts & Design', '8+ years', 4.7, '#FF9800', 'Creative arts career mentor specializing in design, writing, and media careers.');

-- ================================================================
-- INDEX CREATION FOR PERFORMANCE
-- ================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_careers_category ON careers(category);
CREATE INDEX idx_careers_stream ON careers(stream);
CREATE INDEX idx_assessment_user ON assessment_responses(user_id);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
