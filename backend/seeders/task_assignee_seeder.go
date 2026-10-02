package seeders

import (
	"fmt"
	"log"
)

// ⭐ seedTaskAssignees
//
// Untuk setiap task, assignee = owner sprint.
// Karena 1 sprint dimiliki 1 user, maka user itulah yang melihatnya di Kanban.
func (s *Seeder) seedTaskAssignees() error {
	// Insert task_assignees via JOIN — 1 query, cepat
	res, err := s.DB.Exec(`
		INSERT IGNORE INTO task_assignees (task_id, user_id)
		SELECT t.id, s.owner_id
		FROM tasks t
		JOIN sprints s ON s.id = t.sprint_id
		WHERE t.deleted_at IS NULL
		  AND s.deleted_at IS NULL
		  AND s.owner_id IS NOT NULL
	`)
	if err != nil {
		return fmt.Errorf("insert task_assignees: %w", err)
	}

	affected, _ := res.RowsAffected()
	log.Printf("   ✅ %d task assignees (1 per task, assigned to sprint owner)", affected)

	// Verify: hitung task yang belum punya assignee
	var orphan int
	_ = s.DB.QueryRow(`
		SELECT COUNT(*) FROM tasks t
		WHERE t.deleted_at IS NULL
		  AND NOT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id)
	`).Scan(&orphan)
	if orphan > 0 {
		log.Printf("      ⚠️  %d task tanpa assignee (sprint-nya owner_id NULL)", orphan)
	}

	// Log distribusi per user
	rows, err := s.DB.Query(`
		SELECT u.name, COUNT(*) AS c
		FROM task_assignees ta
		JOIN users u ON u.id = ta.user_id
		GROUP BY u.id, u.name
		ORDER BY c DESC
	`)
	if err == nil {
		defer rows.Close()
		log.Println("      Distribution per user:")
		for rows.Next() {
			var name string
			var c int
			if err := rows.Scan(&name, &c); err == nil {
				log.Printf("         %-25s : %d task", name, c)
			}
		}
	}

	return nil
}