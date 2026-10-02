package main

import (
	"database/sql"
	"log"
	"os"
	"strings"

	"backend/config"
	"backend/controllers"
	"backend/database"
	"backend/migration"
	"backend/repositories"
	"backend/routes"
	"backend/seeders"
	"backend/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env (best effort)
	_ = godotenv.Load()

	cfg := config.Load()

	// Default mode: kalau tidak ada argumen → jalankan server
	command := "server"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	// Flag --seeder (bisa dipakai bareng migration commands)
	hasSeeder := false
	for _, f := range os.Args[1:] {
		if strings.Contains(f, "seeder") {
			hasSeeder = true
		}
	}

	// ---- Perintah yang butuh koneksi DB ----
	switch command {
	case "migration:fresh", "migration:up", "migration:down", "db:seed":
		db, err := database.Connect(cfg)
		if err != nil {
			log.Fatalf("❌ Gagal koneksi database: %v", err)
		}
		defer db.Close()

		migrator := migration.NewMigrator(db)

		switch command {
		case "migration:fresh":
			log.Println("🚀 Menjalankan `migration:fresh`")
			if err := migrator.Fresh(); err != nil {
				log.Fatalf("❌ Migration gagal: %v", err)
			}
			if hasSeeder {
				log.Println("🌱 Menjalankan seeder...")
				if err := seeders.NewSeeder(db).Run(); err != nil {
					log.Fatalf("❌ Seeder gagal: %v", err)
				}
			}
			log.Println("✅ Selesai!")

		case "migration:up":
			log.Println("🚀 Menjalankan `migration:up`")
			if err := migrator.Up(); err != nil {
				log.Fatalf("❌ Migration gagal: %v", err)
			}
			if hasSeeder {
				log.Println("🌱 Menjalankan seeder...")
				if err := seeders.NewSeeder(db).Run(); err != nil {
					log.Fatalf("❌ Seeder gagal: %v", err)
				}
			}
			log.Println("✅ Selesai!")

		case "migration:down":
			log.Println("🚀 Menjalankan `migration:down`")
			if err := migrator.Down(); err != nil {
				log.Fatalf("❌ Rollback gagal: %v", err)
			}
			log.Println("✅ Selesai!")

		case "db:seed":
			log.Println("🌱 Menjalankan `db:seed`")
			if err := seeders.NewSeeder(db).Run(); err != nil {
				log.Fatalf("❌ Seeder gagal: %v", err)
			}
			log.Println("✅ Selesai!")
		}

	case "server":
		// ---- Jalankan HTTP server ----
		db, err := database.Connect(cfg)
		if err != nil {
			log.Fatalf("❌ Gagal koneksi database: %v", err)
		}
		defer db.Close()

		runServer(cfg, db)

	case "help", "-h", "--help":
		printUsage()

	default:
		log.Printf("❌ Command tidak dikenal: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func runServer(cfg *config.Config, db *sql.DB) {
	// ---------- Repositories ----------
	userRepo := repositories.NewUserRepository(db)
	deptRepo := repositories.NewDepartmentRepository(db)
	taskRepo := repositories.NewTaskRepository(db)
	sprintRepo := repositories.NewSprintRepository(db)

	// ---------- Services ----------
	authSvc := services.NewAuthService(userRepo, cfg.JWTSecret)
	deptSvc := services.NewDepartmentService(deptRepo)
	userSvc := services.NewUserService(userRepo)
	taskSvc := services.NewTaskService(taskRepo, userRepo)
	sprintSvc := services.NewSprintService(sprintRepo, db) // ← tambah db

	// ---------- Controllers ----------
	authCtrl := controllers.NewAuthController(authSvc)
	deptCtrl := controllers.NewDepartmentController(deptSvc)
	userCtrl := controllers.NewUserController(userSvc)
	taskCtrl := controllers.NewTaskController(taskSvc)
	sprintCtrl := controllers.NewSprintController(sprintSvc)

	// ---------- Routes ----------
	r := routes.SetupRouter(cfg, authCtrl, deptCtrl, userCtrl, taskCtrl, sprintCtrl)

	// ---------- Mode ----------
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	log.Printf("🚀 Server berjalan di http://localhost:%s", cfg.AppPort)
	log.Printf("   Health check : http://localhost:%s/health", cfg.AppPort)
	log.Printf("   Login        : POST http://localhost:%s/api/v1/login", cfg.AppPort)
	log.Printf("   Me           : GET  http://localhost:%s/api/v1/me", cfg.AppPort)
	log.Printf("   Departments  : GET  http://localhost:%s/api/v1/departments", cfg.AppPort)
	log.Printf("   Users        : GET  http://localhost:%s/api/v1/users", cfg.AppPort)
	log.Printf("   Tasks        : GET  http://localhost:%s/api/v1/tasks", cfg.AppPort)
	log.Printf("   Backlog      : GET  http://localhost:%s/api/v1/tasks/backlog", cfg.AppPort)
	log.Printf("   Sprints      : GET  http://localhost:%s/api/v1/sprints", cfg.AppPort)

	if err := r.Run(":" + cfg.AppPort); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}

func printUsage() {
	log.Println(`
📘 WorkMonitor CLI

Default (tanpa argumen):
  go run main.go                          # Jalankan HTTP server

Perintah migration & seeder:
  go run main.go migration:fresh          # Drop semua tabel + migrate ulang
  go run main.go migration:fresh --seeder # Drop, migrate, seed
  go run main.go migration:up             # Migrate yang belum jalan
  go run main.go migration:up --seeder    # Migrate + seed
  go run main.go migration:down           # Rollback batch terakhir
  go run main.go db:seed                  # Hanya seed data
  go run main.go help                     # Tampilkan bantuan ini
`)
}