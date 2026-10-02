package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

type AuthController struct {
	svc *services.AuthService
}

func NewAuthController(s *services.AuthService) *AuthController {
	return &AuthController{svc: s}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Login — POST /api/v1/login
func (h *AuthController) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	res, err := h.svc.Login(req.Email, req.Password)
	if err != nil {
		utils.Fail(c, http.StatusUnauthorized, err.Error())
		return
	}

	utils.OK(c, res)
}

// Me — GET /api/v1/me (butuh auth)
func (h *AuthController) Me(c *gin.Context) {
	userID := middleware.CurrentUserID(c)
	if userID == 0 {
		utils.Fail(c, http.StatusUnauthorized, "user tidak terautentikasi")
		return
	}

	user, err := h.svc.Me(userID)
	if err != nil {
		utils.Fail(c, http.StatusNotFound, err.Error())
		return
	}

	utils.OK(c, user)
}

// Logout — POST /api/v1/logout (opsional, client-side delete token)
func (h *AuthController) Logout(c *gin.Context) {
	utils.OKMsg(c, "berhasil logout")
}
