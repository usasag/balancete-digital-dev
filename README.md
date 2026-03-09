# Balancete Digital Web

Monorepo with:
- `frontend` (Next.js)
- `backend` (NestJS)
- `docker-compose.yml` (PostgreSQL)

## 1) Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL)

## 2) Clone and install

```bash
git clone <your-repo-url>
cd dev-balancete-digital-web

# backend
cd backend
npm install
copy .env.example .env
cd ..

# frontend
cd frontend
npm install
copy .env.local.example .env.local
cd ..
```

On macOS/Linux, replace `copy` with `cp`.

## 3) Start dependencies (Postgres)

```bash
docker compose up -d
```

## 4) Run the project

Backend:
```bash
cd backend
npm run start:dev
```

Frontend (new terminal):
```bash
cd frontend
npm run dev
```

App URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## 5) Upload to GitHub (first time)

If this folder is not a git repository yet:

```bash
git init
git add .
git commit -m "chore: prepare project for portable setup"
```

Create an empty GitHub repository, then connect and push:

```bash
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

If you use GitHub CLI:

```bash
gh repo create <your-repo> --public --source . --remote origin --push
```

## Notes

- Sensitive env files are ignored by root `.gitignore` (`backend/.env`, `frontend/.env.local`).
- Example env templates are tracked (`backend/.env.example`, `frontend/.env.local.example`).
