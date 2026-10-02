package migration

// Migration merepresentasikan satu file migrasi (up + down).
type Migration struct {
	Name string
	Up   string
	Down string
}

// Migrations — daftar migrasi berurutan. Tabel `migrations` akan
// mencatat mana yang sudah dijalankan.
var Migrations = []Migration{
	// ============================================================
	// 1. DEPARTMENTS
	// ============================================================
	{
		Name: "20260101_000001_create_departments_table",
		Up: `
			CREATE TABLE IF NOT EXISTS departments (
				id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				name        VARCHAR(100) NOT NULL UNIQUE,
				code        VARCHAR(20)  NOT NULL UNIQUE,
				description TEXT,
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				deleted_at  TIMESTAMP NULL DEFAULT NULL,
				INDEX idx_departments_deleted_at (deleted_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS departments;`,
	},

	// ============================================================
	// 2. USERS
	// ============================================================
	{
		Name: "20260101_000002_create_users_table",
		Up: `
			CREATE TABLE IF NOT EXISTS users (
				id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				department_id BIGINT UNSIGNED NOT NULL,
				name          VARCHAR(150) NOT NULL,
				email         VARCHAR(150) NOT NULL UNIQUE,
				password_hash VARCHAR(255) NOT NULL,
				role          ENUM('admin','manager','member','viewer') NOT NULL DEFAULT 'member',
				avatar_url    VARCHAR(500),
				position      VARCHAR(100),
				is_active     TINYINT(1) NOT NULL DEFAULT 1,
				last_login_at TIMESTAMP NULL DEFAULT NULL,
				created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				deleted_at    TIMESTAMP NULL DEFAULT NULL,
				CONSTRAINT fk_users_department FOREIGN KEY (department_id)
					REFERENCES departments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
				INDEX idx_users_department (department_id),
				INDEX idx_users_role (role),
				INDEX idx_users_active (is_active),
				INDEX idx_users_deleted_at (deleted_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS users;`,
	},

	// ============================================================
	// 3. PROJECTS
	// ============================================================
	{
		Name: "20260101_000003_create_projects_table",
		Up: `
			CREATE TABLE IF NOT EXISTS projects (
				id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				department_id BIGINT UNSIGNED NOT NULL,
				owner_id      BIGINT UNSIGNED NOT NULL,
				name          VARCHAR(200) NOT NULL,
				key_prefix    VARCHAR(10)  NOT NULL UNIQUE,
				description   TEXT,
				status        ENUM('planning','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning',
				color         VARCHAR(7) DEFAULT '#0D9488',
				start_date    DATE,
				end_date      DATE,
				progress      DECIMAL(5,2) NOT NULL DEFAULT 0.00,
				created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				deleted_at    TIMESTAMP NULL DEFAULT NULL,
				CONSTRAINT fk_projects_department FOREIGN KEY (department_id)
					REFERENCES departments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
				CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id)
					REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
				INDEX idx_projects_department (department_id),
				INDEX idx_projects_status (status),
				INDEX idx_projects_owner (owner_id),
				INDEX idx_projects_dept_status (department_id, status),
				INDEX idx_projects_deleted_at (deleted_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS projects;`,
	},

	// ============================================================
	// 4. PROJECT MEMBERS
	// ============================================================
	{
		Name: "20260101_000004_create_project_members_table",
		Up: `
			CREATE TABLE IF NOT EXISTS project_members (
				id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				project_id BIGINT UNSIGNED NOT NULL,
				user_id    BIGINT UNSIGNED NOT NULL,
				role       ENUM('lead','member','observer') NOT NULL DEFAULT 'member',
				joined_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE KEY uk_project_user (project_id, user_id),
				CONSTRAINT fk_pm_project FOREIGN KEY (project_id)
					REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_pm_user FOREIGN KEY (user_id)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				INDEX idx_pm_user (user_id)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS project_members;`,
	},

	// ============================================================
	// 5. SPRINTS
	// ============================================================
	{
		Name: "20260101_000005_create_sprints_table",
		Up: `
			CREATE TABLE IF NOT EXISTS sprints (
				id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				project_id       BIGINT UNSIGNED NOT NULL,
				name             VARCHAR(150) NOT NULL,
				goal             TEXT,
				status           ENUM('backlog','active','completed','cancelled') NOT NULL DEFAULT 'backlog',
				start_date       DATE,
				end_date         DATE,
				total_points     INT NOT NULL DEFAULT 0,
				completed_points INT NOT NULL DEFAULT 0,
				created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				deleted_at       TIMESTAMP NULL DEFAULT NULL,
				CONSTRAINT fk_sprints_project FOREIGN KEY (project_id)
					REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
				INDEX idx_sprints_project (project_id),
				INDEX idx_sprints_status (status),
				INDEX idx_sprints_project_status (project_id, status),
				INDEX idx_sprints_deleted_at (deleted_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS sprints;`,
	},

	// ============================================================
	// 6. TASKS
	// ============================================================
	{
		Name: "20260101_000006_create_tasks_table",
		Up: `
			CREATE TABLE IF NOT EXISTS tasks (
				id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				project_id     BIGINT UNSIGNED NOT NULL,
				sprint_id      BIGINT UNSIGNED NULL,
				parent_task_id BIGINT UNSIGNED NULL,
				reporter_id    BIGINT UNSIGNED NOT NULL,
				title          VARCHAR(300) NOT NULL,
				description    TEXT,
				status         ENUM('backlog','todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
				priority       ENUM('lowest','low','medium','high','highest') NOT NULL DEFAULT 'medium',
				type           ENUM('story','task','bug','epic','subtask') NOT NULL DEFAULT 'task',
				objective      ENUM('daily','troubleshooting','compliance','improvement','new_project') NOT NULL DEFAULT 'daily',
				progress_level VARCHAR(20) NOT NULL DEFAULT 'not_started',
				story_points   INT NOT NULL DEFAULT 3,
				position       INT NOT NULL DEFAULT 0,
				due_date       DATE,
				started_at     TIMESTAMP NULL DEFAULT NULL,
				completed_at   TIMESTAMP NULL DEFAULT NULL,
				created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				deleted_at     TIMESTAMP NULL DEFAULT NULL,
				CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
					REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_tasks_sprint FOREIGN KEY (sprint_id)
					REFERENCES sprints(id) ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
					REFERENCES tasks(id) ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT fk_tasks_reporter FOREIGN KEY (reporter_id)
					REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
				INDEX idx_tasks_project (project_id),
				INDEX idx_tasks_sprint (sprint_id),
				INDEX idx_tasks_status (status),
				INDEX idx_tasks_priority (priority),
				INDEX idx_tasks_objective (objective),
				INDEX idx_tasks_progress (progress_level),
				INDEX idx_tasks_due_date (due_date),
				INDEX idx_tasks_sprint_status (sprint_id, status),
				INDEX idx_tasks_deleted_at (deleted_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS tasks;`,
	},

	// ============================================================
	// 7. TASK ASSIGNEES
	// ============================================================
	{
		Name: "20260101_000007_create_task_assignees_table",
		Up: `
			CREATE TABLE IF NOT EXISTS task_assignees (
				id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				task_id     BIGINT UNSIGNED NOT NULL,
				user_id     BIGINT UNSIGNED NOT NULL,
				assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE KEY uk_task_user (task_id, user_id),
				CONSTRAINT fk_ta_task FOREIGN KEY (task_id)
					REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_ta_user FOREIGN KEY (user_id)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				INDEX idx_ta_user (user_id)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS task_assignees;`,
	},

	// ============================================================
	// 8. COMMENTS
	// ============================================================
	{
		Name: "20260101_000008_create_comments_table",
		Up: `
			CREATE TABLE IF NOT EXISTS comments (
				id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				task_id    BIGINT UNSIGNED NOT NULL,
				user_id    BIGINT UNSIGNED NOT NULL,
				parent_id  BIGINT UNSIGNED NULL,
				body       TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				deleted_at TIMESTAMP NULL DEFAULT NULL,
				CONSTRAINT fk_comments_task FOREIGN KEY (task_id)
					REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_comments_user FOREIGN KEY (user_id)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id)
					REFERENCES comments(id) ON DELETE CASCADE ON UPDATE CASCADE,
				INDEX idx_comments_task (task_id),
				INDEX idx_comments_user (user_id),
				INDEX idx_comments_parent (parent_id),
				INDEX idx_comments_deleted_at (deleted_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS comments;`,
	},

	// ============================================================
	// 9. ATTACHMENTS
	// ============================================================
	{
		Name: "20260101_000009_create_attachments_table",
		Up: `
			CREATE TABLE IF NOT EXISTS attachments (
				id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				task_id     BIGINT UNSIGNED NOT NULL,
				comment_id  BIGINT UNSIGNED NULL,
				uploaded_by BIGINT UNSIGNED NOT NULL,
				file_name   VARCHAR(255) NOT NULL,
				file_path   VARCHAR(500) NOT NULL,
				file_size   BIGINT UNSIGNED NOT NULL DEFAULT 0,
				mime_type   VARCHAR(100),
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_attachments_task FOREIGN KEY (task_id)
					REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_attachments_comment FOREIGN KEY (comment_id)
					REFERENCES comments(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_attachments_user FOREIGN KEY (uploaded_by)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				INDEX idx_attachments_task (task_id),
				INDEX idx_attachments_comment (comment_id),
				INDEX idx_attachments_uploader (uploaded_by)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS attachments;`,
	},

	// ============================================================
	// 10. ACTIVITY LOGS
	// ============================================================
	{
		Name: "20260101_000010_create_activity_logs_table",
		Up: `
			CREATE TABLE IF NOT EXISTS activity_logs (
				id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id     BIGINT UNSIGNED NOT NULL,
				project_id  BIGINT UNSIGNED NULL,
				task_id     BIGINT UNSIGNED NULL,
				action      VARCHAR(50) NOT NULL,
				entity_type VARCHAR(50) NOT NULL,
				entity_id   BIGINT UNSIGNED NOT NULL,
				old_values  JSON,
				new_values  JSON,
				description VARCHAR(500),
				ip_address  VARCHAR(45),
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_al_user FOREIGN KEY (user_id)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_al_project FOREIGN KEY (project_id)
					REFERENCES projects(id) ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT fk_al_task FOREIGN KEY (task_id)
					REFERENCES tasks(id) ON DELETE SET NULL ON UPDATE CASCADE,
				INDEX idx_al_user (user_id),
				INDEX idx_al_entity (entity_type, entity_id),
				INDEX idx_al_project (project_id),
				INDEX idx_al_task (task_id),
				INDEX idx_al_created_at (created_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS activity_logs;`,
	},

	// ============================================================
	// 11. NOTIFICATIONS
	// ============================================================
	{
		Name: "20260101_000011_create_notifications_table",
		Up: `
			CREATE TABLE IF NOT EXISTS notifications (
				id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id     BIGINT UNSIGNED NOT NULL,
				actor_id    BIGINT UNSIGNED NULL,
				type        VARCHAR(50) NOT NULL,
				title       VARCHAR(200) NOT NULL,
				body        TEXT,
				entity_type VARCHAR(50),
				entity_id   BIGINT UNSIGNED,
				link        VARCHAR(500),
				is_read     TINYINT(1) NOT NULL DEFAULT 0,
				read_at     TIMESTAMP NULL DEFAULT NULL,
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id)
					REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
				INDEX idx_notif_user_read (user_id, is_read),
				INDEX idx_notif_user_created (user_id, created_at),
				INDEX idx_notif_created_at (created_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS notifications;`,
	},

	// ============================================================
	// 12. AUDIT TRAILS
	// ============================================================
	{
		Name: "20260101_000012_create_audit_trails_table",
		Up: `
			CREATE TABLE IF NOT EXISTS audit_trails (
				id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
				user_id        BIGINT UNSIGNED NOT NULL,
				action         VARCHAR(50) NOT NULL,
				table_name     VARCHAR(64) NOT NULL,
				record_id      BIGINT UNSIGNED NOT NULL,
				old_data       JSON,
				new_data       JSON,
				changed_fields JSON,
				ip_address     VARCHAR(45),
				user_agent     VARCHAR(255),
				created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_at_user FOREIGN KEY (user_id)
					REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
				INDEX idx_at_table_record (table_name, record_id),
				INDEX idx_at_user (user_id),
				INDEX idx_at_created_at (created_at)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
		`,
		Down: `DROP TABLE IF EXISTS audit_trails;`,
	},

	// ============================================================
	// 13. ADD owner_id TO SPRINTS  ⭐ NEW
	//
	// Setiap sprint dimiliki 1 user. Digunakan untuk "personal sprint"
	// — 1 sprint template di-seed × N member → N sprint terpisah
	//   dengan owner_id berbeda.
	//
	// NULL = sprint lama / team sprint (backward-compatible).
	// ============================================================
	{
		Name: "20260102_000001_add_owner_id_to_sprints",
		Up: `
			ALTER TABLE sprints
				ADD COLUMN owner_id BIGINT UNSIGNED NULL AFTER project_id;

			ALTER TABLE sprints
				ADD CONSTRAINT fk_sprints_owner FOREIGN KEY (owner_id)
					REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

			ALTER TABLE sprints
				ADD INDEX idx_sprints_owner (owner_id);
		`,
		Down: `
			ALTER TABLE sprints DROP FOREIGN KEY fk_sprints_owner;
			ALTER TABLE sprints DROP INDEX idx_sprints_owner;
			ALTER TABLE sprints DROP COLUMN owner_id;
		`,
	},
}