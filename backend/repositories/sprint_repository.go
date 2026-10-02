package repositories

import (
	"database/sql"
	"errors"
	"fmt"

	"backend/models"
)

type SprintRepository struct {
	DB *sql.DB
}

func NewSprintRepository(db *sql.DB) *SprintRepository {
	return &SprintRepository{DB: db}
}

// ============================================================
// ⭐ objectiveScoreSQL — total SP per objective
//    Daily=1, Troubleshooting=8, Compliance=20,
//    Improvement=20, New Project=60
//
// ⭐ FIX: tambah "improvement" yang sebelumnya HILANG
// ============================================================
const objectiveScoreSQL = `
	CASE t.objective
		WHEN 'daily'           THEN 1
		WHEN 'troubleshooting' THEN 8
		WHEN 'compliance'      THEN 20
		WHEN 'improvement'     THEN 20
		WHEN 'new_project'     THEN 60
		ELSE 0
	END
`

// ============================================================
// ⭐ progressScoreSQL — SP task berdasarkan progress_level
//
//   in_progress  → 0 SP  (SP-nya disumbang sprint-level saat active)
//   almost_done  → FLOOR(objective / 2)
//   done         → objective (full)
//
// ⭐ FIX: handle 'almost_done' yang sebelumnya dianggap 0
// ============================================================
var progressScoreSQL = fmt.Sprintf(`
	CASE t.progress_level
		WHEN 'almost_done' THEN FLOOR((%s) / 2)
		WHEN 'done'        THEN (%s)
		ELSE 0
	END
`, objectiveScoreSQL, objectiveScoreSQL)

// ============================================================
// ListByDepartment
// ============================================================
func (r *SprintRepository) ListByDepartment(deptID uint64, isSuperadmin bool) ([]models.Sprint, error) {
	q := `
		SELECT s.id, s.project_id, s.name, COALESCE(s.goal,''), s.status,
		       s.start_date, s.end_date, s.total_points, s.completed_points,
		       s.created_at, s.updated_at
		FROM sprints s
		LEFT JOIN projects p ON p.id = s.project_id
		WHERE s.deleted_at IS NULL`
	args := []interface{}{}
	if !isSuperadmin && deptID > 0 {
		q += " AND p.department_id = ?"
		args = append(args, deptID)
	}
	q += ` ORDER BY 
		CASE s.status
			WHEN 'active' THEN 0
			WHEN 'backlog' THEN 1
			WHEN 'completed' THEN 2
			WHEN 'cancelled' THEN 3
			ELSE 4
		END ASC, s.id DESC`

	rows, err := r.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Sprint
	for rows.Next() {
		var s models.Sprint
		if err := rows.Scan(&s.ID, &s.ProjectID, &s.Name, &s.Goal, &s.Status,
			&s.StartDate, &s.EndDate, &s.TotalPoints, &s.CompletedPoints,
			&s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// ============================================================
// FindByID
// ============================================================
func (r *SprintRepository) FindByID(id uint64) (*models.Sprint, error) {
	var s models.Sprint
	err := r.DB.QueryRow(`
		SELECT id, project_id, name, COALESCE(goal,''), status,
		       start_date, end_date, total_points, completed_points,
		       created_at, updated_at
		FROM sprints WHERE id = ? AND deleted_at IS NULL
	`, id).Scan(&s.ID, &s.ProjectID, &s.Name, &s.Goal, &s.Status,
		&s.StartDate, &s.EndDate, &s.TotalPoints, &s.CompletedPoints,
		&s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// ============================================================
// Create
// ============================================================
func (r *SprintRepository) Create(s *models.Sprint) (uint64, error) {
	res, err := r.DB.Exec(`
		INSERT INTO sprints 
			(project_id, name, goal, status, start_date, end_date, total_points, completed_points)
		VALUES (?, ?, ?, ?, ?, ?, 0, 0)
	`, s.ProjectID, s.Name, s.Goal, s.Status, s.StartDate, s.EndDate)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return uint64(id), nil
}

// ============================================================
// Update
// ============================================================
func (r *SprintRepository) Update(s *models.Sprint) error {
	_, err := r.DB.Exec(`
		UPDATE sprints SET name=?, goal=?, start_date=?, end_date=?
		WHERE id=?
	`, s.Name, s.Goal, s.StartDate, s.EndDate, s.ID)
	return err
}

// ============================================================
// Delete
// ============================================================
func (r *SprintRepository) Delete(id uint64) error {
	_, err := r.DB.Exec(`UPDATE sprints SET deleted_at=NOW() WHERE id=?`, id)
	return err
}

// ============================================================
// syncSprintPointsTx
//   total_points     = SUM(objective) semua task
//   completed_points =
//     - Sprint active    → 1 SP fixed (kalau ada task)
//     - Sprint completed → SUM(task almost_done ½ + done full)
//     - Lainnya          → SUM(task progress)
// ============================================================
func syncSprintPointsTx(tx *sql.Tx, sprintID uint64) error {
	// total_points = SUM(objective) semua task
	if _, err := tx.Exec(`
		UPDATE sprints SET total_points = COALESCE((
			SELECT SUM(`+objectiveScoreSQL+`) FROM tasks t
			WHERE t.sprint_id = ? AND t.deleted_at IS NULL
		), 0) WHERE id = ?
	`, sprintID, sprintID); err != nil {
		return err
	}

	// Cek status sprint
	var status string
	if err := tx.QueryRow(`SELECT status FROM sprints WHERE id = ?`, sprintID).Scan(&status); err != nil {
		return err
	}

	// Cek jumlah task
	var taskCount int
	if err := tx.QueryRow(`
		SELECT COUNT(*) FROM tasks WHERE sprint_id = ? AND deleted_at IS NULL
	`, sprintID).Scan(&taskCount); err != nil {
		return err
	}

	var completedPoints int

	if status == "active" {
		// Sprint active = 1 SP fixed (kalau ada task)
		if taskCount > 0 {
			completedPoints = 1
		} else {
			completedPoints = 0
		}
	} else {
		// Sprint completed/cancelled/backlog = SUM(task progress)
		// Task almost_done = ½, done = full
		if err := tx.QueryRow(`
			SELECT COALESCE(SUM(`+progressScoreSQL+`), 0) FROM tasks t
			WHERE t.sprint_id = ? AND t.deleted_at IS NULL
		`, sprintID).Scan(&completedPoints); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(`
		UPDATE sprints SET completed_points = ? WHERE id = ?
	`, completedPoints, sprintID); err != nil {
		return err
	}

	return nil
}

// ============================================================
// StartSprint
// ============================================================
func (r *SprintRepository) StartSprint(id uint64) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var projectID uint64
	var currentStatus string
	if err := tx.QueryRow(
		`SELECT project_id, status FROM sprints WHERE id=? AND deleted_at IS NULL`, id,
	).Scan(&projectID, &currentStatus); err != nil {
		return errors.New("sprint tidak ditemukan")
	}

	if currentStatus != "backlog" {
		if currentStatus == "active" {
			return errors.New("sprint sudah aktif")
		}
		return errors.New("hanya sprint dengan status 'backlog' yang bisa dimulai")
	}

	var activeCount int
	if err := tx.QueryRow(`
		SELECT COUNT(*) FROM sprints
		WHERE project_id = ? AND status = 'active' AND id != ? AND deleted_at IS NULL
	`, projectID, id).Scan(&activeCount); err != nil {
		return err
	}
	if activeCount > 0 {
		return errors.New("sudah ada sprint aktif di project ini")
	}

	if _, err := tx.Exec(`
		UPDATE sprints SET status = 'active', start_date = COALESCE(start_date, CURDATE())
		WHERE id = ?
	`, id); err != nil {
		return err
	}

	if _, err := tx.Exec(`
		UPDATE tasks
		SET status = 'in_progress',
		    progress_level = 'in_progress',
		    started_at = COALESCE(started_at, NOW())
		WHERE sprint_id = ? AND status IN ('backlog', 'todo') AND deleted_at IS NULL
	`, id); err != nil {
		return err
	}

	if err := syncSprintPointsTx(tx, id); err != nil {
		return err
	}

	return tx.Commit()
}

// ============================================================
// CompleteSprint
// ============================================================
func (r *SprintRepository) CompleteSprint(id uint64) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var currentStatus string
	if err := tx.QueryRow(
		`SELECT status FROM sprints WHERE id=? AND deleted_at IS NULL`, id,
	).Scan(&currentStatus); err != nil {
		return errors.New("sprint tidak ditemukan")
	}

	if currentStatus != "active" {
		if currentStatus == "completed" {
			return errors.New("sprint sudah selesai")
		}
		return errors.New("hanya sprint yang sedang aktif bisa diselesaikan")
	}

	if _, err := tx.Exec(`
		UPDATE sprints SET status = 'completed', end_date = COALESCE(end_date, CURDATE())
		WHERE id = ?
	`, id); err != nil {
		return err
	}

	if err := syncSprintPointsTx(tx, id); err != nil {
		return err
	}

	return tx.Commit()
}

// ============================================================
// AssignTasksToSprint
// ============================================================
func (r *SprintRepository) AssignTasksToSprint(sprintID uint64, taskIDs []uint64) error {
	if len(taskIDs) == 0 {
		return errors.New("tidak ada task untuk di-assign")
	}

	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var sprintStatus string
	if err := tx.QueryRow(
		`SELECT status FROM sprints WHERE id = ? AND deleted_at IS NULL`, sprintID,
	).Scan(&sprintStatus); err != nil {
		return errors.New("sprint tidak ditemukan")
	}

	if sprintStatus == "completed" || sprintStatus == "cancelled" {
		return errors.New("tidak bisa assign task ke sprint yang sudah selesai")
	}

	for _, tid := range taskIDs {
		if sprintStatus == "active" {
			if _, err := tx.Exec(`
				UPDATE tasks
				SET sprint_id = ?, status = 'in_progress',
				    progress_level = 'in_progress',
				    started_at = COALESCE(started_at, NOW())
				WHERE id = ? AND deleted_at IS NULL
			`, sprintID, tid); err != nil {
				return err
			}
		} else {
			if _, err := tx.Exec(`
				UPDATE tasks
				SET sprint_id = ?, status = 'backlog', progress_level = 'not_started'
				WHERE id = ? AND deleted_at IS NULL
			`, sprintID, tid); err != nil {
				return err
			}
		}
	}

	if err := syncSprintPointsTx(tx, sprintID); err != nil {
		return err
	}

	return tx.Commit()
}

// ============================================================
// RemoveTaskFromSprint
// ============================================================
func (r *SprintRepository) RemoveTaskFromSprint(taskID uint64) error {
	if taskID == 0 {
		return errors.New("task ID tidak valid")
	}

	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var sprintID sql.NullInt64
	if err := tx.QueryRow(
		`SELECT sprint_id FROM tasks WHERE id = ? AND deleted_at IS NULL`, taskID,
	).Scan(&sprintID); err != nil {
		return errors.New("task tidak ditemukan")
	}

	if _, err := tx.Exec(`
		UPDATE tasks
		SET sprint_id = NULL, status = 'backlog', progress_level = 'not_started'
		WHERE id = ? AND deleted_at IS NULL
	`, taskID); err != nil {
		return err
	}

	if sprintID.Valid && sprintID.Int64 > 0 {
		if err := syncSprintPointsTx(tx, uint64(sprintID.Int64)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ============================================================
// SyncSprintPoints
// ============================================================
func (r *SprintRepository) SyncSprintPoints() error {
	// Total points
	if _, err := r.DB.Exec(`
		UPDATE sprints s SET total_points = COALESCE((
			SELECT SUM(`+objectiveScoreSQL+`) FROM tasks t
			WHERE t.sprint_id = s.id AND t.deleted_at IS NULL
		), 0)
		WHERE s.deleted_at IS NULL
	`); err != nil {
		return err
	}

	// Completed = SUM(progress × objective)
	if _, err := r.DB.Exec(`
		UPDATE sprints s SET completed_points = COALESCE((
			SELECT SUM(`+progressScoreSQL+`) FROM tasks t
			WHERE t.sprint_id = s.id AND t.deleted_at IS NULL
		), 0)
		WHERE s.deleted_at IS NULL
	`); err != nil {
		return err
	}

	// Sprint active → paksa 1 SP kalau ada task
	if _, err := r.DB.Exec(`
		UPDATE sprints s SET completed_points = 1
		WHERE s.status = 'active' 
		  AND s.deleted_at IS NULL
		  AND EXISTS (SELECT 1 FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL)
	`); err != nil {
		return err
	}

	return nil
}