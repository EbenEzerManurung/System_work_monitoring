package routes

import (
	"github.com/gin-gonic/gin"

	"backend/config"
	"backend/controllers"
	"backend/middleware"
)

func SetupRouter(
	cfg *config.Config,
	authCtrl *controllers.AuthController,
	deptCtrl *controllers.DepartmentController,
	userCtrl *controllers.UserController,
	taskCtrl *controllers.TaskController,
	sprintCtrl *controllers.SprintController,
) *gin.Engine {
	r := gin.Default()
	r.Use(middleware.CORS())

	// ============================================================
	// HEALTH CHECK
	// ============================================================
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"success": true,
			"message": "WorkMonitor API is running",
		})
	})

	// ============================================================
	// ⭐ ROLE HELPERS
	//
	// Satu tempat untuk definisi role. Kalau nanti role di DB
	// berubah (mis. dari "admin" → "superadmin"), cukup ubah
	// di sini.
	// ============================================================
	adminRoles := []string{"admin", "superadmin"} // role level admin
	managerRoles := append(adminRoles, "manager") // admin + manager

	// ⭐ PERUBAHAN — role yang boleh jalankan workflow sprint
	// (start / complete / assign / remove task).
	// Tambah "member" supaya member juga bisa klik tombol
	// Mulai / Almost Done / Selesaikan di halaman Sprints.
	sprintOperatorRoles := append([]string{}, managerRoles...)
	sprintOperatorRoles = append(sprintOperatorRoles, "member")

	// ============================================================
	// API v1
	// ============================================================
	api := r.Group("/api/v1")
	{
		// ---------- PUBLIC ----------
		api.POST("/login", authCtrl.Login)

		// ---------- PROTECTED ----------
		protected := api.Group("")
		protected.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			// ============ AUTH ============
			protected.GET("/me", authCtrl.Me)
			protected.POST("/logout", authCtrl.Logout)

			// ============ DEPARTMENTS ============
			depts := protected.Group("/departments")
			{
				depts.GET("", deptCtrl.List)
				depts.GET("/:id", deptCtrl.Get)

				depts.POST("", middleware.RequireRole(adminRoles...), deptCtrl.Create)
				depts.PUT("/:id", middleware.RequireRole(adminRoles...), deptCtrl.Update)
				depts.DELETE("/:id", middleware.RequireRole(adminRoles...), deptCtrl.Delete)
			}

			// ============ USERS ============
			users := protected.Group("/users")
			{
				users.GET("", userCtrl.List)
				users.GET("/:id", userCtrl.Get)

				users.POST("", middleware.RequireRole(adminRoles...), userCtrl.Create)
				users.PUT("/:id", middleware.RequireRole(adminRoles...), userCtrl.Update)
				users.DELETE("/:id", middleware.RequireRole(adminRoles...), userCtrl.Delete)
			}

			// ============ TASKS ============
			tasks := protected.Group("/tasks")
			{
				// ⚠️ Route statis HARUS sebelum /:id
				tasks.GET("", taskCtrl.List)
				tasks.GET("/backlog", taskCtrl.Backlog)
				tasks.GET("/assigned", taskCtrl.ListAssigned)
				tasks.GET("/sprint/:id", taskCtrl.ListBySprint)

				tasks.GET("/:id", taskCtrl.Get)
				tasks.POST("", taskCtrl.Create)
				tasks.PUT("/:id", taskCtrl.Update)
				tasks.PATCH("/:id/status", taskCtrl.UpdateStatus)
				tasks.PATCH("/:id/progress", taskCtrl.UpdateProgress)
				tasks.DELETE("/:id", taskCtrl.Delete)
			}

			// ============ SPRINTS ============
			sprints := protected.Group("/sprints")
			{
				// ---------- READ (semua role) ----------
				sprints.GET("", sprintCtrl.List)
				sprints.GET("/:id", sprintCtrl.Get)

				// ---------- SYNC (admin only) ----------
				sprints.POST("/sync",
					middleware.RequireRole(adminRoles...),
					sprintCtrl.Sync,
				)

				// ---------- CRUD (admin + manager) ----------
				// ⚠️ Member TIDAK boleh create / update / delete sprint
				sprints.POST("",
					middleware.RequireRole(managerRoles...),
					sprintCtrl.Create,
				)
				sprints.PUT("/:id",
					middleware.RequireRole(managerRoles...),
					sprintCtrl.Update,
				)
				sprints.DELETE("/:id",
					middleware.RequireRole(managerRoles...),
					sprintCtrl.Delete,
				)

				// ---------- WORKFLOW (admin + superadmin + manager + MEMBER) ----------
				// ⭐ FIX 403 — sekarang member juga boleh klik
				//    Mulai / Almost Done / Selesaikan Sprint.
				sprints.POST("/:id/start",
					middleware.RequireRole(sprintOperatorRoles...),
					sprintCtrl.Start,
				)
				sprints.POST("/:id/complete",
					middleware.RequireRole(sprintOperatorRoles...),
					sprintCtrl.Complete,
				)
				sprints.POST("/:id/assign",
					middleware.RequireRole(sprintOperatorRoles...),
					sprintCtrl.AssignTasks,
				)

				// ---------- REMOVE TASK dari sprint ----------
				sprints.DELETE("/tasks/:task_id",
					middleware.RequireRole(sprintOperatorRoles...),
					sprintCtrl.RemoveTask,
				)
			}
		}
	}

	return r
}