package repositories

import (
	"database/sql"
	"fmt"
	"strings"

	"backend/models"
)

type TaskRepository struct {
	DB *sql.DB
}

func NewTaskRepository(db *sql.DB) *TaskRepository {
	return &TaskRepository{DB: db}
}

type TaskWithMeta struct {
	models.Task
	AssigneeID   *uint64 `json:"assignee_id"`
	AssigneeName string  `json:"assignee_name"`
	AssigneeDept string  `json:"assignee_dept"`
	ProjectName  string  `json:"project_name"`
	DepartmentID uint64  `json:"department_id"`
}

const taskSelectQuery = `
	SELECT t.id, t.project_id, t.sprint_id, t.parent_task_id, t.reporter_id,
	       t.title, COALESCE(t.description,''), t.status, t.priority, t.type,
	       t.objective, t.progress_level, t.story_points, t.position, t.due_date,
	       t.created_at, t.updated_at,
	       ta.user_id AS assignee_id,
	       COALESCE(u.name, '') AS assignee_name,
	       COALESCE(d.code, '') AS assignee_dept,
	       COALESCE(p.name, '') AS project_name,
	       COALESCE(p.department_id, 0) AS department_id
	FROM tasks t
	LEFT JOIN task_assignees ta ON ta.task_id = t.id
	LEFT JOIN users u ON u.id = ta.user_id
	LEFT JOIN departments d ON d.id = u.department_id
	LEFT JOIN projects p ON p.id = t.project_id`

func scanTaskRow(rows interface {
	Scan(dest ...interface{}) error
}) (*TaskWithMeta, error) {
	var t TaskWithMeta
	if err := rows.Scan(
		&t.ID, &t.ProjectID, &t.SprintID, &t.ParentTaskID, &t.ReporterID,
		&t.Title, &t.Description, &t.Status, &t.Priority, &t.Type,
		&t.Objective, &t.ProgressLevel, &t.StoryPoints, &t.Position, &t.DueDate,
		&t.CreatedAt, &t.UpdatedAt,
		&t.AssigneeID, &t.AssigneeName, &t.AssigneeDept,
		&t.ProjectName, &t.DepartmentID,
	); err != nil {
		return nil, err
	}
	return &t, nil
}

func scanTaskRows(rows *sql.Rows) ([]TaskWithMeta, error) {
	var out []TaskWithMeta
	for rows.Next() {
		t, err := scanTaskRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

// ============================================================
// appendUserScope
// ============================================================
func appendUserScope(q string, args *[]interface{}, deptID, userID uint64, isSuperadmin bool) string {
	if isSuperadmin {
		return q
	}
	if deptID > 0 && userID > 0 {
		q += ` AND (
			p.department_id = ?
			OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = ?)
		)`
		*args = append(*args, deptID, userID)
	} else if deptID > 0 {
		q += " AND p.department_id = ?"
		*args = append(*args, deptID)
	} else if userID > 0 {
		q += ` AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = ?)`
		*args = append(*args, userID)
	}
	return q
}

// ============================================================
// LIST
// ============================================================
func (r *TaskRepository) List(deptID, userID uint64, isSuperadmin bool) ([]TaskWithMeta, error) {
	q := taskSelectQuery + " WHERE t.deleted_at IS NULL"
	args := []interface{}{}
	q = appendUserScope(q, &args, deptID, userID, isSuperadmin)
	q += " ORDER BY t.position ASC, t.id DESC"

	rows, err := r.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTaskRows(rows)
}

// ============================================================
// LIST BACKLOG
// ============================================================
func (r *TaskRepository) ListBacklog(deptID, userID uint64, isSuperadmin bool) ([]TaskWithMeta, error) {
	q := taskSelectQuery + `
		WHERE t.deleted_at IS NULL
		  AND t.sprint_id IS NULL
		  AND t.status = 'backlog'
		  AND ta.user_id IS NULL`
	args := []interface{}{}
	q = appendUserScope(q, &args, deptID, userID, isSuperadmin)
	q += " ORDER BY t.id DESC"

	rows, err := r.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTaskRows(rows)
}

// ============================================================
// LIST BY SPRINT
// ============================================================
func (r *TaskRepository) ListBySprint(sprintID uint64) ([]TaskWithMeta, error) {
	q := taskSelectQuery + " WHERE t.deleted_at IS NULL AND t.sprint_id = ?"
	q += " ORDER BY t.position ASC, t.id DESC"

	rows, err := r.DB.Query(q, sprintID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTaskRows(rows)
}

// ============================================================
// LIST ASSIGNED
// ============================================================
func (r *TaskRepository) ListAssigned(deptID, userID uint64, isSuperadmin bool) ([]TaskWithMeta, error) {
	q := taskSelectQuery + `
		WHERE t.deleted_at IS NULL
		  AND (
		    (ta.user_id IS NOT NULL AND t.status != 'backlog')
		    OR t.sprint_id IS NOT NULL
		  )`
	args := []interface{}{}
	q = appendUserScope(q, &args, deptID, userID, isSuperadmin)
	q += " ORDER BY t.position ASC, t.id DESC"

	rows, err := r.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTaskRows(rows)
}

// ============================================================
// FIND BY ID
// ============================================================
func (r *TaskRepository) FindByID(id uint64) (*TaskWithMeta, error) {
	row := r.DB.QueryRow(taskSelectQuery+" WHERE t.id = ? AND t.deleted_at IS NULL LIMIT 1", id)
	t, err := scanTaskRow(row)
	if err != nil {
		return nil, err
	}
	return t, nil
}

// ============================================================
// CREATE
// ============================================================
func (r *TaskRepository) Create(t *models.Task, assigneeID *uint64) (uint64, error) {
	hasAssignee := assigneeID != nil && *assigneeID > 0

	if hasAssignee {
		t.Status = "todo"
	} else {
		t.Status = "backlog"
	}
	if t.ProgressLevel == "" {
		t.ProgressLevel = "not_started"
	}

	res, err := r.DB.Exec(`
		INSERT INTO tasks
			(project_id, sprint_id, reporter_id, title, description, status,
			 priority, type, objective, progress_level, story_points, position, due_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		t.ProjectID, t.SprintID, t.ReporterID, t.Title, t.Description,
		t.Status, t.Priority, t.Type, t.Objective, t.ProgressLevel,
		t.StoryPoints, t.Position, t.DueDate,
	)
	if err != nil {
		return 0, err
	}
	taskID, _ := res.LastInsertId()

	if hasAssignee {
		_, _ = r.DB.Exec(
			`INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)`,
			taskID, *assigneeID,
		)
	}
	return uint64(taskID), nil
}

// ============================================================
// UPDATE
// ============================================================
func (r *TaskRepository) Update(t *models.Task, assigneeID *uint64) error {
	var existingStatus, existingProgress string
	var existingSprintID sql.NullInt64
	var existingAssignee sql.NullInt64
	err := r.DB.QueryRow(`
		SELECT t.status, t.progress_level, t.sprint_id,
		       (SELECT user_id FROM task_assignees WHERE task_id = t.id LIMIT 1)
		FROM tasks t WHERE t.id = ?
	`, t.ID).Scan(&existingStatus, &existingProgress, &existingSprintID, &existingAssignee)
	if err != nil {
		return err
	}

	var finalStatus string
	var finalProgress string

	hasNewAssignee := assigneeID != nil && *assigneeID > 0

	if hasNewAssignee {
		if existingStatus == "backlog" {
			finalStatus = "todo"
			finalProgress = "not_started"
		} else {
			finalStatus = existingStatus
			finalProgress = existingProgress
		}
	} else if assigneeID != nil && *assigneeID == 0 {
		finalStatus = "backlog"
		finalProgress = "not_started"
	} else {
		finalStatus = t.Status
		if finalStatus == "" {
			finalStatus = existingStatus
		}
		finalProgress = t.ProgressLevel
		if finalProgress == "" {
			finalProgress = existingProgress
		}
	}

	if finalProgress == "" {
		finalProgress = "not_started"
	}

	// Sprint: pertahankan existing kalau t.SprintID nil
	if t.SprintID == nil && existingSprintID.Valid {
		existing := uint64(existingSprintID.Int64)
		t.SprintID = &existing
	}

	_, err = r.DB.Exec(`
		UPDATE tasks SET
			title = ?, description = ?, status = ?, priority = ?,
			type = ?, objective = ?, progress_level = ?, story_points = ?,
			due_date = ?, sprint_id = ?
		WHERE id = ?
	`, t.Title, t.Description, finalStatus, t.Priority,
		t.Type, t.Objective, finalProgress, t.StoryPoints, t.DueDate,
		t.SprintID, t.ID)
	if err != nil {
		return err
	}

	if assigneeID != nil {
		_, _ = r.DB.Exec(`DELETE FROM task_assignees WHERE task_id = ?`, t.ID)
		if *assigneeID > 0 {
			_, _ = r.DB.Exec(
				`INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)`,
				t.ID, *assigneeID,
			)
		}
	}
	return nil
}

// ============================================================
// UPDATE STATUS
// ============================================================
func (r *TaskRepository) UpdateStatus(id uint64, status string) error {
	validStatuses := map[string]bool{
		"backlog": true, "todo": true, "in_progress": true,
		"review": true, "done": true,
	}
	if !validStatuses[status] {
		return fmt.Errorf("status tidak valid: %s", status)
	}

	progressLevel := "not_started"
	switch status {
	case "in_progress":
		progressLevel = "in_progress"
	case "review":
		progressLevel = "almost_done"
	case "done":
		progressLevel = "done"
	}

	var extra string
	switch status {
	case "in_progress":
		extra = ", started_at = COALESCE(started_at, NOW())"
	case "done":
		extra = ", completed_at = NOW()"
	}

	query := fmt.Sprintf(
		`UPDATE tasks SET status = ?, progress_level = ?%s WHERE id = ?`,
		extra,
	)
	_, err := r.DB.Exec(query, status, progressLevel, id)
	return err
}

// ============================================================
// UPDATE PROGRESS
// ============================================================
func (r *TaskRepository) UpdateProgress(id uint64, progressLevel string) error {
	valid := map[string]bool{
		"not_started": true, "in_progress": true,
		"almost_done": true, "done": true,
	}
	if !valid[progressLevel] {
		return fmt.Errorf("progress level tidak valid: %s", progressLevel)
	}
	_, err := r.DB.Exec(
		`UPDATE tasks SET progress_level = ? WHERE id = ?`,
		progressLevel, id,
	)
	return err
}

// ============================================================
// DELETE
// ============================================================
func (r *TaskRepository) Delete(id uint64) error {
	_, err := r.DB.Exec(
		`UPDATE tasks SET deleted_at = NOW() WHERE id = ?`, id,
	)
	return err
}

// ============================================================
// FIND DEFAULT PROJECT ID
// ============================================================
func (r *TaskRepository) FindDefaultProjectID() (uint64, error) {
	var id uint64
	err := r.DB.QueryRow(
		`SELECT id FROM projects WHERE deleted_at IS NULL LIMIT 1`,
	).Scan(&id)
	return id, err
}

// ============================================================
// COUNT BY STATUS
// ============================================================
func (r *TaskRepository) CountByStatus(deptID, userID uint64, isSuperadmin bool) (map[string]int, error) {
	q := `
		SELECT t.status, COUNT(*)
		FROM tasks t
		LEFT JOIN projects p ON p.id = t.project_id
		WHERE t.deleted_at IS NULL`
	args := []interface{}{}
	q = appendUserScope(q, &args, deptID, userID, isSuperadmin)
	q += " GROUP BY t.status"

	rows, err := r.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]int{
		"backlog": 0, "todo": 0, "in_progress": 0, "review": 0, "done": 0,
	}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		out[status] = count
	}
	return out, nil
}

// ============================================================
// COUNT OVERDUE
// ============================================================
func (r *TaskRepository) CountOverdue(deptID, userID uint64, isSuperadmin bool) (int, error) {
	q := `
		SELECT COUNT(*)
		FROM tasks t
		LEFT JOIN projects p ON p.id = t.project_id
		WHERE t.deleted_at IS NULL
		  AND t.due_date IS NOT NULL
		  AND t.due_date < CURDATE()
		  AND t.status != 'done'`
	args := []interface{}{}
	q = appendUserScope(q, &args, deptID, userID, isSuperadmin)

	var count int
	err := r.DB.QueryRow(q, args...).Scan(&count)
	return count, err
}

// ============================================================
// BULK ASSIGN
// ============================================================
func (r *TaskRepository) BulkAssignToSprint(taskIDs []uint64, sprintID uint64) error {
	if len(taskIDs) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(taskIDs))
	placeholders = placeholders[:len(placeholders)-1]
	args := []interface{}{sprintID}
	for _, id := range taskIDs {
		args = append(args, id)
	}
	query := fmt.Sprintf(`
		UPDATE tasks
		SET sprint_id = ?,
		    status = CASE WHEN status IN ('todo','backlog') THEN 'backlog' ELSE status END,
		    progress_level = CASE WHEN progress_level = 'not_started' THEN 'not_started' ELSE progress_level END
		WHERE id IN (%s) AND deleted_at IS NULL
	`, placeholders)
	_, err := r.DB.Exec(query, args...)
	return err
}

// ============================================================
// FindSprintForUser — cari sprint user (TIDAK buat baru)
//
// Dipertahankan untuk backward-compat. Untuk auto-link,
// gunakan FindOrCreateSprintForUser di bawah.
// ============================================================
func (r *TaskRepository) FindSprintForUser(userID, projectID uint64) *uint64 {
	var sprintID sql.NullInt64

	err := r.DB.QueryRow(`
		SELECT t.sprint_id
		FROM tasks t
		JOIN task_assignees ta ON ta.task_id = t.id
		JOIN sprints s ON s.id = t.sprint_id
		WHERE ta.user_id = ?
		  AND t.project_id = ?
		  AND t.sprint_id IS NOT NULL
		  AND t.deleted_at IS NULL
		  AND s.deleted_at IS NULL
		ORDER BY 
			CASE s.status WHEN 'active' THEN 0 ELSE 1 END,
			t.updated_at DESC
		LIMIT 1
	`, userID, projectID).Scan(&sprintID)

	if err == nil && sprintID.Valid && sprintID.Int64 > 0 {
		id := uint64(sprintID.Int64)
		return &id
	}

	err = r.DB.QueryRow(`
		SELECT id FROM sprints
		WHERE project_id = ?
		  AND status IN ('active', 'backlog')
		  AND deleted_at IS NULL
		ORDER BY 
			CASE status WHEN 'active' THEN 0 ELSE 1 END,
			id DESC
		LIMIT 1
	`, projectID).Scan(&sprintID)

	if err == nil && sprintID.Valid && sprintID.Int64 > 0 {
		id := uint64(sprintID.Int64)
		return &id
	}

	return nil
}

// ============================================================
// ⭐ FindOrCreateSprintForUser — KUNCI UTAMA AUTO-LINK
//
// Cari sprint untuk user. KALAU BELUM ADA → BUAT SPRINT BARU.
//
// Prioritas:
//   1. Sprint yang sudah punya task di-assign ke user (project sama)
//   2. Sprint active/backlog apa saja di project sama
//   3. BUAT SPRINT BARU untuk user:
//      - Nama: "Sprint - {UserName}"
//      - Status: backlog
//      - ProjectID: project task
//
// Dipanggil dari task_service.go di Create() & Update().
// ============================================================
func (r *TaskRepository) FindOrCreateSprintForUser(userID, projectID uint64) (*uint64, error) {
	var sprintID sql.NullInt64

	// ---- Prioritas 1: sprint yang sudah punya task user ini ----
	err := r.DB.QueryRow(`
		SELECT t.sprint_id
		FROM tasks t
		JOIN task_assignees ta ON ta.task_id = t.id
		JOIN sprints s ON s.id = t.sprint_id
		WHERE ta.user_id = ?
		  AND t.project_id = ?
		  AND t.sprint_id IS NOT NULL
		  AND t.deleted_at IS NULL
		  AND s.deleted_at IS NULL
		ORDER BY 
			CASE s.status WHEN 'active' THEN 0 ELSE 1 END,
			t.updated_at DESC
		LIMIT 1
	`, userID, projectID).Scan(&sprintID)

	if err == nil && sprintID.Valid && sprintID.Int64 > 0 {
		id := uint64(sprintID.Int64)
		return &id, nil
	}

	// ---- Prioritas 2: sprint active/backlog apa saja di project ----
	err = r.DB.QueryRow(`
		SELECT id FROM sprints
		WHERE project_id = ?
		  AND status IN ('active', 'backlog')
		  AND deleted_at IS NULL
		ORDER BY 
			CASE status WHEN 'active' THEN 0 ELSE 1 END,
			id DESC
		LIMIT 1
	`, projectID).Scan(&sprintID)

	if err == nil && sprintID.Valid && sprintID.Int64 > 0 {
		id := uint64(sprintID.Int64)
		return &id, nil
	}

	// ---- Prioritas 3: BUAT SPRINT BARU untuk user ini ----
	var userName string
	if err := r.DB.QueryRow(`SELECT name FROM users WHERE id = ?`, userID).Scan(&userName); err != nil {
		return nil, fmt.Errorf("get user name: %w", err)
	}

	sprintName := "Sprint - " + userName
	goal := "Sprint otomatis untuk " + userName

	res, err := r.DB.Exec(`
		INSERT INTO sprints
			(project_id, name, goal, status, start_date, end_date, total_points, completed_points)
		VALUES (?, ?, ?, 'backlog', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 0, 0)
	`, projectID, sprintName, goal)
	if err != nil {
		return nil, fmt.Errorf("create sprint: %w", err)
	}

	newID, _ := res.LastInsertId()
	id := uint64(newID)
	return &id, nil
}