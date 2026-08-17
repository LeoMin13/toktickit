# TokTickIT

IT service desk application — CPE 334 Lab 1 (Full-Stack Hello World).

## Stack
React + TypeScript + Vite + Bootstrap · Node.js + Express + TypeScript · PostgreSQL + Prisma

## Setup

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 14+ running locally

### 1. Database
\`\`\`bash
psql -U postgres -c "CREATE DATABASE toktickit;"
\`\`\`

### 2. Backend
\`\`\`bash
cd server
npm install
cp .env.example .env   # edit DATABASE_URL with your local password
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev             # http://localhost:3000
\`\`\`

### 3. Frontend
\`\`\`bash
cd client
npm install
npm run dev              # http://localhost:5173
\`\`\`

### 4. Tests
\`\`\`bash
cd server && npm test
cd client && npm test
\`\`\`