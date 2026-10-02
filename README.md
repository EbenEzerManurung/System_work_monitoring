<div align="center">

<img src="docs/images/logo.png" alt="WorkMonitor Logo" width="160" />

# WorkMonitor Enterprise

**Task management for modern teams — plan, track, and deliver work at scale.**

A full-stack platform with Kanban boards, sprint planning, backlog management, analytics dashboards, audit trails, and role-based access control.

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=flat-square&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen?style=flat-square)

[Overview](#overview) · [Features](#features) · [Roles](#roles--permissions) · [Tech Stack](#tech-stack) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Screenshots](#screenshots) · [Roadmap](#roadmap)

</div>

---

## Overview

WorkMonitor Enterprise gives teams a single source of truth for every task, sprint, and team member. It covers the full delivery cycle — backlog grooming, sprint planning, Kanban execution, analytics, and auditing — in one cohesive platform.

The backend is written in **Go** and the frontend in **React 19 + Tailwind CSS 4**, following a clean layered architecture where every protected route passes through authentication and role guards before reaching the database.

| Capability | Description |
|---|---|
| **Kanban Board** | Drag & drop tasks across To Do, In Progress, Review, and Done |
| **Sprint Planning** | Create sprints, assign tasks, and track story points |
| **Backlog** | Capture, prioritize, and assign work in one place |
| **Analytics** | Progress per project, workload distribution, and top performers |
| **Calendar** | Sprint timelines and task due dates at a glance |
| **Access Control** | Admin, Manager, and Member permissions |
| **Notifications** | Alerts for assignments, due dates, and comments |
| **Audit Trail** | Complete history of every change in the system |
| **PWA** | Installable, offline-capable, and fast on repeat loads |

---

## Features

<details open>
<summary><b>Kanban Board</b></summary>

- Four-column workflow: **To Do → In Progress → Review → Done**
- Drag & drop with smooth animations
- Story Point (SP) totals per column
- Overdue indicators and due date tracking
- Filter by priority, assignee, or "My Tasks"

</details>

<details open>
<summary><b>Sprint Management</b></summary>

- Create sprints with start/end dates and goals
- Assign backlog tasks to sprints
- Track progress with burndown charts
- One-click **Start Sprint**, **Almost Done**, and **Complete Sprint**

</details>

<details open>
<summary><b>Backlog</b></summary>

- Central repository for all unscheduled tasks
- Rich task creation: title, description, type, priority, objective, assignee
- Automatic Story Point calculation based on Objective
- Bulk actions and filtering

</details>

<details open>
<summary><b>Dashboard & Analytics</b></summary>

- Key stats: total, To Do, In Progress, Done, and Overdue tasks
- Progress per project (bar chart) and status distribution (donut chart)
- Employee workload and top performers
- Sprint burndown chart and upcoming deadlines

</details>

<details>
<summary><b>Calendar</b></summary>

- Monthly view of sprint timelines and task due dates
- Color-coded by objective type
- Click any event for task or sprint details
- Role-based visibility: Admin sees all, Manager sees department, Member sees own

</details>

<details>
<summary><b>Notifications</b></summary>

- Bell icon with unread count
- Pending task reminders
- Assignment, comment, and due date alerts
- Mark all as read or clear all

</details>

<details>
<summary><b>Audit Trail</b></summary>

- Log of every create, update, and delete action
- Records user, action, entity, timestamp, and IP address
- Search and filter

</details>

<details>
<summary><b>Users & Roles</b></summary>

- JWT authentication with httpOnly cookies
- Three-tier RBAC: **Admin**, **Manager**, **Member**
- Full user CRUD with department assignment
- Pagination and search

</details>

<details>
<summary><b>Progressive Web App</b></summary>

- Installable on desktop, tablet, and mobile
- Service worker caching for offline use
- App-like experience with custom icons

</details>

---

## Roles & Permissions

| Role | Level | Dashboard | Users | Departments | Backlog | Kanban | Sprints | Calendar | Audit Trail | Reports |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | 3 | Full | CRUD | CRUD | Full | Full | Full | Full | View | ✅ |
| **Manager** | 2 | Department | — | — | Department | Department | Department | Department | — | ✅ |
| **Member** | 1 | Own only | — | — | Own | Own | Own | Own | — | — |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router v7 |
| **Styling** | Tailwind CSS 4 |
| **State & Data** | TanStack Query, Zustand, Context API |
| **UI Libraries** | Recharts, `@dnd-kit`, `react-big-calendar` |
| **PWA** | `vite-plugin-pwa` |
| **Backend** | Go 1.22 (Gin / Echo / Fiber) |
| **Database** | MySQL 8.4 via `database/sql` + `go-sql-driver/mysql` |
| **Auth** | JWT (`golang-jwt`) + bcrypt |
| **API** | RESTful JSON |
| **Export** | `exceljs` |

---

## Architecture

Requests flow through strictly separated layers:

```text
┌──────────────────────────────────────────┐
│          Client (Browser / PWA)          │
│         React 19 + Tailwind CSS 4        │
└────────────────────┬─────────────────────┘
                     │  REST API (JSON over HTTP)
┌────────────────────▼─────────────────────┐
│               Go Backend                 │
│                                          │
│   Middleware    JWT · CORS · Logger      │
│        ▼                                 │
│   Route Guards  RequireAuth · RequireRole│
│        ▼                                 │
│   Handlers      Validation · Responses   │
│        ▼                                 │
│   Services      Business logic · RBAC    │
│        ▼                                 │
│   Repositories  SQL queries · Transactions│
└────────────────────┬─────────────────────┘
                     │
┌────────────────────▼─────────────────────┐
│                MySQL 8.4                 │
│ Users · Tasks · Sprints · Projects ·     │
│ Departments · Audit Logs · Notifications │
└──────────────────────────────────────────┘
```

### Project Structure

```text
workmonitor/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── handlers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   └── utils/
│   ├── migrations/
│   ├── go.mod
│   └── go.sum
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/        # ui, layout, task, charts
│   │   ├── hooks/
│   │   ├── lib/               # api.js, utils.js, taskApi.js
│   │   ├── pages/             # Dashboard, Board, Backlog, Sprints,
│   │   │                      # Calendar, Audit, Users, Departments
│   │   ├── stores/            # authStore.js, notificationStore.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm 10+
- [Go](https://go.dev/dl/) 1.22+
- [MySQL](https://www.mysql.com/) 8.0+ (or XAMPP / Laragon)
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/workmonitor-enterprise.git
cd workmonitor-enterprise

# 2. Start the backend
cd backend
cp .env.example .env        # then edit with your database credentials
go mod download
go run cmd/server/main.go

# 3. Start the frontend (in a new terminal)
cd frontend
cp .env.example .env        # default API URL: http://localhost:8080/api/v1
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

### Demo Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `password123` | Admin |
| `manager` | `password123` | Manager |
| `member` | `password123` | Member |

> **Note:** Demo accounts are for local development only. Remove or change them before any deployment.

### Environment Variables

**Backend** (`backend/.env`)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=workmonitor
JWT_SECRET=your-secret-min-32-chars
JWT_EXPIRES_IN=8h
PORT=8080
```

**Frontend** (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8080/api/v1
```

### Commands

| Frontend | Description |
|---|---|
| `npm run dev` | Start the dev server (Vite HMR) |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

| Backend | Description |
|---|---|
| `go run cmd/server/main.go` | Start the server |
| `go build -o bin/server cmd/server/main.go` | Build a production binary |
| `go test ./...` | Run all tests |
| `go mod tidy` | Clean up dependencies |

---

## Design System

A calm teal palette, chosen to reduce eye strain and support focus during long working sessions.

| Token | Value | Purpose |
|---|---|---|
| Primary 700 | `#0F766E` | Buttons, active states |
| Primary 600 | `#0D9488` | Primary actions, accents |
| Primary 100 | `#CCFBF1` | Backgrounds, badges |
| Primary 50 | `#F0FDFA` | Page background |
| Success | `#10B981` | Done states, confirmations |
| Warning | `#F59E0B` | Alerts, pending states |
| Danger | `#EF4444` | Errors, overdue items |
| Text | `#1E293B` | Body text |

---

## Security

- **Sessions:** stateless JWT with 8-hour expiry, stored in httpOnly cookies
- **Passwords:** hashed with bcrypt (cost factor 12)
- **Authorization:** role guards on every protected route, evaluated before data loads
- **Database:** parameterized queries throughout
- **Validation:** server-side input validation on every action
- **Integrity:** unique constraints on username, email, and department code
- **Accountability:** every change logged with user, IP, and timestamp

---

## 📸 Screenshots

<table>
<tr>
<td width="50%">

**Login — Enterprise Theme**
<img width="1836" height="891" alt="image" src="https://github.com/user-attachments/assets/e21ba597-d3cc-4ca0-af0b-4020f0025aa2" />


<details>
<summary><b>🖥️ Local Run Program</b></summary>
<br>

**Local Run Program on Git**
<img width="1150" height="303" alt="image" src="https://github.com/user-attachments/assets/26b7c7b9-320c-43ab-a795-b2830417b8d3" />

</details>


---

## Roadmap

**Shipped**

- [x] Role-based access control (3 roles)
- [x] Kanban board with drag & drop
- [x] Sprint planning and backlog management
- [x] Dashboard analytics
- [x] Calendar view
- [x] Audit trail
- [x] Notifications with pending task reminders
- [x] Story Points & Objective scoring
- [x] Progressive Web App
- [x] JWT authentication
- [x] MySQL migrations
- [x] Excel export for reports

**Planned**

- [ ] Real-time collaboration (WebSocket)
- [ ] Email notifications on task assignment
- [ ] Per-project reporting and PDF export
- [ ] Docker Compose deployment
- [ ] Dark mode
- [ ] i18n (Bahasa Indonesia / English)
- [ ] Mobile app (React Native)
- [ ] AI-assisted task prioritization

---

## Design Decisions

**Why Go?** Its concurrency model, static typing, and fast compilation suit a REST API serving many concurrent users, background jobs, and database transactions with low overhead.

**Why React 19?** Improved actions and performance optimizations keep complex UI state — drag & drop, sprint timers, notifications — manageable without sacrificing developer experience.

**Why Story Points?** Points derived from Objective (Daily, Troubleshooting, Compliance, Improvement, New Project) give a consistent, objective way to measure effort and team performance.

---

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "Add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

## 👨‍💻 Author

**Eben Nezer Manurung**
Full Stack Developer • Backend Engineer

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/EbenEzerManurung)


If this project helped you, please consider giving it a ⭐

<sub>Built with React, Tailwind CSS, Go, and MySQL</sub>

</div>
