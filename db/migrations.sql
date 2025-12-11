-- This file will evolve as we add tables for users, spaces, projects, definitions, and rendered assets.

CREATE TABLE IF NOT EXISTS schema_version (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_label VARCHAR(100) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Core auth and ownership tables

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spaces (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_spaces_user_id FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT ux_spaces_user_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  space_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_space_id FOREIGN KEY (space_id) REFERENCES spaces(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT ux_projects_space_name UNIQUE (space_id, name)
);

-- Minimal definitions table for characters/scenes with lineage fields

CREATE TABLE IF NOT EXISTS definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type ENUM('character', 'scene', 'style') NOT NULL,
  scope ENUM('space', 'project') NOT NULL,
  space_id INT UNSIGNED NULL,
  project_id INT UNSIGNED NULL,
  root_id INT UNSIGNED NULL,
  parent_id INT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  state ENUM('draft', 'canonical', 'deprecated', 'archived') NOT NULL DEFAULT 'draft',
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_definitions_space_id FOREIGN KEY (space_id) REFERENCES spaces(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_definitions_project_id FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_definitions_root_id FOREIGN KEY (root_id) REFERENCES definitions(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_definitions_parent_id FOREIGN KEY (parent_id) REFERENCES definitions(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_definitions_space_type (space_id, type),
  INDEX idx_definitions_project_type (project_id, type),
  INDEX idx_definitions_root (root_id),
  INDEX idx_definitions_parent (parent_id)
);

-- Tasks and rendered assets for basic render pipeline

CREATE TABLE IF NOT EXISTS tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  prompt TEXT NULL,
  status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_tasks_project_status (project_id, status)
);

CREATE TABLE IF NOT EXISTS rendered_assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  task_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  file_key VARCHAR(512) NOT NULL,
  file_url TEXT NOT NULL,
  metadata JSON NULL,
  state ENUM('draft', 'approved', 'archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rendered_assets_project_id FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_rendered_assets_task_id FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_rendered_assets_project (project_id),
  INDEX idx_rendered_assets_task (task_id)
);
