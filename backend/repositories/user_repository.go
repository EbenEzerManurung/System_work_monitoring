package repositories

import (
	"database/sql"

	"backend/models"
)

type UserRepository struct {
	DB *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	row := r.DB.QueryRow(`
		SELECT id, department_id, name, email, password_hash, role,
		       COALESCE(position, ''), COALESCE(avatar_url, ''), is_active
		FROM users WHERE email = ? AND deleted_at IS NULL
	`, email)
	var u models.User
	if err := row.Scan(&u.ID, &u.DepartmentID, &u.Name, &u.Email, &u.PasswordHash,
		&u.Role, &u.Position, &u.AvatarURL, &u.IsActive); err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) FindByID(id uint64) (*models.User, error) {
	row := r.DB.QueryRow(`
		SELECT id, department_id, name, email, password_hash, role,
		       COALESCE(position, ''), COALESCE(avatar_url, ''), is_active
		FROM users WHERE id = ? AND deleted_at IS NULL
	`, id)
	var u models.User
	if err := row.Scan(&u.ID, &u.DepartmentID, &u.Name, &u.Email, &u.PasswordHash,
		&u.Role, &u.Position, &u.AvatarURL, &u.IsActive); err != nil {
		return nil, err
	}
	return &u, nil
}

type UserWithDept struct {
	models.User
	DepartmentName string `json:"department_name"`
	DepartmentCode string `json:"department_code"`
}

// List — kalau deptID > 0 & !isSuperadmin, filter by dept
func (r *UserRepository) List(deptID uint64, isSuperadmin bool) ([]UserWithDept, error) {
	q := `
		SELECT u.id, u.department_id, u.name, u.email, u.role,
		       COALESCE(u.position,''), COALESCE(u.avatar_url,''), u.is_active,
		       COALESCE(d.name,''), COALESCE(d.code,'')
		FROM users u
		LEFT JOIN departments d ON d.id = u.department_id
		WHERE u.deleted_at IS NULL`
	args := []interface{}{}
	if !isSuperadmin && deptID > 0 {
		q += " AND u.department_id = ?"
		args = append(args, deptID)
	}
	q += " ORDER BY u.id ASC"

	rows, err := r.DB.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []UserWithDept
	for rows.Next() {
		var u UserWithDept
		if err := rows.Scan(&u.ID, &u.DepartmentID, &u.Name, &u.Email, &u.Role,
			&u.Position, &u.AvatarURL, &u.IsActive, &u.DepartmentName, &u.DepartmentCode); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

func (r *UserRepository) Create(u *models.User) (uint64, error) {
	res, err := r.DB.Exec(`
		INSERT INTO users (department_id, name, email, password_hash, role, position, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, u.DepartmentID, u.Name, u.Email, u.PasswordHash, u.Role, u.Position, u.IsActive)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	return uint64(id), nil
}

func (r *UserRepository) Update(u *models.User, updatePassword bool) error {
	if updatePassword {
		_, err := r.DB.Exec(`
			UPDATE users SET department_id=?, name=?, email=?, password_hash=?, role=?, position=?, is_active=?
			WHERE id=?
		`, u.DepartmentID, u.Name, u.Email, u.PasswordHash, u.Role, u.Position, u.IsActive, u.ID)
		return err
	}
	_, err := r.DB.Exec(`
		UPDATE users SET department_id=?, name=?, email=?, role=?, position=?, is_active=?
		WHERE id=?
	`, u.DepartmentID, u.Name, u.Email, u.Role, u.Position, u.IsActive, u.ID)
	return err
}

func (r *UserRepository) UpdatePassword(id uint64, hash string) error {
	_, err := r.DB.Exec(`UPDATE users SET password_hash=? WHERE id=?`, hash, id)
	return err
}

func (r *UserRepository) Delete(id uint64) error {
	_, err := r.DB.Exec(`UPDATE users SET deleted_at=NOW() WHERE id=?`, id)
	return err
}
