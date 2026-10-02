package seeders

import (
	"log"
	"math/rand"

	"github.com/brianvoe/gofakeit/v7"
)

func (s *Seeder) seedComments() error {
	// Ambil task + user yang ter-assign di task tsb
	type row struct{ TaskID uint64 }
	var taskIDs []uint64
	rows, err := s.DB.Query(`SELECT id FROM tasks LIMIT 100`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id uint64
		rows.Scan(&id)
		taskIDs = append(taskIDs, id)
	}
	rows.Close()

	q := `INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)`

	total := 0
	for _, tid := range taskIDs {
		// ambil assignee task
		var users []uint64
		uRows, _ := s.DB.Query(`SELECT user_id FROM task_assignees WHERE task_id = ?`, tid)
		for uRows.Next() {
			var id uint64
			uRows.Scan(&id)
			users = append(users, id)
		}
		uRows.Close()
		if len(users) == 0 {
			continue
		}

		n := rand.Intn(4) // 0-3 komentar
		for i := 0; i < n; i++ {
			body := gofakeit.Sentence(8)
			if _, err := s.DB.Exec(q, tid, users[rand.Intn(len(users))], body); err != nil {
				return err
			}
			total++
		}
	}
	log.Printf("   ✅ %d comments", total)
	return nil
}
