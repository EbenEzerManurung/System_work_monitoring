package services

import (
	"database/sql"
	"errors"
	"strings"

	"backend/models"
	"backend/repositories"
)

type SprintService struct {
	Repo *repositories.SprintRepository
	DB   *sql.DB
}

func NewSprintService(repo *repositories.SprintRepository, db *sql.DB) *SprintService {
	return &SprintService{Repo: repo, DB: db}
}

// ============================================================
// LIST & GET
// ============================================================

func (s *SprintService) List(deptID uint64, isSuperadmin bool) ([]models.Sprint, error) {
	return s.Repo.ListByDepartment(deptID, isSuperadmin)
}

func (s *SprintService) Get(id uint64) (*models.Sprint, error) {
	return s.Repo.FindByID(id)
}

// ============================================================
// CREATE
// ============================================================

type CreateSprintInput struct {
	ProjectID uint64  `json:"project_id" binding:"required"`
	Name      string  `json:"name" binding:"required"`
	Goal      string  `json:"goal"`
	StartDate *string `json:"start_date"`
	EndDate   *string `json:"end_date"`
}

func (s *SprintService) Create(in *CreateSprintInput) (*models.Sprint, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, errors.New("Nama sprint wajib diisi")
	}
	if in.ProjectID == 0 {
		return nil, errors.New("Project wajib dipilih")
	}

	sprint := &models.Sprint{
		ProjectID: in.ProjectID,
		Name:      strings.TrimSpace(in.Name),
		Goal:      strings.TrimSpace(in.Goal),
		Status:    "backlog",
		StartDate: in.StartDate,
		EndDate:   in.EndDate,
	}

	id, err := s.Repo.Create(sprint)
	if err != nil {
		return nil, err
	}
	return s.Repo.FindByID(id)
}

// ============================================================
// UPDATE
// ============================================================

type UpdateSprintInput struct {
	Name      string  `json:"name" binding:"required"`
	Goal      string  `json:"goal"`
	StartDate *string `json:"start_date"`
	EndDate   *string `json:"end_date"`
}

func (s *SprintService) Update(id uint64, in *UpdateSprintInput) (*models.Sprint, error) {
	existing, err := s.Repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Sprint tidak ditemukan")
	}

	if existing.Status == "completed" || existing.Status == "cancelled" {
		return nil, errors.New("Sprint yang sudah selesai tidak bisa diubah")
	}

	if strings.TrimSpace(in.Name) == "" {
		return nil, errors.New("Nama sprint wajib diisi")
	}

	existing.Name = strings.TrimSpace(in.Name)
	existing.Goal = strings.TrimSpace(in.Goal)
	existing.StartDate = in.StartDate
	existing.EndDate = in.EndDate

	if err := s.Repo.Update(existing); err != nil {
		return nil, err
	}
	return s.Repo.FindByID(id)
}

// ============================================================
// DELETE
// ============================================================

func (s *SprintService) Delete(id uint64) error {
	sprint, err := s.Repo.FindByID(id)
	if err != nil {
		return errors.New("Sprint tidak ditemukan")
	}
	if sprint.Status == "active" {
		return errors.New("Sprint yang sedang aktif tidak bisa dihapus. Selesaikan sprint dulu.")
	}
	return s.Repo.Delete(id)
}

// ============================================================
// WORKFLOW: START
//
// ⚠️ PENTING — aturan scoring ada di repository (progressScoreSQL):
//
//    progress_level = 'in_progress'  → 1 SP per task
//    progress_level = 'almost_done'  → ½ × objective per task
//    progress_level = 'done'         → full objective per task
//
// File ini TIDAK menghitung SP — cuma memanggil Repo.StartSprint(id)
// yang di dalamnya ada SQL yang mengubah task → 'in_progress'
// dan memanggil syncSprintPointsTx() untuk refresh completed_points.
// ============================================================
func (s *SprintService) Start(id uint64) error {
	sprint, err := s.Repo.FindByID(id)
	if err != nil {
		return errors.New("Sprint tidak ditemukan")
	}

	switch sprint.Status {
	case "active":
		return errors.New("Sprint sudah aktif")
	case "completed", "cancelled":
		return errors.New("Sprint yang sudah selesai tidak bisa dimulai ulang")
	}

	var taskCount int
	if err := s.DB.QueryRow(`
		SELECT COUNT(*) FROM tasks
		WHERE sprint_id = ? AND deleted_at IS NULL
	`, id).Scan(&taskCount); err != nil {
		return err
	}
	if taskCount == 0 {
		return errors.New("Sprint belum punya task. Assign task dulu dari Backlog.")
	}

	return s.Repo.StartSprint(id)
}

// ============================================================
// WORKFLOW: COMPLETE
// ============================================================
func (s *SprintService) Complete(id uint64) error {
	sprint, err := s.Repo.FindByID(id)
	if err != nil {
		return errors.New("Sprint tidak ditemukan")
	}

	switch sprint.Status {
	case "completed":
		return errors.New("Sprint sudah selesai")
	case "backlog", "cancelled":
		return errors.New("Hanya sprint yang sedang aktif bisa diselesaikan")
	}

	return s.Repo.CompleteSprint(id)
}

// ============================================================
// ASSIGN TASK
//
// Aturan status task saat di-assign (ada di repository):
//   - Sprint 'backlog': task → 'backlog', progress 'not_started' (0 SP)
//   - Sprint 'active':  task → 'in_progress', progress 'in_progress' (1 SP)
// ============================================================
func (s *SprintService) AssignTasks(sprintID uint64, taskIDs []uint64) error {
	if len(taskIDs) == 0 {
		return errors.New("Pilih minimal 1 task")
	}

	sprint, err := s.Repo.FindByID(sprintID)
	if err != nil {
		return errors.New("Sprint tidak ditemukan")
	}

	if sprint.Status == "completed" || sprint.Status == "cancelled" {
		return errors.New("Tidak bisa assign task ke sprint yang sudah selesai")
	}

	return s.Repo.AssignTasksToSprint(sprintID, taskIDs)
}

// ============================================================
// REMOVE TASK
// ============================================================
func (s *SprintService) RemoveTask(taskID uint64) error {
	if taskID == 0 {
		return errors.New("ID task tidak valid")
	}
	return s.Repo.RemoveTaskFromSprint(taskID)
}

// ============================================================
// SYNC POINTS
//
// Recalculate total_points & completed_points dari task.
// Formula ada di repository (SyncSprintPoints).
// ============================================================
func (s *SprintService) SyncAll() error {
	return s.Repo.SyncSprintPoints()
}