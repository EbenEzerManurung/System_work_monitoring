<div align="center">

<img src="docs/images/banner.svg" alt="WorkMonitor Enterprise — Task management for modern teams" width="100%" />

<br/>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

![JWT](https://img.shields.io/badge/Auth-JWT-0F766E?style=flat-square&logo=jsonwebtokens&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active_Development-10B981?style=flat-square)

<br/>

**[Overview](#overview)** &nbsp;•&nbsp; **[Features](#features)** &nbsp;•&nbsp; **[Roles](#roles--permissions)** &nbsp;•&nbsp; **[Tech Stack](#tech-stack)** &nbsp;•&nbsp; **[Architecture](#architecture)** &nbsp;•&nbsp; **[Getting Started](#getting-started)** &nbsp;•&nbsp; **[Screenshots](#screenshots)** &nbsp;•&nbsp; **[Roadmap](#roadmap)**

</div>

<br/>

## Overview

**WorkMonitor Enterprise** is a full-stack task management platform that gives teams a single source of truth for every task, sprint, and team member. It covers the entire delivery cycle — backlog grooming, sprint planning, Kanban execution, analytics, and auditing — in one cohesive product.

The backend is written in **Go** and the frontend in **React 19 + Tailwind CSS 4**. A clean layered architecture ensures every protected route passes through authentication and role guards before it ever reaches the database.

<br/>

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>📋 Kanban Board</h4>
      Drag &amp; drop tasks across To Do, In Progress, Review, and Done with live story point totals.
    </td>
    <td width="33%" valign="top">
      <h4>🚀 Sprint Planning</h4>
      Create sprints, assign backlog items, and follow progress with burndown charts.
    </td>
    <td width="33%" valign="top">
      <h4>📊 Analytics</h4>
      Progress per project, workload distribution, and top performers at a glance.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <h4>🔐 Access Control</h4>
      Admin, Manager, and Member roles enforced on every route before data loads.
    </td>
    <td width="33%" valign="top">
      <h4>📜 Audit Trail</h4>
      A complete, searchable history of every change, with user, IP, and timestamp.
    </td>
    <td width="33%" valign="top">
      <h4>📱 Installable PWA</h4>
      Works on desktop, tablet, and mobile, with offline caching and fast repeat loads.
    </td>
  </tr>
</table>

<br/>

## Features

<details open>
<summary><b>Kanban Board</b></summary>
<br/>

- Four-column workflow: **To Do → In Progress → Review → Done**
- Drag & drop with smooth animations
- Story Point (SP) totals per column
- Overdue indicators and due date tracking
- Filter by priority, assignee, or "My Tasks"

</details>

<details open>
<summary><b>Sprint Management</b></summary>
<br/>

- Create sprints with start/end dates and goals
- Assign backlog tasks to sprints
- Track progress with burndown charts
- One-click **Start Sprint**, **Almost Done**, and **Complete Sprint**

</details>

<details open>
<summary><b>Backlog</b></summary>
<br/>

- Central repository for all unscheduled tasks
- Rich task creation: title, description, type, priority, objective, assignee
- Automatic Story Point calculation based on Objective
- Bulk actions and filtering

</details>

<details open>
<summary><b>Dashboard & Analytics</b></summary>
<br/>

- Key stats: total, To Do, In Progress, Done, and Overdue tasks
- Progress per project (bar chart) and status distribution (donut chart)
- Employee workload and top performers
- Sprint burndown chart and upcoming deadlines

</details>

<details>
<summary><b>Calendar</b></summary>
<br/>

- Monthly view of sprint timelines and task due dates
- Color-coded by objective type
- Click any event for task or sprint details
- Role-based visibility: Admin sees all, Manager sees department, Member sees own

</details>

<details>
<summary><b>Notifications</b></summary>
<br/>

- Bell icon with unread count
- Pending task reminders
- Assignment, comment, and due date alerts
- Mark all as read or clear all

</details>

<details>
<summary><b>Audit Trail</b></summary>
<br/>

- Log of every create, update, and delete action
- Records user, action, entity, timestamp, and IP address
- Search and filter

</details>

<details>
<summary><b>Users & Roles</b></summary>
<br/>

- JWT authentication with httpOnly cookies
- Three-tier RBAC: **Admin**, **Manager**, **Member**
- Full user CRUD with department assignment
- Pagination and search

</details>

<details>
<summary><b>Progressive Web App</b></summary>
<br/>

- Installable on desktop, tablet, and mobile
- Service worker caching for offline use
- App-like experience with custom icons

</details>

<br/>

## Roles & Permissions

| Role | Level | Dashboard | Users | Departments | Backlog | Kanban | Sprints | Calendar | Audit Trail | Reports |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | 3 | Full | CRUD | CRUD | Full | Full | Full | Full | View | ✅ |
| **Manager** | 2 | Department | — | — | Department | Department | Department | Department | — | ✅ |
| **Member** | 1 | Own only | — | — | Own | Own | Own | Own | — | — |

<br/>

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · Vite · React Router v7 |
| **Styling** | Tailwind CSS 4 |
| **State & Data** | TanStack Query · Zustand · Context API |
| **UI Libraries** | Recharts · `@dnd-kit` · `react-big-calendar` |
| **PWA** | `vite-plugin-pwa` |
| **Backend** | Go 1.22 (Gin / Echo / Fiber) |
| **Database** | MySQL 8.4 via `database/sql` + `go-sql-driver/mysql` |
| **Auth** | JWT (`golang-jwt`) + bcrypt |
| **API** | RESTful JSON |
| **Export** | `exceljs` |

<br/>

## Architecture

Requests flow through strictly separated layers:

```text
┌──────────────────────────────────────────┐
│          Client (Browser / PWA)          │
│        React 19 + Tailwind CSS 4         │
└──────────────────────────────────────────┘
                     │  REST API (JSON over HTTP)
                     ▼
┌──────────────────────────────────────────┐
│                Go Backend                │
│                                          │
│  Middleware     JWT · CORS · Logger      │
│                    ▼                     │
│  Route Guards   RequireAuth · RequireRole│
│                    ▼                     │
│  Handlers       Validation · Responses   │
│                    ▼                     │
│  Services       Business logic · RBAC    │
│                    ▼                     │
│  Repositories   SQL · Transactions       │
└──────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│                MySQL 8.4                 │
│    Users · Tasks · Sprints · Projects    │
│ Departments · Audit Logs · Notifications │
└──────────────────────────────────────────┘
```

<details>
<summary><b>Project structure</b></summary>
<br/>

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
├── docs/images/               # logo, banner, screenshots
├── .env.example
├── docker-compose.yml
└── README.md
```

</details>

<br/>

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm 10+
- [Go](https://go.dev/dl/) 1.22+
- [MySQL](https://www.mysql.com/) 8.0+ (or XAMPP / Laragon)
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/EbenEzerManurung/workmonitor-enterprise.git
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

> [!WARNING]
> Demo accounts are for local development only. Remove or change them before any deployment.

### Environment Variables

<table>
<tr>
<td width="50%" valign="top">

**Backend** — `backend/.env`

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

</td>
<td width="50%" valign="top">

**Frontend** — `frontend/.env`

```env
VITE_API_URL=http://localhost:8080/api/v1
```

</td>
</tr>
</table>

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

<br/>

## Design System

A calm teal palette, chosen to reduce eye strain and support focus during long working sessions.

| Token | Value | Purpose |
|---|---|---|
| ![](https://img.shields.io/badge/-%20%20%20%20-0F766E?style=flat-square) Primary 700 | `#0F766E` | Buttons, active states |
| ![](https://img.shields.io/badge/-%20%20%20%20-0D9488?style=flat-square) Primary 600 | `#0D9488` | Primary actions, accents |
| ![](https://img.shields.io/badge/-%20%20%20%20-CCFBF1?style=flat-square) Primary 100 | `#CCFBF1` | Backgrounds, badges |
| ![](https://img.shields.io/badge/-%20%20%20%20-F0FDFA?style=flat-square) Primary 50 | `#F0FDFA` | Page background |
| ![](https://img.shields.io/badge/-%20%20%20%20-10B981?style=flat-square) Success | `#10B981` | Done states, confirmations |
| ![](https://img.shields.io/badge/-%20%20%20%20-F59E0B?style=flat-square) Warning | `#F59E0B` | Alerts, pending states |
| ![](https://img.shields.io/badge/-%20%20%20%20-EF4444?style=flat-square) Danger | `#EF4444` | Errors, overdue items |
| ![](https://img.shields.io/badge/-%20%20%20%20-1E293B?style=flat-square) Text | `#1E293B` | Body text |

<br/>

## Security

- **Sessions** — stateless JWT with 8-hour expiry, stored in httpOnly cookies
- **Passwords** — hashed with bcrypt (cost factor 12)
- **Authorization** — role guards on every protected route, evaluated before data loads
- **Database** — parameterized queries throughout
- **Validation** — server-side input validation on every action
- **Integrity** — unique constraints on username, email, and department code
- **Accountability** — every change logged with user, IP, and timestamp

<br/>
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

| Shipped | Planned |
|---|---|
| ✅ Role-based access control (3 roles) | ⬜ Real-time collaboration (WebSocket) |
| ✅ Kanban board with drag & drop | ⬜ Email notifications on task assignment |
| ✅ Sprint planning & backlog management | ⬜ Per-project reporting and PDF export |
| ✅ Dashboard analytics | ⬜ Docker Compose deployment |
| ✅ Calendar view | ⬜ Dark mode |
| ✅ Audit trail | ⬜ i18n (Bahasa Indonesia / English) |
| ✅ Notifications & pending task reminders | ⬜ Mobile app (React Native) |
| ✅ Story Points & Objective scoring | ⬜ AI-assisted task prioritization |
| ✅ Progressive Web App | |
| ✅ JWT authentication | |
| ✅ MySQL migrations | |
| ✅ Excel export for reports | |

<br/>

## Design Decisions

**Why Go?** Its concurrency model, static typing, and fast compilation suit a REST API serving many concurrent users, background jobs, and database transactions with low overhead.

**Why React 19?** Improved actions and performance optimizations keep complex UI state — drag & drop, sprint timers, notifications — manageable without sacrificing developer experience.

**Why Story Points?** Points derived from Objective (Daily, Troubleshooting, Compliance, Improvement, New Project) give a consistent, objective way to measure effort and team performance.

<br/>

## Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m "Add amazing feature"`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

<br/>

---

<div align="center">

<img src="docs/images/logo.svg" alt="WorkMonitor" width="56" />

### Eben Nezer Manurung

Full Stack Developer • Backend Engineer

[![GitHub](https://img.shields.io/badge/GitHub-EbenEzerManurung-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/EbenEzerManurung)

<br/>

If this project helped you, please consider giving it a ⭐

<sub>Built with React, Tailwind CSS, Go, and MySQL</sub>

</div>
