package services

import (
	"errors"

	"backend/models"
	"backend/repositories"
	"backend/utils"
)

type UserService struct {
	Repo *repositories.UserRepository
}

func NewUserService(repo *repositories.UserRepository) *UserService {
	return &UserService{Repo: repo}
}

func (s *UserService) List(deptID uint64, isSuperadmin bool) ([]repositories.UserWithDept, error) {
	return s.Repo.List(deptID, isSuperadmin)
}

func (s *UserService) Get(id uint64) (*models.User, error) {
	u, err := s.Repo.FindByID(id)
	if err != nil {
		return nil, errors.New("user tidak ditemukan")
	}
	u.PasswordHash = ""
	return u, nil
}

type CreateUserInput struct {
	DepartmentID uint64 `json:"department_id" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	Role         string `json:"role" binding:"required,oneof=admin manager member viewer"`
	Position     string `json:"position"`
	IsActive     bool   `json:"is_active"`
}

func (s *UserService) Create(in *CreateUserInput) (*models.User, error) {
	u := &models.User{
		DepartmentID: in.DepartmentID, Name: in.Name, Email: in.Email,
		PasswordHash: utils.HashPassword(in.Password), Role: in.Role,
		Position: in.Position, IsActive: in.IsActive,
	}
	id, err := s.Repo.Create(u)
	if err != nil {
		return nil, err
	}
	return s.Get(id)
}

type UpdateUserInput struct {
	DepartmentID uint64 `json:"department_id" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password"`
	Role         string `json:"role" binding:"required,oneof=admin manager member viewer"`
	Position     string `json:"position"`
	IsActive     bool   `json:"is_active"`
}

func (s *UserService) Update(id uint64, in *UpdateUserInput) (*models.User, error) {
	u := &models.User{
		ID: id, DepartmentID: in.DepartmentID, Name: in.Name, Email: in.Email,
		Role: in.Role, Position: in.Position, IsActive: in.IsActive,
	}
	updatePassword := in.Password != ""
	if updatePassword {
		u.PasswordHash = utils.HashPassword(in.Password)
	}
	if err := s.Repo.Update(u, updatePassword); err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *UserService) Delete(id uint64) error {
	return s.Repo.Delete(id)
}
