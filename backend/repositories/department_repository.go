package repositories

import (
	"database/sql"

	"backend/models"
)

type DepartmentRepository struct {
	DB *sql.DB
}

func NewDepartmentRepository(db *sql.DB) *DepartmentRepository {
	return &DepartmentRepository{DB: db}
}

func (r *DepartmentRepository) List() ([]models.Department, error) {
	rows, err := r.DB.Query(`
		SELECT id, name, code, COALESCE(description,''), created_at, updated_at
		FROM departments
		WHERE deleted_at IS NULL
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Department
	for rows.Next() {
		var d models.Department
		if err := rows.Scan(&d.ID, &d.Name, &d.Code, &d.Description, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, nil
}

func (r *DepartmentRepository) FindByID(id uint64) (*models.Department, error) {
	var d models.Department
	err := r.DB.QueryRow(`
		SELECT id, name, code, COALESCE(description,''), created_at, updated_at
		FROM departments WHERE id = ? AND deleted_at IS NULL
	`, id).Scan(&d.ID, &d.Name, &d.Code, &d.Description, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DepartmentRepository) Create(d *models.Department) (uint64, error) {
	res, err := r.DB.Exec(`
		INSERT INTO departments (name, code, description) VALUES (?, ?, ?)
	`, d.Name, d.Code, d.Description)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return uint64(id), nil
}

func (r *DepartmentRepository) Update(d *models.Department) error {
	_, err := r.DB.Exec(`
		UPDATE departments SET name=?, code=?, description=? WHERE id=?
	`, d.Name, d.Code, d.Description, d.ID)
	return err
}

func (r *DepartmentRepository) Delete(id uint64) error {
	_, err := r.DB.Exec(`UPDATE departments SET deleted_at=NOW() WHERE id=?`, id)
	return err
}

