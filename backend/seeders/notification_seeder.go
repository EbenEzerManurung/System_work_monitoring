package seeders

import (
	"fmt"
	"log"
	"math/rand"

	"github.com/brianvoe/gofakeit/v7"
)

func (s *Seeder) seedNotifications() error {
	// ============================================================
	// Ambil semua user aktif (penerima & aktor notifikasi)
	// ============================================================
	var userIDs []uint64
	r, err := s.DB.Query(`
		SELECT id FROM users
		WHERE is_active = 1 AND deleted_at IS NULL
	`)
	if err != nil {
		return err
	}
	for r.Next() {
		var id uint64
		r.Scan(&id)
		userIDs = append(userIDs, id)
	}
	r.Close()

	if len(userIDs) == 0 {
		return nil
	}

	// ============================================================
	// Ambil daftar task (ID) — untuk link yang valid
	// ============================================================
	var taskIDs []uint64
	tRows, _ := s.DB.Query(`SELECT id FROM tasks WHERE deleted_at IS NULL`)
	for tRows.Next() {
		var id uint64
		tRows.Scan(&id)
		taskIDs = append(taskIDs, id)
	}
	tRows.Close()

	// ============================================================
	// Ambil daftar sprint (ID) — untuk notifikasi sprint
	// ============================================================
	var sprintIDs []uint64
	sRows, _ := s.DB.Query(`SELECT id FROM sprints WHERE deleted_at IS NULL`)
	for sRows.Next() {
		var id uint64
		sRows.Scan(&id)
		sprintIDs = append(sprintIDs, id)
	}
	sRows.Close()

	// ============================================================
	// Template notifikasi per type
	// ============================================================
	type notifTemplate struct {
		Type        string
		Title       string
		BodyFunc    func() string
		EntityType  string
		LinkPattern string
	}

	templates := []notifTemplate{
		{
			Type:  "task_assigned",
			Title: "Task baru ditugaskan ke Anda",
			BodyFunc: func() string {
				titles := []string{
					"Implementasi autentikasi JWT",
					"Fix bug login error 500",
					"Optimasi query database",
					"Update dokumentasi API",
					"Buat dashboard analytics",
				}
				who := []string{"Budi Santoso", "Rina Wijaya", "Andi Pratama", "Siti Nurhaliza"}
				return fmt.Sprintf(`%s menugaskan "%s" kepada Anda`,
					who[rand.Intn(len(who))],
					titles[rand.Intn(len(titles))],
				)
			},
			EntityType:  "task",
			LinkPattern: "/board",
		},
		{
			Type:  "task_commented",
			Title: "Ada komentar baru di task Anda",
			BodyFunc: func() string {
				comments := []string{
					"Sudah saya review, tinggal perbaiki validasi di bagian email",
					"Ada typo di line 45, mohon dicek ulang",
					"Sudah saya push ke branch feature/auth ya",
					"Bisa tambahkan unit test untuk edge case ini?",
					"Approved, silakan lanjut ke tahap berikutnya",
					"Ada issue di production, tolong prioritaskan ini",
				}
				who := []string{"Budi Santoso", "Rina Wijaya", "Andi Pratama", "Siti Nurhaliza", "Dian Kusuma"}
				return fmt.Sprintf("%s: %s",
					who[rand.Intn(len(who))],
					comments[rand.Intn(len(comments))],
				)
			},
			EntityType:  "task",
			LinkPattern: "/board",
		},
		{
			Type:  "task_due_soon",
			Title: "Task akan segera jatuh tempo",
			BodyFunc: func() string {
				titles := []string{
					"Implementasi autentikasi JWT",
					"Fix bug login error 500",
					"Optimasi query database",
					"Refactor komponen UI",
				}
				deadlines := []string{
					"hari ini pukul 17:00",
					"besok pukul 10:00",
					"dalam 2 hari",
					"3 hari lagi",
				}
				return fmt.Sprintf(`"%s" jatuh tempo %s`,
					titles[rand.Intn(len(titles))],
					deadlines[rand.Intn(len(deadlines))],
				)
			},
			EntityType:  "task",
			LinkPattern: "/board",
		},
		{
			Type:  "sprint_started",
			Title: "Sprint baru telah dimulai",
			BodyFunc: func() string {
				sprints := []string{
					"Sprint 3 - Dashboard",
					"Sprint 4 - Notification",
					"Sprint 2 - Backend",
				}
				who := []string{"Budi Santoso", "Rina Wijaya"}
				return fmt.Sprintf("%s memulai %s",
					who[rand.Intn(len(who))],
					sprints[rand.Intn(len(sprints))],
				)
			},
			EntityType:  "sprint",
			LinkPattern: "/sprints",
		},
		{
			Type:  "mention",
			Title: "Anda di-mention dalam komentar",
			BodyFunc: func() string {
				who := []string{"Budi Santoso", "Andi Pratama", "Siti Nurhaliza", "Dian Kusuma"}
				titles := []string{
					"Optimasi render kanban",
					"Setup WebSocket realtime",
					"Buat dashboard analytics",
				}
				return fmt.Sprintf("%s menyebut Anda di task \"%s\"",
					who[rand.Intn(len(who))],
					titles[rand.Intn(len(titles))],
				)
			},
			EntityType:  "task",
			LinkPattern: "/board",
		},
	}

	// ============================================================
	// INSERT
	// ============================================================
	q := `
		INSERT INTO notifications
			(user_id, actor_id, type, title, body, entity_type, entity_id, link, is_read, read_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	total := 120       // perbesar biar variatif
	unreadCount := 0
	readCount := 0

	for i := 0; i < total; i++ {
		// Pilih template & target
		tpl := templates[rand.Intn(len(templates))]
		recipient := userIDs[rand.Intn(len(userIDs))]

		// Actor: pilih user lain (jangan diri sendiri)
		actor := recipient
		if len(userIDs) > 1 {
			for actor == recipient {
				actor = userIDs[rand.Intn(len(userIDs))]
			}
		}

		// Entity ID (task/sprint)
		var entityID uint64
		switch tpl.EntityType {
		case "task":
			if len(taskIDs) > 0 {
				entityID = taskIDs[rand.Intn(len(taskIDs))]
			}
		case "sprint":
			if len(sprintIDs) > 0 {
				entityID = sprintIDs[rand.Intn(len(sprintIDs))]
			}
		}

		// Is read: 60% read, 40% unread (biar bell notification tetap ada yang merah)
		isRead := 0
		var readAt interface{} = nil
		if rand.Float32() < 0.6 {
			isRead = 1
			readAt = "NOW()"
		}

		var readAtVal interface{}
		if isRead == 1 {
			readAtVal = gofakeit.Date()
		} else {
			readAtVal = nil
		}
		_ = readAt // hindari unused

		if _, err := s.DB.Exec(q,
			recipient,
			actor,
			tpl.Type,
			tpl.Title,
			tpl.BodyFunc(),
			tpl.EntityType,
			entityID,
			tpl.LinkPattern,
			isRead,
			readAtVal,
		); err != nil {
			return fmt.Errorf("insert notification: %w", err)
		}

		if isRead == 1 {
			readCount++
		} else {
			unreadCount++
		}
	}

	log.Printf("   ✅ %d notifications (%d unread, %d read)", total, unreadCount, readCount)
	return nil
}