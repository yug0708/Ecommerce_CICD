# Ecommerce CI/CD

Production-ready ecommerce monorepo with a React frontend and an Express REST API backed by PostgreSQL.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React (Vite), TypeScript, Tailwind CSS, React Router, Zustand |
| Backend | Node.js, Express.js, TypeScript, JWT auth |
| Database | PostgreSQL + Prisma ORM |
| Tooling | npm workspaces, ESLint, Prettier |

## Folder structure

```text
.
├── client/                 # React SPA (Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/     # Shared UI components (to be added)
│   │   ├── pages/          # Route-level pages (to be added)
│   │   ├── store/          # Zustand stores
│   │   ├── lib/            # Helpers / API client (to be added)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                 # Express REST API
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/         # Env / app config (to be added)
│   │   ├── middleware/     # Auth, errors (to be added)
│   │   ├── routes/         # Route handlers (to be added)
│   │   ├── controllers/    # Business handlers (to be added)
│   │   ├── services/       # Domain services (to be added)
│   │   └── index.ts        # App entry
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── eslint.config.js        # Shared ESLint base
├── .prettierrc
├── .gitignore
├── package.json            # npm workspaces root
└── README.md
```

## Prerequisites

- Node.js **20+**
- npm **10+** (comes with Node)
- PostgreSQL **14+** running locally or via Docker

## Setup

1. **Install dependencies** (from the repo root):

   ```bash
   npm install
   ```

2. **Configure environment files**:

   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

   Edit `server/.env` and set a real `DATABASE_URL` and `JWT_SECRET`.

3. **Generate the Prisma client** (after you add models / migrate):

   ```bash
   npm run db:generate
   ```

## Running the project

From the repo root:

```bash
# Frontend only (http://localhost:5173)
npm run dev:client

# Backend only (http://localhost:4000)
npm run dev:server

# Both workspaces
npm run dev
```

| Service | Default URL |
| --- | --- |
| Client | http://localhost:5173 |
| Server | http://localhost:4000 |
| Health check | http://localhost:4000/api/health |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev:client` | Start Vite dev server |
| `npm run dev:server` | Start Express API with hot reload |
| `npm run build` | Build client and server |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format with Prettier |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Code style

- **ESLint** — TypeScript-aware rules shared from the root `eslint.config.js`, extended in each workspace
- **Prettier** — Single root `.prettierrc`; run `npm run format` before committing

## Next steps

This repo is scaffold-only. Feature work (auth, products, cart, checkout, admin UI) will be added in later prompts.
