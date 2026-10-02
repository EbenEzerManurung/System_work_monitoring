package migration

import (
	"database/sql"
	"fmt"
	"log"
)

type Migrator struct {
	DB *sql.DB
}

func NewMigrator(db *sql.DB) *Migrator {
	return &Migrator{DB: db}
}

// ensureTrackingTable — tabel `migrations` untuk mencatat migrasi yang sudah dijalankan
func (m *Migrator) ensureTrackingTable() error {
	_, err := m.DB.Exec(`
		CREATE TABLE IF NOT EXISTS migrations (
			id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			name       VARCHAR(255) NOT NULL UNIQUE,
			batch      INT NOT NULL DEFAULT 1,
			executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
	`)
	return err
}

// Up — jalankan semua migrasi yang belum dijalankan
func (m *Migrator) Up() error {
	if err := m.ensureTrackingTable(); err != nil {
		return err
	}

	var currentBatch int
	_ = m.DB.QueryRow(`SELECT COALESCE(MAX(batch), 0) FROM migrations`).Scan(&currentBatch)
	nextBatch := currentBatch + 1

	for _, mig := range Migrations {
		var exists int
		err := m.DB.QueryRow(`SELECT COUNT(*) FROM migrations WHERE name = ?`, mig.Name).Scan(&exists)
		if err != nil {
			return err
		}
		if exists > 0 {
			log.Printf("   ⏭️  Skip (sudah jalan): %s", mig.Name)
			continue
		}

		log.Printf("   ⬆️  Migration UP: %s", mig.Name)
		if _, err := m.DB.Exec(mig.Up); err != nil {
			return fmt.Errorf("gagal migrasi %s: %w", mig.Name, err)
		}
		if _, err := m.DB.Exec(`INSERT INTO migrations (name, batch) VALUES (?, ?)`, mig.Name, nextBatch); err != nil {
			return err
		}
	}
	log.Printf("✅ Migration UP selesai (batch %d)", nextBatch)
	return nil
}

// Down — rollback migrasi terakhir (1 batch terakhir)
func (m *Migrator) Down() error {
	if err := m.ensureTrackingTable(); err != nil {
		return err
	}

	var lastBatch int
	if err := m.DB.QueryRow(`SELECT COALESCE(MAX(batch), 0) FROM migrations`).Scan(&lastBatch); err != nil {
		return err
	}
	if lastBatch == 0 {
		log.Println("ℹ️  Tidak ada migrasi untuk di-rollback")
		return nil
	}

	// Ambil migrasi di batch terakhir, urut terbalik
	rows, err := m.DB.Query(`SELECT name FROM migrations WHERE batch = ? ORDER BY id DESC`, lastBatch)
	if err != nil {
		return err
	}
	var names []string
	for rows.Next() {
		var n string
		rows.Scan(&n)
		names = append(names, n)
	}
	rows.Close()

	lookup := map[string]Migration{}
	for _, mig := range Migrations {
		lookup[mig.Name] = mig
	}

	for _, name := range names {
		mig, ok := lookup[name]
		if !ok {
			continue
		}
		log.Printf("   ⬇️  Rollback: %s", mig.Name)
		if _, err := m.DB.Exec(mig.Down); err != nil {
			return fmt.Errorf("gagal rollback %s: %w", mig.Name, err)
		}
		if _, err := m.DB.Exec(`DELETE FROM migrations WHERE name = ?`, mig.Name); err != nil {
			return err
		}
	}
	log.Printf("✅ Rollback batch %d selesai", lastBatch)
	return nil
}

// Fresh — hapus semua tabel lalu migrate ulang dari nol
func (m *Migrator) Fresh() error {
	log.Println("🗑️  Dropping semua tabel...")

	// Matikan FK check agar drop berurutan aman
	if _, err := m.DB.Exec(`SET FOREIGN_KEY_CHECKS = 0`); err != nil {
		return err
	}

	// Drop semua tabel (urutan reversed dari dependency)
	dropOrder := []string{
		"audit_trails", "notifications", "activity_logs", "attachments",
		"comments", "task_assignees", "tasks", "sprints",
		"project_members", "projects", "users", "departments", "migrations",
	}
	for _, tbl := range dropOrder {
		if _, err := m.DB.Exec("DROP TABLE IF EXISTS " + tbl); err != nil {
			return fmt.Errorf("drop %s: %w", tbl, err)
		}
	}

	if _, err := m.DB.Exec(`SET FOREIGN_KEY_CHECKS = 1`); err != nil {
		return err
	}
	log.Println("✅ Semua tabel dihapus")

	// Jalankan migrate up lagi
	return m.Up()
}
