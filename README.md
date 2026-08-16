# MentorBridge

Web-based volunteer mentoring platform connecting students with volunteer mentors, built as a Final Year Project.

## Structure

```
frontend/   Next.js (App Router) — student, mentor, and admin interfaces
backend/    Node.js + Express API — auth, matching, sessions, gamification
```

## Requirements

- Node.js 20+
- PostgreSQL (local instance, already running as a service)

## Getting started

1. Install dependencies from the repo root (npm workspaces hoist shared deps):

   ```bash
   npm install
   ```

2. Copy backend env file and fill in your local database credentials:

   ```bash
   cp backend/.env.example backend/.env
   ```

3. Run both apps together:

   ```bash
   npm run dev
   ```

   Frontend: http://localhost:3000
   Backend:  http://localhost:4000

Or run them individually with `npm run dev:frontend` / `npm run dev:backend`.
