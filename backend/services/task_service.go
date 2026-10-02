package services

import (
	"errors"
	"strings"
	"time"

	"backend/models"
	"backend/repositories"
)

type TaskService struct {
	Repo     *repositories.TaskRepository
	UserRepo *repositories.UserRepository
}

func NewTaskService(repo *repositories.TaskRepository, userRepo *repositories.UserRepository) *TaskService {
	return &TaskService{Repo: repo, UserRepo: userRepo}
}

// ============================================================
// LIST METHODS
// ============================================================

func (s *TaskService) List(deptID, userID uint64, isSuperadmin bool) ([]repositories.TaskWithMeta, error) {
	return s.Repo.List(deptID, userID, isSuperadmin)
}

func (s *TaskService) ListBacklog(deptID, userID uint64, isSuperadmin bool) ([]repositories.TaskWithMeta, error) {
	return s.Repo.ListBacklog(deptID, userID, isSuperadmin)
}

func (s *TaskService) ListAssigned(deptID, userID uint64, isSuperadmin bool) ([]repositories.TaskWithMeta, error) {
	return s.Repo.ListAssigned(deptID, userID, isSuperadmin)
}

func (s *TaskService) ListBySprint(sprintID uint64) ([]repositories.TaskWithMeta, error) {
	return s.Repo.ListBySprint(sprintID)
}

func (s *TaskService) Get(id uint64) (*repositories.TaskWithMeta, error) {
	return s.Repo.FindByID(id)
}

// ============================================================
// HELPERS
// ============================================================

func getSPFromObjective(obj string) int {
	switch obj {
	case "daily":           return 1
	case "troubleshooting": return 8
	case "compliance":      return 20
	case "improvement":     return 20
	case "new_project":     return 60
	default:                return 1
	}
}

var validProgressLevels = map[string]bool{
	"not_started": true, "in_progress": true,
	"almost_done": true, "done":        true,
}

func normalizeProgressLevel(progressLevel, objective string) string {
	if progressLevel == "" {
		return "not_started"
	}
	if !validProgressLevels[progressLevel] {
		return "not_started"
	}
	return progressLevel
}

func (s *TaskService) validateAssignee(assigneeID *uint64, requesterDeptID uint64, isSuperadmin bool) error {
	if assigneeID == nil || *assigneeID == 0 {
		return nil
	}
	if isSuperadmin {
		return nil
	}
	assignee, err := s.UserRepo.FindByID(*assigneeID)
	if err != nil {
		return errors.New("Assignee tidak ditemukan")
	}
	if requesterDeptID > 0 && assignee.DepartmentID != requesterDeptID {
		return errors.New("Tidak bisa assign ke department lain")
	}
	return nil
}

func hasAssignee(assigneeID *uint64) bool {
	return assigneeID != nil && *assigneeID > 0
}

func taskHasAssignee(task *repositories.TaskWithMeta) bool {
	if task == nil {
		return false
	}
	if task.AssigneeID != nil && *task.AssigneeID > 0 {
		return true
	}
	return strings.TrimSpace(task.AssigneeName) != ""
}

// ============================================================
// CREATE
// ============================================================

type CreateTaskInput struct {
	ProjectID     uint64  `json:"project_id"`
	SprintID      *uint64 `json:"sprint_id"`
	ReporterID    uint64  `json:"reporter_id"`
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description"`
	Status        string  `json:"status"`
	Priority      string  `json:"priority"`
	Type          string  `json:"type"`
	Objective     string  `json:"objective"`
	ProgressLevel string  `json:"progress_level"`
	AssigneeID    *uint64 `json:"assignee_id"`
	DueDate       *string `json:"due_date"`
}

func (s *TaskService) Create(in *CreateTaskInput, requesterDeptID uint64, isSuperadmin bool) (*repositories.TaskWithMeta, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return nil, errors.New("Judul task wajib diisi")
	}

	if in.Objective == "" { in.Objective = "daily" }
	if in.Priority == "" { in.Priority = "medium" }
	if in.Type == "" { in.Type = "task" }

	if err := s.validateAssignee(in.AssigneeID, requesterDeptID, isSuperadmin); err != nil {
		return nil, err
	}

	status := "backlog"
	if hasAssignee(in.AssigneeID) {
		status = "todo"
	}

	progressLevel := normalizeProgressLevel(in.ProgressLevel, in.Objective)

	projectID := in.ProjectID
	if projectID == 0 {
		pid, err := s.Repo.FindDefaultProjectID()
		if err != nil {
			return nil, errors.New("Tidak ada project di database")
		}
		projectID = pid
	}

	reporterID := in.ReporterID
	if reporterID == 0 {
		u, err := s.UserRepo.FindByID(1)
		if err == nil {
			reporterID = u.ID
		}
	}

	// ⭐ AUTO-LINK SPRINT (KUNCI UTAMA)
	sprintID := in.SprintID
	if sprintID == nil && hasAssignee(in.AssigneeID) {
		newSprint, err := s.Repo.FindOrCreateSprintForUser(*in.AssigneeID, projectID)
		if err == nil && newSprint != nil {
			sprintID = newSprint
		}
	}

	t := &models.Task{
		ProjectID:     projectID,
		SprintID:      sprintID,
		ReporterID:    reporterID,
		Title:         title,
		Description:   strings.TrimSpace(in.Description),
		Status:        status,
		Priority:      in.Priority,
		Type:          in.Type,
		Objective:     in.Objective,
		ProgressLevel: progressLevel,
		StoryPoints:   getSPFromObjective(in.Objective),
		Position:      int(time.Now().Unix() % 10000),
		DueDate:       in.DueDate,
	}

	id, err := s.Repo.Create(t, in.AssigneeID)
	if err != nil {
		return nil, err
	}
	return s.Repo.FindByID(id)
}

// ============================================================
// UPDATE
// ============================================================

type UpdateTaskInput struct {
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description"`
	Status        string  `json:"status"`
	Priority      string  `json:"priority"`
	Type          string  `json:"type"`
	Objective     string  `json:"objective"`
	ProgressLevel string  `json:"progress_level"`
	AssigneeID    *uint64 `json:"assignee_id"`
	DueDate       *string `json:"due_date"`
}

func (s *TaskService) Update(id uint64, in *UpdateTaskInput, requesterDeptID uint64, isSuperadmin bool) (*repositories.TaskWithMeta, error) {
	existing, err := s.Repo.FindByID(id)
	if err != nil {
		return nil, errors.New("Task tidak ditemukan")
	}

	if err := s.validateAssignee(in.AssigneeID, requesterDeptID, isSuperadmin); err != nil {
		return nil, err
	}

	status := existing.Status
	if in.AssigneeID != nil {
		if *in.AssigneeID == 0 {
			status = "backlog"
		} else if existing.Status == "backlog" {
			status = "todo"
		}
	}

	objective := in.Objective
	if objective == "" { objective = existing.Objective }

	progressLevel := in.ProgressLevel
	if progressLevel == "" { progressLevel = existing.ProgressLevel }
	progressLevel = normalizeProgressLevel(progressLevel, objective)

	// ⭐ AUTO-LINK SPRINT saat re-assign
	sprintID := existing.SprintID
	if in.AssigneeID != nil && *in.AssigneeID > 0 && sprintID == nil {
		newSprint, err := s.Repo.FindOrCreateSprintForUser(*in.AssigneeID, existing.ProjectID)
		if err == nil && newSprint != nil {
			sprintID = newSprint
		}
	}

	t := &models.Task{
		ID:            id,
		Title:         strings.TrimSpace(in.Title),
		Description:   strings.TrimSpace(in.Description),
		Status:        status,
		Priority:      in.Priority,
		Type:          in.Type,
		Objective:     objective,
		ProgressLevel: progressLevel,
		StoryPoints:   getSPFromObjective(objective),
		DueDate:       in.DueDate,
		SprintID:      sprintID,
	}

	if t.Title == "" { t.Title = existing.Title }
	if t.Priority == "" { t.Priority = existing.Priority }
	if t.Type == "" { t.Type = existing.Type }

	if err := s.Repo.Update(t, in.AssigneeID); err != nil {
		return nil, err
	}
	return s.Repo.FindByID(id)
}

// ============================================================
// UPDATE STATUS
// ============================================================
func (s *TaskService) UpdateStatus(id uint64, status string) error {
	if status == "" {
		return errors.New("Status wajib diisi")
	}
	validStatuses := map[string]bool{
		"backlog": true, "todo": true, "in_progress": true,
		"review": true, "done": true,
	}
	if !validStatuses[status] {
		return errors.New("Status tidak valid")
	}

	task, err := s.Repo.FindByID(id)
	if err != nil {
		return errors.New("Task tidak ditemukan")
	}

	if status != "backlog" && !taskHasAssignee(task) {
		return errors.New("Task harus di-assign ke staff terlebih dahulu")
	}

	return s.Repo.UpdateStatus(id, status)
}

// ============================================================
// UPDATE PROGRESS
// ============================================================
func (s *TaskService) UpdateProgress(id uint64, progressLevel string) error {
	task, err := s.Repo.FindByID(id)
	if err != nil {
		return errors.New("Task tidak ditemukan")
	}
	progressLevel = normalizeProgressLevel(progressLevel, task.Objective)
	return s.Repo.UpdateProgress(id, progressLevel)
}

// ============================================================
// DELETE
// ============================================================
func (s *TaskService) Delete(id uint64) error {
	return s.Repo.Delete(id)
}