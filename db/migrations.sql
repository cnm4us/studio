-- Initial migration for Studio database
-- This file will evolve as we add tables for spaces, projects, definitions, and rendered assets.

CREATE TABLE IF NOT EXISTS schema_version (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_label VARCHAR(100) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

