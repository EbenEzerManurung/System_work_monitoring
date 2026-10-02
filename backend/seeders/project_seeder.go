package seeders

import (
	"fmt"
	"log"
)

func (s *Seeder) seedProjects() error {
	type p struct {
		DeptCode, Name, Key, Desc, Status, OwnerEmail string
		StartOffset, Duration                         int
	}

	projects := []p{
		// ============ IT ============
		{"IT", "Platform Monitoring Karyawan", "MON", "Aplikasi monitoring pekerjaan berbasis PWA", "active", "budi.santoso@company.co.id", -30, 90},
		{"IT", "Migrasi ERP ke Cloud", "ERP", "Migrasi sistem ERP on-premise ke cloud", "planning", "rina.wijaya@company.co.id", 10, 120},

		// ============ ACCOUNTING ============
		{"ACC", "Otomasi Laporan Keuangan", "FIN", "Otomasi laporan bulanan dan tahunan", "active", "dewi.lestari@company.co.id", -15, 60},

		// ============ HR ============
		{"HR", "Sistem Rekrutmen Online", "REC", "Portal rekrutmen dan tracking kandidat", "active", "maya.anggraini@company.co.id", -20, 75},

		// ============ MARKETING ============
		{"MKT", "Campaign Digital Q3", "MKT", "Kampanye digital multi-channel Q3", "planning", "putri.handayani@company.co.id", 5, 45},

		// ============ TAX ============
		{"TAX", "Compliance Pajak 2026", "TAX", "Persiapan dan pelaporan pajak tahunan", "active", "hendra.kusuma@company.co.id", -10, 90},

		// ============ CLAIM ============
		{"CLM", "Digitalisasi Klaim", "CLM", "Sistem klaim digital end-to-end", "active", "lina.marlina@company.co.id", -25, 100},

		// ============ FINANCE ============
		{"FIN", "Dashboard Budgeting", "BGT", "Dashboard real-time budgeting", "planning", "bambang.susilo@company.co.id", 0, 60},
	}

	// Warna tosca palette, konsisten per project (bukan random)
	colorByDept := map[string]string{
		"IT":  "#0D9488", // tosca primary
		"ACC": "#0891B2", // cyan
		"HR":  "#14B8A6", // tosca light
		"MKT": "#06B6D4", // cyan light
		"TAX": "#0EA5E9", // sky
		"CLM": "#0F766E", // tosca dark
		"FIN": "#155E75", // dark cyan
	}

	q := `
		INSERT IGNORE INTO projects
			(department_id, owner_id, name, key_prefix, description, status, color, start_date, end_date, progress)
		VALUES (
			(SELECT id FROM departments WHERE code = ?),
			(SELECT id FROM users WHERE email = ?),
			?, ?, ?, ?, ?,
			DATE_ADD(CURDATE(), INTERVAL ? DAY),
			DATE_ADD(CURDATE(), INTERVAL ? DAY),
			?
		)`

	for _, x := range projects {
		// Progress awal default 0 — akan dihitung dari task real
		// (untuk sekarang cukup 0, nanti bisa tambah endpoint sync project progress)
		progress := 0.0

		color := colorByDept[x.DeptCode]
		if color == "" {
			color = "#0D9488" // fallback tosca
		}

		if _, err := s.DB.Exec(q,
			x.DeptCode,
			x.OwnerEmail,
			x.Name,
			x.Key,
			x.Desc,
			x.Status,
			color,
			x.StartOffset,
			x.StartOffset+x.Duration,
			progress,
		); err != nil {
			return fmt.Errorf("insert project %s: %w", x.Key, err)
		}
	}

	log.Printf("   ✅ %d projects", len(projects))
	return nil
}