package models

import "time"

// ============================================================
// 1. DEPARTMENTS
// ============================================================
type Department struct {
	ID          uint64     `json:"id"`
	Name        string     `json:"name"`
	Code        string     `json:"code"`
	Description string     `json:"description"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

// ============================================================
// 2. USERS
// ============================================================
type User struct {
	ID           uint64     `json:"id"`
	DepartmentID uint64     `json:"department_id"`
	Name         string     `json:"name"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"` // JANGAN expose ke JSON
	Role         string     `json:"role"`
	AvatarURL    string     `json:"avatar_url"`
	Position     string     `json:"position"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

// ============================================================
// 3. PROJECTS
// ============================================================
type Project struct {
	ID           uint64     `json:"id"`
	DepartmentID uint64     `json:"department_id"`
	OwnerID      uint64     `json:"owner_id"`
	Name         string     `json:"name"`
	KeyPrefix    string     `json:"key_prefix"`
	Description  string     `json:"description"`
	Status       string     `json:"status"`
	Color        string     `json:"color"`
	StartDate    *string    `json:"start_date"`
	EndDate      *string    `json:"end_date"`
	Progress     float64    `json:"progress"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty"`
}

// ============================================================
// 4. PROJECT MEMBERS
// ============================================================
type ProjectMember struct {
	ID        uint64    `json:"id"`
	ProjectID uint64    `json:"project_id"`
	UserID    uint64    `json:"user_id"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
}

// ============================================================
// 5. SPRINTS
// ============================================================
type Sprint struct {
	ID              uint64     `json:"id"`
	ProjectID       uint64     `json:"project_id"`
	Name            string     `json:"name"`
	Goal            string     `json:"goal"`
	Status          string     `json:"status"`
	StartDate       *string    `json:"start_date"`
	EndDate         *string    `json:"end_date"`
	TotalPoints     int        `json:"total_points"`
	CompletedPoints int        `json:"completed_points"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
}

// ============================================================
// 6. TASKS
// ProgressLevel: not_started | in_progress | almost_done | done
// ============================================================
type Task struct {
	ID            uint64     `json:"id"`
	ProjectID     uint64     `json:"project_id"`
	SprintID      *uint64    `json:"sprint_id"`
	ParentTaskID  *uint64    `json:"parent_task_id"`
	ReporterID    uint64     `json:"reporter_id"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Status        string     `json:"status"`
	Priority      string     `json:"priority"`
	Type          string     `json:"type"`
	Objective     string     `json:"objective"`
	ProgressLevel string     `json:"progress_level"`
	StoryPoints   int        `json:"story_points"`
	Position      int        `json:"position"`
	DueDate       *string    `json:"due_date"`
	StartedAt     *time.Time `json:"started_at,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
}

// ============================================================
// 7. TASK ASSIGNEES (junction table)
// ============================================================
type TaskAssignee struct {
	ID         uint64    `json:"id"`
	TaskID     uint64    `json:"task_id"`
	UserID     uint64    `json:"user_id"`
	AssignedAt time.Time `json:"assigned_at"`
}

// ============================================================
// 8. COMMENTS
// ============================================================
type Comment struct {
	ID        uint64     `json:"id"`
	TaskID    uint64     `json:"task_id"`
	UserID    uint64     `json:"user_id"`
	ParentID  *uint64    `json:"parent_id"` // untuk nested reply
	Body      string     `json:"body"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

// ============================================================
// 9. ATTACHMENTS
// ============================================================
type Attachment struct {
	ID         uint64    `json:"id"`
	TaskID     uint64    `json:"task_id"`
	CommentID  *uint64   `json:"comment_id"` // nullable, attach ke comment
	UploadedBy uint64    `json:"uploaded_by"`
	FileName   string    `json:"file_name"`
	FilePath   string    `json:"file_path"`
	FileSize   int64     `json:"file_size"`
	MimeType   string    `json:"mime_type"`
	CreatedAt  time.Time `json:"created_at"`
}

// ============================================================
// 10. ACTIVITY LOGS
// ============================================================
type ActivityLog struct {
	ID          uint64    `json:"id"`
	UserID      uint64    `json:"user_id"`
	ProjectID   *uint64   `json:"project_id"`
	TaskID      *uint64   `json:"task_id"`
	Action      string    `json:"action"`
	EntityType  string    `json:"entity_type"`
	EntityID    uint64    `json:"entity_id"`
	OldValues   string    `json:"old_values"`   // ← BARU: JSON string
	NewValues   string    `json:"new_values"`   // ← BARU: JSON string
	Description string    `json:"description"`
	IPAddress   string    `json:"ip_address"`
	CreatedAt   time.Time `json:"created_at"`
}

// ============================================================
// 11. NOTIFICATIONS
// ============================================================
type Notification struct {
	ID         uint64     `json:"id"`
	UserID     uint64     `json:"user_id"`
	ActorID    *uint64    `json:"actor_id"` // siapa yang trigger
	Type       string     `json:"type"`
	Title      string     `json:"title"`
	Body       string     `json:"body"`
	EntityType string     `json:"entity_type"`
	EntityID   *uint64    `json:"entity_id"`
	Link       string     `json:"link"` // frontend route
	IsRead     bool       `json:"is_read"`
	ReadAt     *time.Time `json:"read_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ============================================================
// 12. AUDIT TRAILS
// ============================================================
type AuditTrail struct {
	ID            uint64    `json:"id"`
	UserID        uint64    `json:"user_id"`
	Action        string    `json:"action"`
	TableName     string    `json:"table_name"`
	RecordID      uint64    `json:"record_id"`
	OldData       string    `json:"old_data"`       // ← BARU: JSON string
	NewData       string    `json:"new_data"`       // ← BARU: JSON string
	ChangedFields string    `json:"changed_fields"` // comma-separated
	IPAddress     string    `json:"ip_address"`
	UserAgent     string    `json:"user_agent"`
	CreatedAt     time.Time `json:"created_at"`
}