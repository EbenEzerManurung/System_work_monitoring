package seeders

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/brianvoe/gofakeit/v7"
)

// ============================================================
// Seeder
// ============================================================
type Seeder struct {
	DB *sql.DB
}

func NewSeeder(db *sql.DB) *Seeder {
	return &Seeder{DB: db}
}

// ============================================================
// progressScoreSQL — formula SP score berdasarkan progress_level.
//
// Formula:
//   not_started  → 0 SP
//   in_progress  → 1 SP
//   almost_done  → FLOOR(story_points / 2)
//   done         → story_points (full SP)
// ============================================================
const progressScoreSQL = `
	CASE t.progress_level
		WHEN 'in_progress' THEN 1
		WHEN 'almost_done' THEN FLOOR(t.story_points / 2)
		WHEN 'done' THEN t.story_points
		ELSE 0
	END
`

// ============================================================
// SeederStep — representasi 1 langkah seeding
// ============================================================
type SeederStep struct {
	Name string
	Fn   func() error
}

// ============================================================
// Run — jalankan semua seeder dengan urutan yang benar.
//
// Urutan penting karena ada foreign key:
//   1. departments     (parent untuk users)
//   2. users           (parent untuk projects, tasks)
//   3. projects        (parent untuk sprints, tasks)
//   4. project_members (junction users ↔ projects)
//   5. sprints         (parent untuk tasks)
//   6. tasks           (parent untuk task_assignees, comments)
//   7. task_assignees  (junction tasks ↔ users)
//   8. comments        (child tasks)
//   9. activity_logs   (log)
//  10. notifications   (log)
//
// Setelah semua seed selesai, hitung ulang points & progress dari data real.
// ============================================================
func (s *Seeder) Run() error {
	start := time.Now()

	// ============================================================
	// SEED RANDOM — biar data variatif setiap kali seed
	// ============================================================
	seed := time.Now().UnixNano()

	// gofakeit seed (library global)
	gofakeit.Seed(seed)

	// Catatan: math/rand sejak Go 1.20 sudah auto-seeded,
	// jadi rand.Seed() tidak perlu lagi. Modul kita sudah pakai
	// rand.Intn() / rand.Float32() dari package global.

	// ============================================================
	// STEP DEFINITIONS — urutan eksekusi
	// ============================================================
	steps := []SeederStep{
		{"departments", s.seedDepartments},
		{"users", s.seedUsers},
		{"projects", s.seedProjects},
		{"project_members", s.seedProjectMembers},
		{"sprints", s.seedSprints},
		{"tasks", s.seedTasks},
		{"task_assignees", s.seedTaskAssignees},
		{"comments", s.seedComments},
		{"activity_logs", s.seedActivityLogs},
		{"notifications", s.seedNotifications},
	}

	// ============================================================
	// EXECUTE STEPS
	// ============================================================
	for i, step := range steps {
		log.Printf("🌱 [%d/%d] Seeding %s...", i+1, len(steps), step.Name)
		if err := step.Fn(); err != nil {
			return fmt.Errorf("seed %s: %w", step.Name, err)
		}
	}

	// ============================================================
	// POST-SEED SYNC — recalculate points dari task real
	// ============================================================
	if err := s.runPostSeedSync(); err != nil {
		// Log warning tapi jangan fail — seeder tetap dianggap sukses
		log.Printf("⚠️  Post-seed sync error: %v", err)
	}

	// ============================================================
	// SUMMARY
	// ============================================================
	elapsed := time.Since(start)
	log.Printf("🎉 Semua seeder berhasil dijalankan dalam %s", elapsed.Round(time.Millisecond))

	return nil
}

// ============================================================
// runPostSeedSync — jalankan semua sync setelah seed selesai
// ============================================================
func (s *Seeder) runPostSeedSync() error {
	log.Println("─────────────────────────────────────────────────")
	log.Println("🔄 Post-seed sync:")

	// 1. Sync sprint points dari progress_level task
	if err := s.syncSprintPoints(); err != nil {
		return fmt.Errorf("sync sprint points: %w", err)
	}

	// 2. Sync project progress dari sprint points
	if err := s.syncProjectProgress(); err != nil {
		return fmt.Errorf("sync project progress: %w", err)
	}

	log.Println("─────────────────────────────────────────────────")
	return nil
}

// ============================================================
// SYNC SPRINT POINTS
//
// Formula:
//   total_points     = SUM(story_points) semua task di sprint
//   completed_points = SUM(progress_score) berdasarkan progress_level
//   Sprint 'completed' → paksa 100% (completed = total)
// ============================================================
func (s *Seeder) syncSprintPoints() error {
	log.Println("   🔄 Syncing sprint points...")

	// 1. Total points = SUM(story_points)
	if _, err := s.DB.Exec(`
		UPDATE sprints s SET total_points = COALESCE((
			SELECT SUM(t.story_points) FROM tasks t
			WHERE t.sprint_id = s.id AND t.deleted_at IS NULL
		), 0)
		WHERE s.deleted_at IS NULL
	`); err != nil {
		return fmt.Errorf("update total_points: %w", err)
	}

	// 2. Completed points = SUM(progress_score) dari progress_level
	if _, err := s.DB.Exec(`
		UPDATE sprints s SET completed_points = COALESCE((
			SELECT SUM(` + progressScoreSQL + `) FROM tasks t
			WHERE t.sprint_id = s.id AND t.deleted_at IS NULL
		), 0)
		WHERE s.deleted_at IS NULL
	`); err != nil {
		return fmt.Errorf("update completed_points: %w", err)
	}

	// 3. Sprint 'completed' → paksa 100%
	//    (task sisa sudah dikembalikan ke backlog, sprint dianggap tuntas)
	if _, err := s.DB.Exec(`
		UPDATE sprints SET completed_points = total_points
		WHERE status = 'completed' AND deleted_at IS NULL
	`); err != nil {
		return fmt.Errorf("force completed sprint 100%%: %w", err)
	}

	// 4. Log ringkasan per sprint
	return s.logSprintSummary()
}

// ============================================================
// logSprintSummary — print ringkasan points per sprint
// ============================================================
func (s *Seeder) logSprintSummary() error {
	rows, err := s.DB.Query(`
		SELECT id, name, status, total_points, completed_points
		FROM sprints
		WHERE deleted_at IS NULL
		ORDER BY id
	`)
	if err != nil {
		log.Printf("      ⚠️  Gagal query log: %v", err)
		return nil // jangan fail hanya karena logging
	}
	defer rows.Close()

	log.Println("      📊 Sprint points setelah sync:")
	count := 0
	for rows.Next() {
		var id uint64
		var name, status string
		var total, completed int
		if err := rows.Scan(&id, &name, &status, &total, &completed); err != nil {
			continue
		}
		pct := 0.0
		if total > 0 {
			pct = float64(completed) / float64(total) * 100
		}
		log.Printf("         SPR-%-3d [%-9s] %-32s → %d/%d SP (%.0f%%)",
			id, status, name, completed, total, pct)
		count++
	}
	log.Printf("      ✅ %d sprint points synced", count)

	return rows.Err()
}

// ============================================================
// SYNC PROJECT PROGRESS
//
// Progress project = rata-rata progress semua sprint di project itu.
//
// Rumus:
//   project.progress = AVG(sprint.completed_points / sprint.total_points) * 100
// ============================================================
func (s *Seeder) syncProjectProgress() error {
	log.Println("   🔄 Syncing project progress...")

	// Update project.progress dari rata-rata progress sprint
	// Kalau tidak ada sprint, progress = 0
	if _, err := s.DB.Exec(`
		UPDATE projects p SET progress = COALESCE((
			SELECT ROUND(AVG(
				CASE
					WHEN sp.total_points > 0
					THEN (sp.completed_points / sp.total_points) * 100
					ELSE 0
				END
			), 2)
			FROM sprints sp
			WHERE sp.project_id = p.id AND sp.deleted_at IS NULL
		), 0)
		WHERE p.deleted_at IS NULL
	`); err != nil {
		return fmt.Errorf("update project progress: %w", err)
	}

	// Log ringkasan per project
	return s.logProjectSummary()
}

// ============================================================
// logProjectSummary — print ringkasan progress per project
// ============================================================
func (s *Seeder) logProjectSummary() error {
	rows, err := s.DB.Query(`
		SELECT
			p.id,
			p.key_prefix,
			p.name,
			COALESCE(d.code, '') AS dept,
			p.progress,
			(SELECT COUNT(*) FROM sprints WHERE project_id = p.id AND deleted_at IS NULL) AS total_sprint
		FROM projects p
		LEFT JOIN departments d ON d.id = p.department_id
		WHERE p.deleted_at IS NULL
		ORDER BY p.id
	`)
	if err != nil {
		log.Printf("      ⚠️  Gagal query log: %v", err)
		return nil
	}
	defer rows.Close()

	log.Println("      📊 Project progress setelah sync:")
	count := 0
	for rows.Next() {
		var id, totalSprint uint64
		var keyPrefix, name, dept string
		var progress float64
		if err := rows.Scan(&id, &keyPrefix, &name, &dept, &progress, &totalSprint); err != nil {
			continue
		}
		log.Printf("         %-4s [%-4s] %-32s → %5.1f%% (%d sprint)",
			keyPrefix, dept, name, progress, totalSprint)
		count++
	}
	log.Printf("      ✅ %d project progress synced", count)

	return rows.Err()
}