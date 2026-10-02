package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/models"
	"backend/services"
	"backend/utils"
)

type DepartmentController struct {
	svc *services.DepartmentService
}

func NewDepartmentController(s *services.DepartmentService) *DepartmentController {
	return &DepartmentController{svc: s}
}

func (h *DepartmentController) List(c *gin.Context) {
	data, err := h.svc.List()
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *DepartmentController) Get(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	data, err := h.svc.Get(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, "departemen tidak ditemukan")
		return
	}
	utils.OK(c, data)
}

func (h *DepartmentController) Create(c *gin.Context) {
	var body models.Department
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

func (h *DepartmentController) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body models.Department
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	body.ID = id
	data, err := h.svc.Update(&body)
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *DepartmentController) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(id); err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OKMsg(c, "departemen dihapus")
}