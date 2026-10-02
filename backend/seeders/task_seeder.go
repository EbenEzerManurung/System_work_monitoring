package seeders

import (
	"fmt"
	"log"
	"strings"
)

// ============================================================
// getSPFromObjectiveSeed — total SP per objective
//
//   Daily            → 1 SP
//   Troubleshooting  → 8 SP
//   Compliance       → 20 SP
//   Improvement      → 20 SP
//   New Project      → 60 SP
// ============================================================
func getSPFromObjectiveSeed(obj string) int {
	switch obj {
	case "daily":
		return 1
	case "troubleshooting":
		return 8
	case "compliance":
		return 20
	case "improvement":
		return 20
	case "new_project":
		return 60
	default:
		return 1
	}
}

// ============================================================
// objectiveFromSprint — deteksi objective dari nama + goal sprint
// Dipakai supaya tiap task punya objective yang masuk akal.
// ============================================================
func objectiveFromSprint(name, goal string) string {
	text := strings.ToLower(name + " " + goal)
	switch {
	case strings.Contains(text, "bug") ||
		strings.Contains(text, "fix") ||
		strings.Contains(text, "troubleshoot") ||
		strings.Contains(text, "debug"):
		return "troubleshooting"

	case strings.Contains(text, "audit") ||
		strings.Contains(text, "compliance") ||
		strings.Contains(text, "assessment") ||
		strings.Contains(text, "requirement"):
		return "compliance"

	case strings.Contains(text, "new") ||
		strings.Contains(text, "initiate") ||
		strings.Contains(text, "bangun") ||
		strings.Contains(text, "buat") ||
		strings.Contains(text, "mvp") ||
		strings.Contains(text, "foundation") ||
		strings.Contains(text, "build"):
		return "new_project"

	case strings.Contains(text, "design") ||
		strings.Contains(text, "improve") ||
		strings.Contains(text, "optimize") ||
		strings.Contains(text, "refactor") ||
		strings.Contains(text, "backend") ||
		strings.Contains(text, "dashboard") ||
		strings.Contains(text, "development"):
		return "improvement"

	default:
		return "daily"
	}
}

// ============================================================
// mapStatusToProgress — auto-map status → progress_level
//
//   done        → done        (full SP)
//   in_progress → in_progress (1 SP)
//   review      → almost_done (½ SP)
//   lainnya     → not_started (0 SP)
// ============================================================
func mapStatusToProgress(status, objective string) string {
	switch status {
	case "done":
		return "done"
	case "in_progress":
		return "in_progress"
	case "review":
		return "almost_done"
	default:
		return "not_started"
	}
}

// ============================================================
// seedTasks — 1 TASK PER SPRINT
//
// Aturan:
//   - Setiap sprint dapat TEPAT 1 task
//   - Judul task = goal sprint (fallback ke nama sprint)
//   - Objective otomatis dari nama+goal sprint
//   - Status task mengikuti status sprint:
//       backlog   → task backlog, not_started (0 SP)
//       active    → task in_progress (1 SP, muncul di Kanban)
//       completed → task done (full SP)
// ============================================================
func (s *Seeder) seedTasks() error {
	// ============================================================
	// 1. Ambil semua sprint
	// ============================================================
	type sprintRef struct {
		ID, ProjectID uint64
		Status        string
		Name          string
		Goal          string
	}
	var sprints []sprintRef

	rows, err := s.DB.Query(`
		SELECT id, project_id, status, name, COALESCE(goal, '')
		FROM sprints
		WHERE deleted_at IS NULL
		ORDER BY id
	`)
	if err != nil {
		return fmt.Errorf("query sprints: %w", err)
	}
	for rows.Next() {
		var sr sprintRef
		if err := rows.Scan(&sr.ID, &sr.ProjectID, &sr.Status, &sr.Name, &sr.Goal); err != nil {
			rows.Close()
			return fmt.Errorf("scan sprint: %w", err)
		}
		sprints = append(sprints, sr)
	}
	rows.Close()

	if len(sprints) == 0 {
		return fmt.Errorf("tidak ada sprint di database")
	}

	// ============================================================
	// 2. Ambil reporter (manager / member aktif)
	// ============================================================
	var userIDs []uint64
	uRows, err := s.DB.Query(`
		SELECT id FROM users
		WHERE role IN ('manager', 'member')
		  AND deleted_at IS NULL
		  AND is_active = 1
		ORDER BY id
	`)
	if err != nil {
		return fmt.Errorf("query users: %w", err)
	}
	for uRows.Next() {
		var id uint64
		if err := uRows.Scan(&id); err != nil {
			uRows.Close()
			return fmt.Errorf("scan user: %w", err)
		}
		userIDs = append(userIDs, id)
	}
	uRows.Close()

	if len(userIDs) == 0 {
		return fmt.Errorf("tidak ada user manager/member di database")
	}

	// ============================================================
	// 3. Insert — 1 task per sprint
	// ============================================================
	q := `
		INSERT INTO tasks
			(project_id, sprint_id, reporter_id, title, description, status, priority,
			 type, objective, progress_level, story_points, position, due_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))`

	total := 0
	statusCounts := map[string]int{
		"backlog": 0, "todo": 0, "in_progress": 0, "review": 0, "done": 0,
	}
	objectiveCounts := map[string]int{}

	for _, sp := range sprints {
		// ============ Judul task = goal sprint ============
		title := strings.TrimSpace(sp.Goal)
		if title == "" {
			title = sp.Name
		}

		// ============ Objective dari nama+goal ============
		objective := objectiveFromSprint(sp.Name, sp.Goal)
		points := getSPFromObjectiveSeed(objective)
		objectiveCounts[objective]++

		// ============ Status task ikut status sprint ============
		var status string
		switch sp.Status {
		case "completed":
			status = "done"
		case "active":
			status = "in_progress"
		default: // backlog, cancelled
			status = "backlog"
		}
		statusCounts[status]++

		progressLevel := mapStatusToProgress(status, objective)

		// ============ Field lain ============
		reporter := userIDs[int(sp.ID)%len(userIDs)]
		desc := fmt.Sprintf("Task untuk %s — %s.", sp.Name, title)
		prio := "medium"
		typ := "task"
		dueOffset := 14

		if _, err := s.DB.Exec(q,
			sp.ProjectID, sp.ID, reporter, title, desc, status,
			prio, typ, objective, progressLevel, points, 0, dueOffset,
		); err != nil {
			return fmt.Errorf("insert task %q: %w", title, err)
		}
		total++
	}

	// ============================================================
	// 4. Log summary
	// ============================================================
	log.Printf("   ✅ %d tasks (1 task per sprint, judul = goal sprint)", total)
	log.Printf("      Distribution by status:")
	for _, st := range []string{"backlog", "todo", "in_progress", "review", "done"} {
		if c := statusCounts[st]; c > 0 {
			log.Printf("         %-12s : %d", st, c)
		}
	}

	if len(objectiveCounts) > 0 {
		log.Printf("      Distribution by objective:")
		for _, obj := range []string{"daily", "troubleshooting", "compliance", "improvement", "new_project"} {
			if c := objectiveCounts[obj]; c > 0 {
				sp := getSPFromObjectiveSeed(obj)
				log.Printf("         %-16s : %3d task (%d SP each)", obj, c, sp)
			}
		}
	}

	return nil
}