package seeders

import "log"

func (s *Seeder) seedDepartments() error {
	departments := []struct {
		Name, Code, Desc string
	}{
		{"Information Technology", "IT", "Pengembangan software, infrastruktur, dan support teknis"},
		{"Accounting", "ACC", "Akuntansi, laporan keuangan, dan pembukuan"},
		{"Human Resources", "HR", "Rekrutmen, payroll, dan manajemen SDM"},
		{"Marketing", "MKT", "Pemasaran, branding, dan campaign digital"},
		{"Tax", "TAX", "Perpajakan, PPh, PPN, dan compliance pajak"},
		{"Claim", "CLM", "Klaim asuransi, reimbursement, dan verifikasi"},
		{"Finance", "FIN", "Keuangan, budgeting, dan treasury"},
	}

	q := `INSERT IGNORE INTO departments (name, code, description) VALUES (?, ?, ?)`
	for _, d := range departments {
		if _, err := s.DB.Exec(q, d.Name, d.Code, d.Desc); err != nil {
			return err
		}
	}
	log.Printf("   ✅ %d departments", len(departments))
	return nil
}
