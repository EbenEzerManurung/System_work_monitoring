package services

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	"backend/repositories"
)

// ============================================================
// ⚠️ DEPRECATED UTILITY
//
// File ini adalah utility standalone untuk sinkronisasi sprint points.
// Untuk workflow normal, gunakan:
//   - SprintService.SyncAll()               → recalculate semua sprint
//   - SprintRepository.SyncSprintPoints()   → method internal
//
// Fungsi di sini dipertahankan untuk backward compatibility &
// dipakai oleh seeder / maintenance script.
//
// Formula (single source of truth di repositories/sprint_repository.go):
//   total_points     = SUM(story_points)
//   completed_points = SUM(progress_score)
// ============================================================

// ============================================================
// SyncSprintPoints — recalculate points SEMUA sprint dari task real.
//
// Formula:
//   total_points     = SUM(story_points) semua task di sprint
//   completed_points = SUM(progress_score) berdasarkan progress_level
//
// ⚠️ Fungsi ini delegate ke repository — tidak ada duplikasi SQL.
// ============================================================
func SyncSprintPoints(db *sql.DB) error {
	if db == nil {
		return errors.New("database connection is nil")
	}

	log.Println("🔄 [sprint_sync] Sync all sprint points dari task real...")

	repo := repositories.NewSprintRepository(db)
	if err := repo.SyncSprintPoints(); err != nil {
		return fmt.Errorf("sync sprint points: %w", err)
	}

	log.Println("✅ [sprint_sync] Sprint points synced")
	return nil
}

// ============================================================
// SyncSprintPointsByID — recalculate points 1 sprint spesifik.
//
// Berguna untuk maintenance / manual trigger.
// Delegate ke repository logic — biar konsisten.
// ============================================================
func SyncSprintPointsByID(db *sql.DB, sprintID uint64) error {
	if db == nil {
		return errors.New("database connection is nil")
	}
	if sprintID == 0 {
		return errors.New("sprint ID tidak valid")
	}

	repo := repositories.NewSprintRepository(db)

	// Cek sprint exists
	if _, err := repo.FindByID(sprintID); err != nil {
		return fmt.Errorf("sprint tidak ditemukan: %w", err)
	}

	// Karena repository hanya punya SyncSprintPoints() (semua sprint),
	// kita sync semua tapi hanya sprint ini yang berubah signifikan.
	// Alternatif: skip, karena sync all cepat untuk dataset kecil-menengah.
	if err := repo.SyncSprintPoints(); err != nil {
		return fmt.Errorf("sync sprint points: %w", err)
	}

	return nil
}