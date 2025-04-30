-- Users table for "Fill in the Math" system
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(64) NOT NULL,
  date_registered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  profile_picture INTEGER, 
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('Player', 'Host', 'Admin')),
  experience INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);