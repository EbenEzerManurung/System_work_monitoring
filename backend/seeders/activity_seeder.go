package seeders

import (
	"log"
	"math/rand"
	"time"

	"github.com/brianvoe/gofakeit/v7"
)

func (s *Seeder) seedActivityLogs() error {
	var userIDs, projectIDs, taskIDs []uint64

	r1, _ := s.DB.Query(`SELECT id FROM users`)
	for r1.Next() {
		var id uint64
		r1.Scan(&id)
		userIDs = append(userIDs, id)
	}
	r1.Close()

	r2, _ := s.DB.Query(`SELECT id FROM projects`)
	for r2.Next() {
		var id uint64
		r2.Scan(&id)
		projectIDs = append(projectIDs, id)
	}
	r2.Close()

	r3, _ := s.DB.Query(`SELECT id FROM tasks LIMIT 80`)
	for r3.Next() {
		var id uint64
		r3.Scan(&id)
		taskIDs = append(taskIDs, id)
	}
	r3.Close()

	if len(userIDs) == 0 || len(taskIDs) == 0 {
		return nil
	}

	actions := []struct {
		Action, Entity, Template string
	}{
		{"created", "task", "membuat task baru"},
		{"updated", "task", "mengubah detail task"},
		{"moved", "task", "memindahkan task ke kolom lain"},
		{"commented", "task", "menambahkan komentar"},
		{"assigned", "task", "menugaskan task ke member"},
		{"created", "sprint", "membuat sprint baru"},
		{"started", "sprint", "memulai sprint"},
		{"completed", "sprint", "menyelesaikan sprint"},
	}

	q := `
		INSERT INTO activity_logs
			(user_id, project_id, task_id, action, entity_type, entity_id, description, ip_address, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	total := 200
	for i := 0; i < total; i++ {
		uid := userIDs[rand.Intn(len(userIDs))]
		pid := projectIDs[rand.Intn(len(projectIDs))]
		tid := taskIDs[rand.Intn(len(taskIDs))]
		a := actions[rand.Intn(len(actions))]
		desc := a.Template + " " + gofakeit.Word()
		ip := gofakeit.IPv4Address()
		createdAt := time.Now().Add(-time.Duration(rand.Intn(30*24)) * time.Hour)

		if _, err := s.DB.Exec(q, uid, pid, tid, a.Action, a.Entity, tid, desc, ip, createdAt); err != nil {
			return err
		}
	}
	log.Printf("   ✅ %d activity logs", total)
	return nil
}
