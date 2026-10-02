package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

type SprintController struct {
	svc *services.SprintService
}

func NewSprintController(s *services.SprintService) *SprintController {
	return &SprintController{svc: s}
}

// ============================================================
// HELPER
// ============================================================

func parseSprintID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		utils.Fail(c, http.StatusBadRequest, "ID sprint tidak valid")
		return 0, false
	}
	return id, true
}

// ============================================================
// LIST & GET
// ============================================================

func (h *SprintController) List(c *gin.Context) {
	role := middleware.CurrentRole(c)
	deptID := middleware.CurrentDepartmentID(c)

	isSuperadmin := role == "admin" || role == "superadmin"

	data, err := h.svc.List(deptID, isSuperadmin)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *SprintController) Get(c *gin.Context) {
	id, ok := parseSprintID(c)
	if !ok {
		return
	}

	data, err := h.svc.Get(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "Sprint tidak ditemukan")
		return
	}
	utils.OK(c, data)
}

// ============================================================
// CRUD (admin / manager only)
// ============================================================

func (h *SprintController) Create(c *gin.Context) {
	var body services.CreateSprintInput
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	data, err := h.svc.Create(&body)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *SprintController) Update(c *gin.Context) {
	id, ok := parseSprintID(c)
	if !ok {
		return
	}

	var body services.UpdateSprintInput
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	data, err := h.svc.Update(id, &body)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *SprintController) Delete(c *gin.Context) {
	id, ok := parseSprintID(c)
	if !ok {
		return
	}

	if err := h.svc.Delete(id); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Sprint berhasil dihapus")
}

// ============================================================
// WORKFLOW: START
//
// ⚠️ CATATAN — bukan di sini logika SP berada.
//
// Perubahan yang dilakukan saat Start():
//   - Repo.StartSprint(id) → panggil SQL UPDATE tasks SET progress_level='in_progress'
//   - SQL progressScoreSQL: WHEN 'in_progress' THEN 1 → dijalankan PER BARIS task
//   - completed_points = SUM(1) dari semua task in_progress
//
// Jadi kalau 5 task → completed = 5 SP. Itu bukan "dikali 5",
// tapi penjumlahan per baris (1+1+1+1+1).
// ============================================================
func (h *SprintController) Start(c *gin.Context) {
	id, ok := parseSprintID(c)
	if !ok {
		return
	}

	if err := h.svc.Start(id); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Sprint berhasil dimulai — task sudah masuk Kanban Board kolom In Progress")
}

// ============================================================
// WORKFLOW: COMPLETE
// ============================================================
func (h *SprintController) Complete(c *gin.Context) {
	id, ok := parseSprintID(c)
	if !ok {
		return
	}

	if err := h.svc.Complete(id); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Sprint berhasil diselesaikan — task tetap muncul di Kanban Board")
}

// ============================================================
// ASSIGN TASK
// ============================================================
func (h *SprintController) AssignTasks(c *gin.Context) {
	id, ok := parseSprintID(c)
	if !ok {
		return
	}

	var body struct {
		TaskIDs []uint64 `json:"task_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	if len(body.TaskIDs) == 0 {
		utils.Fail(c, http.StatusBadRequest, "Pilih minimal 1 task")
		return
	}

	if err := h.svc.AssignTasks(id, body.TaskIDs); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Task berhasil di-assign ke sprint")
}

// ============================================================
// REMOVE TASK
// ============================================================
func (h *SprintController) RemoveTask(c *gin.Context) {
	taskID, err := strconv.ParseUint(c.Param("task_id"), 10, 64)
	if err != nil || taskID == 0 {
		utils.Fail(c, http.StatusBadRequest, "ID task tidak valid")
		return
	}

	if err := h.svc.RemoveTask(taskID); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Task dikembalikan ke Backlog")
}

// ============================================================
// SYNC POINTS (admin only)
// ============================================================
func (h *SprintController) Sync(c *gin.Context) {
	if err := h.svc.SyncAll(); err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OKMsg(c, "Sprint points berhasil disinkronkan")
}