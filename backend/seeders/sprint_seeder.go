package seeders

import (
	"fmt"
	"log"
)

type sprintSeed struct {
	ProjectKey  string
	Name        string
	Goal        string
	Status      string
	StartOffset int
	Duration    int
}

var sprintSeeds = []sprintSeed{
	{"MON", "Sprint 1 - Foundation", "Setup project skeleton & auth", "completed", -30, 14},
	{"MON", "Sprint 2 - Core Features", "Kanban board & task management", "completed", -16, 14},
	{"MON", "Sprint 3 - Dashboard", "Dashboard & reporting", "active", -2, 14},
	{"MON", "Sprint 4 - Notification", "Realtime notification & PWA", "backlog", 12, 14},

	{"ERP", "Sprint 1 - Assessment", "Assessment & requirement", "completed", -10, 14},
	{"ERP", "Sprint 2 - Design", "Blueprint architecture cloud", "active", 4, 14},

	{"FIN", "Sprint 1 - Requirements", "Gathering requirement", "completed", -15, 14},
	{"FIN", "Sprint 2 - Development", "Build report engine", "active", -1, 14},

	{"REC", "Sprint 1 - MVP", "MVP portal rekrutmen", "active", -20, 21},

	{"MKT", "Sprint 1 - Strategy", "Digital strategy Q3", "backlog", 5, 14},

	{"TAX", "Sprint 1 - Data", "Kumpulkan data pajak", "active", -10, 14},

	{"CLM", "Sprint 1 - Flow", "Mapping alur klaim digital", "completed", -25, 14},
	{"CLM", "Sprint 2 - Backend", "Backend klaim & integrasi", "active", -11, 21},

	{"BGT", "Sprint 1 - Design", "Desain dashboard budgeting", "backlog", 2, 14},
}

var validSprintStatuses = map[string]bool{
	"backlog": true, "active": true, "completed": true, "cancelled": true,
}

// memberInfo — 1 member project
type memberInfo struct {
	UserID uint64
	Name   string
}

// ⭐ seedSprints — bikin 1 sprint PER MEMBER untuk setiap template
func (s *Seeder) seedSprints() error {
	if len(sprintSeeds) == 0 {
		log.Println("   ⚠️  Tidak ada sprint untuk di-seed")
		return nil
	}

	// ============================================================
	// 1. Ambil semua project member, group by project key
	// ============================================================
	projectMembers := make(map[string][]memberInfo)

	rows, err := s.DB.Query(`
		SELECT p.key_prefix, u.id, u.name
		FROM projects p
		JOIN project_members pm ON pm.project_id = p.id
		JOIN users u ON u.id = pm.user_id
		WHERE p.deleted_at IS NULL
		  AND u.deleted_at IS NULL
		  AND u.is_active = 1
		ORDER BY p.key_prefix, u.id
	`)
	if err != nil {
		return fmt.Errorf("query project members: %w", err)
	}
	for rows.Next() {
		var key, name string
		var uid uint64
		if err := rows.Scan(&key, &uid, &name); err != nil {
			rows.Close()
			return fmt.Errorf("scan member: %w", err)
		}
		projectMembers[key] = append(projectMembers[key], memberInfo{uid, name})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("iterate members: %w", err)
	}
	rows.Close()

	// ============================================================
	// 2. Validasi: semua project key punya member
	// ============================================================
	projectKeySet := make(map[string]bool)
	for _, sp := range sprintSeeds {
		projectKeySet[sp.ProjectKey] = true
	}
	for key := range projectKeySet {
		if len(projectMembers[key]) == 0 {
			return fmt.Errorf("project %s tidak punya member (jalankan project_member_seeder dulu)", key)
		}
	}

	// ============================================================
	// 3. INSERT — 1 sprint per template × member
	// ============================================================
	q := `
		INSERT INTO sprints
			(project_id, owner_id, name, goal, status, start_date, end_date, total_points, completed_points)
		VALUES (
			(SELECT id FROM projects WHERE key_prefix = ?),
			?,
			?, ?, ?,
			DATE_ADD(CURDATE(), INTERVAL ? DAY),
			DATE_ADD(CURDATE(), INTERVAL ? DAY),
			0, 0
		)`

	inserted := 0
	statusCounts := map[string]int{
		"backlog": 0, "active": 0, "completed": 0, "cancelled": 0,
	}
	ownerCount := make(map[string]int) // user name → jumlah sprint

	for _, sp := range sprintSeeds {
		if !validSprintStatuses[sp.Status] {
			return fmt.Errorf("sprint %q status invalid: %s", sp.Name, sp.Status)
		}
		if sp.Duration <= 0 {
			return fmt.Errorf("sprint %q duration invalid: %d", sp.Name, sp.Duration)
		}

		members := projectMembers[sp.ProjectKey]
		for _, m := range members {
			if _, err := s.DB.Exec(q,
				sp.ProjectKey,
				m.UserID,
				sp.Name,
				sp.Goal,
				sp.Status,
				sp.StartOffset,
				sp.StartOffset+sp.Duration,
			); err != nil {
				return fmt.Errorf("insert sprint %q for user %d: %w", sp.Name, m.UserID, err)
			}
			inserted++
			statusCounts[sp.Status]++
			ownerCount[m.Name]++
		}
	}

	log.Printf("   ✅ %d sprints (1 sprint per member per template)", inserted)

	if inserted > 0 {
		log.Println("      Distribution by status:")
		for _, st := range []string{"active", "backlog", "completed", "cancelled"} {
			if c := statusCounts[st]; c > 0 {
				log.Printf("         %-10s : %d", st, c)
			}
		}

		log.Println("      Distribution per owner:")
		for name, c := range ownerCount {
			log.Printf("         %-25s : %d sprint", name, c)
		}
	}

	return nil
}