package services

import (
	"errors"

	"backend/models"
	"backend/repositories"
)

type DepartmentService struct {
	Repo *repositories.DepartmentRepository
}

func NewDepartmentService(repo *repositories.DepartmentRepository) *DepartmentService {
	return &DepartmentService{Repo: repo}
}

func (s *DepartmentService) List() ([]models.Department, error) {
	return s.Repo.List()
}

func (s *DepartmentService) Get(id uint64) (*models.Department, error) {
	return s.Repo.FindByID(id)
}

func (s *DepartmentService) Create(d *models.Department) (*models.Department, error) {
	if d.Name == "" || d.Code == "" {
		return nil, errors.New("nama dan kode departemen wajib diisi")
	}
	id, err := s.Repo.Create(d)
	if err != nil {
		return nil, err
	}
	return s.Repo.FindByID(id)
}

func (s *DepartmentService) Update(d *models.Department) (*models.Department, error) {
	if d.ID == 0 {
		return nil, errors.New("id tidak valid")
	}
	if err := s.Repo.Update(d); err != nil {
		return nil, err
	}
	return s.Repo.FindByID(d.ID)
}

func (s *DepartmentService) Delete(id uint64) error {
	return s.Repo.Delete(id)
}