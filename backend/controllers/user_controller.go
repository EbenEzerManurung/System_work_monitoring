package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

type UserController struct {
	svc *services.UserService
}

func NewUserController(s *services.UserService) *UserController {
	return &UserController{svc: s}
}

func (h *UserController) List(c *gin.Context) {
	role := middleware.CurrentRole(c)
	deptID := middleware.CurrentDepartmentID(c)
	isSuperadmin := role == "admin"

	data, err := h.svc.List(deptID, isSuperadmin)
	if err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *UserController) Get(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	data, err := h.svc.Get(id)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, err.Error())
		return
	}
	utils.OK(c, data)
}

func (h *UserController) Create(c *gin.Context) {
	var body services.CreateUserInput
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

func (h *UserController) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var body services.UpdateUserInput
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

func (h *UserController) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(id); err != nil {
		utils.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.OKMsg(c, "user dihapus")
}
