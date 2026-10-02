package seeders

import (
	"log"
	"math/rand"
)

func (s *Seeder) seedProjectMembers() error {
	// ============================================================
	// Ambil semua project: ID, DeptID, OwnerID
	// ============================================================
	type projectRef struct {
		ProjectID, DeptID, OwnerID uint64
	}
	var projects []projectRef
	rows, err := s.DB.Query(`
		SELECT id, department_id, owner_id
		FROM projects
		WHERE deleted_at IS NULL
	`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var p projectRef
		rows.Scan(&p.ProjectID, &p.DeptID, &p.OwnerID)
		projects = append(projects, p)
	}
	rows.Close()

	if len(projects) == 0 {
		return nil
	}

	// ============================================================
	// Insert query dengan INSERT IGNORE (aman dari duplikat)
	// ============================================================
	q := `
		INSERT IGNORE INTO project_members (project_id, user_id, role)
		VALUES (?, ?, ?)`

	totalLead := 0
	totalMember := 0
	totalObserver := 0

	for _, p := range projects {
		// -------- 1. Owner jadi LEAD --------
		res, err := s.DB.Exec(q, p.ProjectID, p.OwnerID, "lead")
		if err != nil {
			return err
		}
		if affected, _ := res.RowsAffected(); affected > 0 {
			totalLead++
		}

		// -------- 2. Ambil semua user aktif di dept yang sama --------
		var users []uint64
		uRows, err := s.DB.Query(`
			SELECT id FROM users
			WHERE department_id = ?
			  AND is_active = 1
			  AND deleted_at IS NULL
			  AND id != ?
		`, p.DeptID, p.OwnerID)
		if err != nil {
			return err
		}
		for uRows.Next() {
			var id uint64
			uRows.Scan(&id)
			users = append(users, id)
		}
		uRows.Close()

		// -------- 3. Assign member & observer --------
		for _, uid := range users {
			// 85% member, 15% observer (acak tapi deterministik per project)
			role := "member"
			if rand.Float32() < 0.15 {
				role = "observer"
			}

			res, err := s.DB.Exec(q, p.ProjectID, uid, role)
			if err != nil {
				return err
			}
			if affected, _ := res.RowsAffected(); affected > 0 {
				if role == "member" {
					totalMember++
				} else {
					totalObserver++
				}
			}
		}
	}

	log.Printf(
		"   ✅ %d lead, %d member, %d observer (%d total)",
		totalLead, totalMember, totalObserver,
		totalLead+totalMember+totalObserver,
	)
	return nil
}