package seeders

import (
	"fmt"
	"log"

	"backend/utils"
)

func (s *Seeder) seedUsers() error {
	type u struct {
		DeptCode, Name, Email, Role, Position string
	}

	users := []u{
		{"IT", "Budi Santoso", "budi.santoso@company.co.id", "admin", "CTO"},
		{"IT", "Rina Wijaya", "rina.wijaya@company.co.id", "manager", "Engineering Manager"},
		{"IT", "Andi Pratama", "andi.pratama@company.co.id", "member", "Backend Developer"},
		{"IT", "Siti Nurhaliza", "siti.nurhaliza@company.co.id", "member", "Frontend Developer"},
		{"IT", "Dian Kusuma", "dian.kusuma@company.co.id", "member", "DevOps Engineer"},
		{"ACC", "Dewi Lestari", "dewi.lestari@company.co.id", "manager", "Accounting Manager"},
		{"ACC", "Agus Setiawan", "agus.setiawan@company.co.id", "member", "Staff Accounting"},
		{"ACC", "Fitri Handayani", "fitri.handayani@company.co.id", "member", "Staff Accounting"},
		{"HR", "Maya Anggraini", "maya.anggraini@company.co.id", "manager", "HR Manager"},
		{"HR", "Fajar Nugroho", "fajar.nugroho@company.co.id", "member", "HR Officer"},
		{"MKT", "Putri Handayani", "putri.handayani@company.co.id", "manager", "Marketing Manager"},
		{"MKT", "Rizky Ramadhan", "rizky.ramadhan@company.co.id", "member", "Digital Marketing"},
		{"MKT", "Nadia Safira", "nadia.safira@company.co.id", "member", "Content Creator"},
		{"TAX", "Hendra Kusuma", "hendra.kusuma@company.co.id", "manager", "Tax Manager"},
		{"TAX", "Yusuf Maulana", "yusuf.maulana@company.co.id", "member", "Tax Accountant"},
		{"CLM", "Lina Marlina", "lina.marlina@company.co.id", "manager", "Claim Manager"},
		{"CLM", "Bayu Purnomo", "bayu.purnomo@company.co.id", "member", "Claim Officer"},
		{"FIN", "Bambang Susilo", "bambang.susilo@company.co.id", "manager", "Finance Manager"},
		{"FIN", "Indah Permatasari", "indah.permatasari@company.co.id", "member", "Financial Analyst"},
	}

	pw := utils.HashPassword("password123")

	q := `
		INSERT IGNORE INTO users
			(department_id, name, email, password_hash, role, position, is_active)
		VALUES (
			(SELECT id FROM departments WHERE code = ?),
			?, ?, ?, ?, ?, 1
		)`

	for _, x := range users {
		if _, err := s.DB.Exec(q, x.DeptCode, x.Name, x.Email, pw, x.Role, x.Position); err != nil {
			return fmt.Errorf("insert user %s: %w", x.Email, err)
		}
	}
	log.Printf("   ✅ %d users (default password: password123)", len(users))
	return nil
}
