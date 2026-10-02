package services

import (
	"errors"

	"backend/repositories"
	"backend/utils"
)

type AuthService struct {
	UserRepo  *repositories.UserRepository
	JWTSecret string
}

func NewAuthService(repo *repositories.UserRepository, secret string) *AuthService {
	return &AuthService{UserRepo: repo, JWTSecret: secret}
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

func (s *AuthService) Login(email, password string) (*LoginResponse, error) {
	user, err := s.UserRepo.FindByEmail(email)
	if err != nil {
		return nil, errors.New("email atau password salah")
	}
	if !utils.CheckPassword(user.PasswordHash, password) {
		return nil, errors.New("email atau password salah")
	}
	token, err := utils.GenerateToken(
		user.ID, user.Email, user.Role, user.DepartmentID, s.JWTSecret,
	)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = ""
	return &LoginResponse{Token: token, User: user}, nil
}

func (s *AuthService) Me(userID uint64) (*interface{}, error) {
	user, err := s.UserRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user tidak ditemukan")
	}
	user.PasswordHash = ""
	var out interface{} = user
	return &out, nil
}
