-- ==============================================================================
-- ETHIOPIAN ROADS ADMINISTRATION (ERA) ERP & ROAD MANAGEMENT SYSTEM
-- Traditional MySQL Database Schema for Ethio Telecom Web Hosting (cPanel / Linux)
-- Database Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Target Host: localhost or lin1.ethiotelecom.et / eradashboard.com.et
-- Port: 3306
-- ==============================================================================

-- 1. Create Database (If creating manually in cPanel, select utf8mb4_unicode_ci)
-- Note: On shared cPanel hosting, databases are usually named with a cPanel prefix,
-- e.g., `eradashb_db` or `yourusername_eradb`. Adjust the database name as required.

CREATE DATABASE IF NOT EXISTS `era_dashboard` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `era_dashboard`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+03:00"; -- East Africa Time (Addis Ababa)

-- ==============================================================================
-- Table: projects
-- Stores primary road construction projects, BOQ line items, EVM milestones,
-- IPC payments, PAP/Right-of-Way ledgers, and contractor/consultant records.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(120) NOT NULL COMMENT 'Unique project identifier (e.g. proj_101 or UUID)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Road project official title in English or Amharic',
  `program_directorate` VARCHAR(120) DEFAULT NULL COMMENT 'ERA Directorate (Northern, Southern, Central, Eastern, Western)',
  `pmo` VARCHAR(120) DEFAULT NULL COMMENT 'Project Management Office branch (e.g. PMO 1, PMO 2)',
  `contractor` VARCHAR(255) DEFAULT NULL COMMENT 'Contractor entity name',
  `consultant` VARCHAR(255) DEFAULT NULL COMMENT 'Supervising consultant entity name',
  `physical_progress` DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Actual physical progress percentage (0.00 - 100.00)',
  `financial_progress` DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Actual financial disbursement percentage (0.00 - 100.00)',
  `total_budget` DECIMAL(18,2) DEFAULT 0.00 COMMENT 'Contract sum / total allocated budget in ETB',
  `disbursed_amount` DECIMAL(18,2) DEFAULT 0.00 COMMENT 'Total cumulative certified disbursements in ETB',
  `status` VARCHAR(60) DEFAULT 'Active' COMMENT 'Project status: Active, Substantially Completed, Terminated, Suspended',
  `last_modified_section` VARCHAR(120) DEFAULT NULL COMMENT 'Section name last updated (e.g. Financials, EVM, ROW)',
  `last_modified_at` VARCHAR(100) DEFAULT NULL COMMENT 'ISO timestamp of last modification',
  `data` LONGTEXT NOT NULL COMMENT 'Complete normalized JSON payload of all project modules and records',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Automatic last update timestamp',
  PRIMARY KEY (`id`),
  INDEX `idx_projects_directorate` (`program_directorate`),
  INDEX `idx_projects_pmo` (`pmo`),
  INDEX `idx_projects_status` (`status`),
  INDEX `idx_projects_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ERA Road Construction Projects Ledger';

-- ==============================================================================
-- Table: users
-- User accounts, authentication credentials, role-based access control (RBAC),
-- and assigned accessible road projects.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `username` VARCHAR(120) NOT NULL COMMENT 'Unique user login username (case-insensitive key)',
  `full_name` VARCHAR(255) NOT NULL COMMENT 'Official display name',
  `password` VARCHAR(255) DEFAULT NULL COMMENT 'Password or hashed token credential',
  `role` VARCHAR(60) NOT NULL DEFAULT 'viewer' COMMENT 'Access role: admin, editor, approver, viewer',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'Official government / organization email address',
  `accessible_projects` TEXT DEFAULT NULL COMMENT 'Comma-separated project IDs or * for all access',
  `data` LONGTEXT NOT NULL COMMENT 'Complete user profile JSON payload',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Authorized ERA Users and Role Permissions';

-- ==============================================================================
-- Table: approvals
-- Multi-tier workflow approvals for IPC certifications, variation orders,
-- and milestone compliance audits.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `approvals` (
  `id` VARCHAR(120) NOT NULL COMMENT 'Unique approval request identifier',
  `project_id` VARCHAR(120) NOT NULL COMMENT 'Associated project identifier',
  `section` VARCHAR(255) NOT NULL COMMENT 'Workflow section (e.g. IPC #14 Certification, Claim Determination)',
  `status` VARCHAR(60) NOT NULL DEFAULT 'pending' COMMENT 'Status: pending, approved, rejected',
  `requested_by` VARCHAR(120) DEFAULT NULL COMMENT 'Username of submitter',
  `approved_by` VARCHAR(120) DEFAULT NULL COMMENT 'Username of final approver',
  `data` LONGTEXT NOT NULL COMMENT 'Complete approval detail JSON payload',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_approvals_project` (`project_id`),
  INDEX `idx_approvals_status` (`status`),
  INDEX `idx_approvals_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Multi-tier Engineering & Financial Approvals';

-- ==============================================================================
-- Table: config
-- System-wide master settings, FIDIC & EVM scoring weight models,
-- and organization defaults.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `config` (
  `config_key` VARCHAR(120) NOT NULL COMMENT 'Configuration key name',
  `data` LONGTEXT NOT NULL COMMENT 'Configuration value JSON payload',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System Configuration & Master Scoring Models';

-- ==============================================================================
-- Table: deleted_projects
-- Tombstone table to synchronize and prevent resurrecting deleted road projects
-- across distributed offline and mobile clients.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `deleted_projects` (
  `id` VARCHAR(120) NOT NULL COMMENT 'ID of deleted road project',
  `project_name` VARCHAR(255) DEFAULT NULL COMMENT 'Archived name of project',
  `deleted_by` VARCHAR(120) DEFAULT NULL COMMENT 'User who deleted the project',
  `deleted_at` VARCHAR(100) NOT NULL COMMENT 'Timestamp when deletion occurred',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Deleted Projects Tombstone Ledger';

-- ==============================================================================
-- Table: sync_logs
-- Audit log of synchronization actions performed between local cache and MySQL.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `sync_logs` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `record_type` VARCHAR(60) NOT NULL COMMENT 'project, user, approval, config',
  `record_id` VARCHAR(120) NOT NULL,
  `action` VARCHAR(60) NOT NULL COMMENT 'upsert, delete, sync_all',
  `author` VARCHAR(120) DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_synclog_type_id` (`record_type`, `record_id`),
  INDEX `idx_synclog_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bidirectional Synchronization Audit Trail';

-- ==============================================================================
-- Default Seed Data for Ethio Telecom MySQL Hosting Installation
-- ==============================================================================

-- 1. Seed Master Administrator and Default Users
INSERT INTO `users` (`username`, `full_name`, `password`, `role`, `email`, `accessible_projects`, `data`)
VALUES
  (
    'ersidoabay',
    'Ersido Abayneh',
    'Helikina@#045536',
    'admin',
    'ErsidoAbayneh@gmail.com',
    '*',
    '{"username":"ersidoabay","fullName":"Ersido Abayneh","password":"Helikina@#045536","role":"admin","email":"ErsidoAbayneh@gmail.com","accessibleProjects":[]}'
  ),
  (
    'user',
    'Standard Project Engineer',
    'user123',
    'editor',
    'engineer@era.gov.et',
    '*',
    '{"username":"user","fullName":"Standard Project Engineer","password":"user123","role":"editor","email":"engineer@era.gov.et","accessibleProjects":[]}'
  ),
  (
    'viewer',
    'Executive Guest Viewer',
    'view123',
    'viewer',
    'director@era.gov.et',
    '*',
    '{"username":"viewer","fullName":"Executive Guest Viewer","password":"view123","role":"viewer","email":"director@era.gov.et","accessibleProjects":[]}'
  ),
  (
    'approver',
    'Quality & IPC Approver',
    '12345',
    'approver',
    'approvals@era.gov.et',
    '*',
    '{"username":"approver","fullName":"Quality & IPC Approver","password":"12345","role":"approver","email":"approvals@era.gov.et","accessibleProjects":[]}'
  )
ON DUPLICATE KEY UPDATE 
  `full_name` = VALUES(`full_name`),
  `role` = VALUES(`role`),
  `data` = VALUES(`data`);

-- 2. Seed Master Configuration: Scoring Weights Models
INSERT INTO `config` (`config_key`, `data`)
VALUES
  (
    'scoring_weights',
    '{"contractor":{"fidic":15,"projectMgmt":15,"evm":15,"kpi":15,"linear":15,"rfi":10,"materialApproval":10,"workInspection":5,"resourceMobilization":5,"custom":[]},"consultant":{"sla":25,"staff":20,"ipc":20,"claims":20,"quality":15,"custom":[]}}'
  ),
  (
    'system_info',
    '{"host":"lin1.ethiotelecom.et","provider":"Ethio Telecom Web Hosting","databaseEngine":"MySQL InnoDB utf8mb4","version":"2.4.0","country":"Ethiopia"}'
  )
ON DUPLICATE KEY UPDATE 
  `data` = VALUES(`data`);

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- Schema Installation Complete
-- To import in cPanel phpMyAdmin:
-- 1. Select your MySQL database (e.g. `eradashb_db`)
-- 2. Click the "Import" tab
-- 3. Choose this file (ethiotelecom_mysql_schema.sql) and click "Go"
-- ==============================================================================
