<div align="center">

<img width="256" height="256" alt="image" src="https://github.com/user-attachments/assets/0e9e5c7a-02f2-488c-8e99-9a24b82f7d40" />

<br/>

![React](https://img.shields.io/badge/React-19.3.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
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

<img width="1280" height="320" alt="image" src="https://github.com/user-attachments/assets/815edccc-b2ba-4f5e-aecc-f79ae72a7d84" />

## Overview

**WorkMonitor Enterprise** is a full-stack task management platform that gives teams a single source of truth for every task, sprint, and team member. It covers the entire delivery cycle — backlog grooming, sprint planning, Kanban execution, analytics, and auditing — in one cohesive product.

The backend is written in **Go** and the frontend in **React 19.3.0 + Tailwind CSS 4.3.3**. A clean layered architecture ensures every protected route passes through authentication and role guards before it ever reaches the database.

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

**Form Login**
<img width="1836" height="891" alt="image" src="https://github.com/user-attachments/assets/e21ba597-d3cc-4ca0-af0b-4020f0025aa2" />

**Dashboard**
<img width="1918" height="1005" alt="image" src="https://github.com/user-attachments/assets/06796200-b0a3-41eb-8bc1-205ea1b0c795" />

**PWA**
<img width="1882" height="1027" alt="image" src="https://github.com/user-attachments/assets/c0f2c222-478a-4b5c-b84a-1fc6d03e4943" />

**Departments**
<img width="1918" height="985" alt="image" src="https://github.com/user-attachments/assets/115eec66-5f43-49a7-b6e0-df16664c82c4" />

**Users**
<img width="1914" height="996" alt="image" src="https://github.com/user-attachments/assets/44f81cf5-00ed-4cfc-ae81-a16edccf96e1" />

**Backlog**
<img width="1909" height="996" alt="image" src="https://github.com/user-attachments/assets/22bc7697-9de2-4483-9308-1a76f3bee8ee" />

<img width="1918" height="982" alt="image" src="https://github.com/user-attachments/assets/01757062-a079-4ba4-bc83-409b878c7b50" />
<img width="1918" height="1012" alt="image" src="https://github.com/user-attachments/assets/733c3c04-1cd0-4c7b-af13-26eab08ef2db" />
<img width="1906" height="1009" alt="image" src="https://github.com/user-attachments/assets/3dc59b57-fb27-404c-8010-99241c64038a" />

**Sprints**
<img width="1918" height="985" alt="image" src="https://github.com/user-attachments/assets/7005fb6e-5a3b-4dac-8a4b-256c3a157f72" />

**Kanban Board**
<img width="1917" height="990" alt="image" src="https://github.com/user-attachments/assets/a8149a76-8392-4eaf-ba74-f4aef643e864" />
<img width="1918" height="982" alt="image" src="https://github.com/user-attachments/assets/ce0db485-b5d9-47c1-b26c-660a38fe97c6" />

**Calender**
<img width="1917" height="997" alt="image" src="https://github.com/user-attachments/assets/85902005-d98d-4c16-aa1b-1c917afe69ba" />


<details>
<summary><b>🖥️ Local Run Program</b></summary>
<br>

**Local Run Program on Git**
#Backend:
<img width="1233" height="316" alt="image" src="https://github.com/user-attachments/assets/615749eb-35bc-4242-83e5-0863d502b156" />

<img width="1266" height="975" alt="image" src="https://github.com/user-attachments/assets/3db9baaf-ca24-4cb7-a921-da5131258b9a" />

<img width="1723" height="1000" alt="image" src="https://github.com/user-attachments/assets/fbd486ff-2bed-4f3c-b450-059b30b1d0d6" />

#Frontend:
<img width="1198" height="352" alt="image" src="https://github.com/user-attachments/assets/44597baf-a080-485c-b7b3-1410ed0cc11e" />



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

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](https://tlo.mit.edu/resources/mit-github) file for details.

---

<div align="center">

<img width="256" height="256" alt="image" src="https://github.com/user-attachments/assets/0e9e5c7a-02f2-488c-8e99-9a24b82f7d40" />

### Eben Nezer Manurung

Full Stack Developer • Backend Engineer

[![GitHub](https://img.shields.io/badge/GitHub-EbenEzerManurung-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/EbenEzerManurung)

<br/>

If this project helped you, please consider giving it a ⭐

<sub>Built with React 19.3.0, Tailwind CSS 4.3.3, Go, and MySQL</sub>

</div>
