# SimpleStock

Monorepo (pnpm) para o sistema de controle de estoque simplificado.

- packages/backend: API (Node.js + Express + TypeScript + Prisma)
- packages/frontend: Web (React + Vite + TypeScript)
- packages/shared: Tipos/utilitários compartilhados

## Requisitos
- Node.js 18+
- pnpm 9+

## Setup inicial
```bash
pnpm install
```

## Backend (dev)
```bash
cp packages/backend/.env.example packages/backend/.env
pnpm --filter @simplestock/backend prisma:generate
pnpm --filter @simplestock/backend db:migrate
pnpm --filter @simplestock/backend dev
```

API iniciará em http://localhost:4000

## Frontend
Será configurado nas próximas etapas.
