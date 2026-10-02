package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

type TaskController struct {
	svc *services.TaskService
}

func NewTaskController(s *services.TaskService) *TaskController {
	return &TaskController{svc: s}
}

// ============================================================
// HELPER
// ============================================================

// parseTaskID — parse & validasi ID task dari param URL
func parseTaskID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		utils.Fail(c, http.StatusBadRequest, "ID task tidak valid")
		return 0, false
	}
	return id, true
}

// ⭐ isSuperadminRole — helper untuk konsistensi cek role admin
func isSuperadminRole(c *gin.Context) bool {
	role := middleware.CurrentRole(c)
	return role == "admin" || role == "superadmin"
}

// ============================================================
// LIST ENDPOINTS
// ============================================================

// List — GET /tasks
// Semua task di department user ATAU task yang di-assign ke user
func (h *TaskController) List(c *gin.Context) {
	deptID := middleware.CurrentDepartmentID(c)
	userID := middleware.CurrentUserID(c)   // ⭐ BARU
	isSuperadmin := isSuperadminRole(c)

	data, err := h.svc.List(deptID, userID, isSuperadmin)   // ⭐ tambah userID
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

// Backlog — GET /tasks/backlog
// HANYA task yang BELUM di-assign & BELUM masuk sprint
func (h *TaskController) Backlog(c *gin.Context) {
	deptID := middleware.CurrentDepartmentID(c)
	userID := middleware.CurrentUserID(c)   // ⭐ BARU
	isSuperadmin := isSuperadminRole(c)

	data, err := h.svc.ListBacklog(deptID, userID, isSuperadmin)   // ⭐ tambah userID
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

// ListAssigned — GET /tasks/assigned
// Task yang muncul di Kanban Board
func (h *TaskController) ListAssigned(c *gin.Context) {
	deptID := middleware.CurrentDepartmentID(c)
	userID := middleware.CurrentUserID(c)   // ⭐ BARU
	isSuperadmin := isSuperadminRole(c)

	data, err := h.svc.ListAssigned(deptID, userID, isSuperadmin)   // ⭐ tambah userID
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

// ListBySprint — GET /tasks/sprint/:id
// Task dalam sprint tertentu
func (h *TaskController) ListBySprint(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		utils.Fail(c, http.StatusBadRequest, "ID sprint tidak valid")
		return
	}

	data, err := h.svc.ListBySprint(id)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

// Get — GET /tasks/:id
// Detail 1 task
func (h *TaskController) Get(c *gin.Context) {
	id, ok := parseTaskID(c)
	if !ok {
		return
	}

	data, err := h.svc.Get(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "Task tidak ditemukan")
		return
	}
	utils.OK(c, data)
}

// ============================================================
// CREATE
// ============================================================

// Create — POST /tasks
//
// Body: {
//   title, description, objective, priority, type,
//   progress_level?, assignee_id?, due_date?, sprint_id?, project_id?
// }
//
// Behaviour:
//   - Assignee di-set       → status otomatis 'todo'  (muncul di Kanban)
//   - Assignee tidak di-set → status otomatis 'backlog' (tetap di Backlog)
//   - Auto-link sprint: kalau assignee di-set & task belum punya sprint,
//     backend cari sprint user di project yang sama → link otomatis
//   - Validasi: assignee harus di department yang sama (kecuali superadmin)
func (h *TaskController) Create(c *gin.Context) {
	var body services.CreateTaskInput
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	// Reporter = user yang login
	if uid := middleware.CurrentUserID(c); uid > 0 {
		body.ReporterID = uid
	}

	// Department restriction
	deptID := middleware.CurrentDepartmentID(c)
	isSuperadmin := isSuperadminRole(c)

	data, err := h.svc.Create(&body, deptID, isSuperadmin)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OK(c, data)
}

// ============================================================
// UPDATE
// ============================================================

// Update — PUT /tasks/:id
//
// Body: {
//   title, description, status, priority, type, objective,
//   progress_level, assignee_id, due_date
// }
//
// Behaviour:
//   - Task 'backlog' + assignee baru di-set → otomatis 'todo' (pindah ke Kanban)
//   - Assignee dihapus (di-set 0/null)      → kembali 'backlog'
//   - Task yang sudah di Kanban             → status existing dipertahankan
//   - Auto-link sprint: kalau re-assign ke user & task belum punya sprint,
//     backend cari sprint user → link otomatis
func (h *TaskController) Update(c *gin.Context) {
	id, ok := parseTaskID(c)
	if !ok {
		return
	}

	var body services.UpdateTaskInput
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	deptID := middleware.CurrentDepartmentID(c)
	isSuperadmin := isSuperadminRole(c)

	data, err := h.svc.Update(id, &body, deptID, isSuperadmin)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OK(c, data)
}

// ============================================================
// UPDATE STATUS (Kanban drag & drop)
// ============================================================

// UpdateStatus — PATCH /tasks/:id/status
//
// Body: { status }
//
// Backend otomatis update progress_level:
//   - backlog     → not_started
//   - todo        → not_started
//   - in_progress → in_progress  (1 SP)
//   - review      → almost_done  (½ SP)
//   - done        → done         (full SP)
//
// Validasi: task harus punya assignee kalau mau masuk Kanban (selain 'backlog')
func (h *TaskController) UpdateStatus(c *gin.Context) {
	id, ok := parseTaskID(c)
	if !ok {
		return
	}

	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.UpdateStatus(id, body.Status); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Status task berhasil diubah")
}

// ============================================================
// UPDATE PROGRESS ONLY (dari form edit)
// ============================================================

// UpdateProgress — PATCH /tasks/:id/progress
//
// Body: { progress_level }
//
// Dipakai kalau user edit progress_level manual tanpa ubah status.
func (h *TaskController) UpdateProgress(c *gin.Context) {
	id, ok := parseTaskID(c)
	if !ok {
		return
	}

	var body struct {
		ProgressLevel string `json:"progress_level" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.UpdateProgress(id, body.ProgressLevel); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OKMsg(c, "Progress task berhasil diubah")
}

// ============================================================
// DELETE
// ============================================================

// Delete — DELETE /tasks/:id
// Soft delete (set deleted_at)
func (h *TaskController) Delete(c *gin.Context) {
	id, ok := parseTaskID(c)
	if !ok {
		return
	}

	if err := h.svc.Delete(id); err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OKMsg(c, "Task berhasil dihapus")
}