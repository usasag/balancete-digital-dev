# Copilot Instructions for Balancete Digital Web

This document provides essential context for AI assistants working on this monorepo.

## Project Overview

**Balancete Digital Web** is a financial management system for the Núcleo Linha de Tucunacá. It's a fullstack monorepo with:
- **Frontend**: Next.js 16 + React 19 + TypeScript with Tailwind CSS and Radix UI
- **Backend**: NestJS 11 + Express with TypeORM and PostgreSQL
- **Database**: PostgreSQL 15 (Docker containerized)
- **Auth**: Firebase Auth with custom JWT + hierarchical role-based access control (RBAC)
- **Storage**: Firebase Storage for files (with local fallback mode)

## Build, Test, and Lint Commands

### Backend (NestJS)

```bash
cd backend

# Development (watch mode)
npm run start:dev

# Build
npm run build

# Run production build
npm run start:prod

# Linting and formatting
npm run lint
npm run format

# Testing
npm run test                 # Run all unit tests
npm run test:watch          # Watch mode for tests
npm run test:cov            # Coverage report
npm run test:e2e            # End-to-end tests
npm run test:debug          # Debug mode

# Data
npm run seed:presentation   # Load sample/presentation data
```

### Frontend (Next.js)

```bash
cd frontend

# Development
npm run dev

# Build
npm run build

# Run production build
npm run start

# Linting
npm run lint
```

### Docker & Database

```bash
# Start PostgreSQL (from repo root)
docker compose up -d

# Stop PostgreSQL
docker compose down
```

## Architecture

### Frontend Architecture

**Next.js with App Router** using grouped route layout:
- `app/(auth)/` — Login and authentication pages
- `app/(dashboard)/` — Protected routes with dashboard layout
  - Feature routes: `balancetes/`, `lancamentos/`, `mensalidades/`, `taxas/`, `periodicos/`, `configuracoes/`, `meus-balancetes/`, `minhas-mensalidades/`
- `components/` — Reusable UI components (Radix-based)
- `contexts/` — React Context for auth state and user roles
- `services/` — API client (Axios), auth service
- `lib/` — Utilities and helpers
- `types/` — TypeScript interfaces and DTOs

**Key Technologies**:
- **React Compiler**: Enabled in next.config.ts for automatic memoization
- **Tailwind CSS 4**: With custom theme overrides in styles/
- **Radix UI**: Accessible component primitives (checkbox, dialog, dropdown, tabs, etc.)
- **Lucide React**: Consistent icon library
- **Sonner**: Toast notifications

**API Routing**: Frontend `/api/*` routes are proxied to backend `localhost:3001` via next.config.ts rewrite rules.

### Backend Architecture

**NestJS Modular Pattern** — Each feature is a self-contained module:

| Module | Purpose |
|--------|---------|
| `auth/` | Firebase JWT strategy, RolesGuard, RBAC enforcement, role decorators |
| `usuario/` | User management, profiles, role assignments |
| `balancete/` | Monthly balance sheets, approval workflow, publishing |
| `lancamento/` | Financial transactions, OFX import parser, import logs |
| `mensalidade/` | Member monthly fees tracking |
| `taxa/` | Optional taxes/fees configuration |
| `caixa/` | Cash accounts and cash flow |
| `conta-bancaria/` | Bank accounts and reconciliation |
| `categoria-financeira/` | Income/expense categories |
| `nucleo/` | Organizational units/branches |
| `periodo/` | Monthly periods and time ranges |
| `configuracao/` | System settings and preferences |
| `database/` | TypeORM setup, migrations, connection |
| `file-storage/` | Firebase Storage integration and file handling |

**Standard Module Structure**:
```
feature-module/
├── feature-module.module.ts      # NestJS module definition
├── feature-module.service.ts     # Business logic
├── feature-module.controller.ts  # HTTP endpoints
├── feature-module.entity.ts      # Database entity (TypeORM)
├── dto/                          # DTOs for input/output validation
├── feature-module.spec.ts        # Unit tests
└── enum/                         # Enums (roles, status, etc.)
```

**Dependency Injection**: All services use NestJS DI container for loose coupling and testability.

### Database Schema

PostgreSQL with TypeORM entities representing:
- `usuarios` — Users with role assignments
- `balancetes` — Monthly balance sheets with approval status
- `lancamentos` — Individual financial transactions (debits/credits)
- `mensalidades` — Monthly member fees
- `taxas` — Taxes/fees configuration
- `contas_bancarias` — Bank accounts
- `caixas` — Cash accounts
- `categorias_financeiras` — Transaction categories
- `periodos` — Monthly periods
- `nucleos` — Organizational units

## Key Conventions

### Authentication & Authorization (RBAC)

**Hierarchical Role System** (7 levels):

```typescript
enum Role {
  ADMIN_GLOBAL = 10,        // Full system access
  PRESIDENCIA = 9,          // Executive level
  TESOURARIA = 8,           // Treasury/Finance
  CONSELHO_FISCAL = 7,      // Audit/Fiscal council
  CONTABILIDADE_UNICA = 6,  // Accounting
  SOCIO = 1                 // Member
}
```

**How it works**:
- Roles have numeric hierarchy levels
- `RolesGuard` checks: `userRoleLevel >= requiredRoleLevel`
- **Cascading Permissions**: Higher roles automatically have all permissions of lower roles
- Use `@Roles(Role.TESOURARIA)` decorator on controller methods to restrict access

**Example**:
```typescript
@Controller('balancetes')
@UseGuards(RolesGuard)
export class BalanceteController {
  @Post()
  @Roles(Role.TESOURARIA)
  create(@Body() dto: CreateBalanceteDto) {
    // Only users with TESOURARIA or higher can access
  }
}
```

### Validation & DTOs

- Use `class-validator` decorators for input validation
- Use `class-transformer` for data transformation
- All controller inputs should be DTOs

**Example**:
```typescript
export class CreateBalanceteDto {
  @IsNumber()
  periodoId: number;

  @IsDate()
  @Type(() => Date)
  dataCompetencia: Date;

  @IsOptional()
  @IsString()
  notas?: string;
}
```

### TypeORM Entity Conventions

- Entities use `@Entity()` class decorators
- Primary key is typically `id: number` with `@PrimaryGeneratedColumn()`
- Relations use `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()`
- Timestamps use `@CreateDateColumn()` and `@UpdateDateColumn()`

**Example**:
```typescript
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column('enum', { enum: Role })
  role: Role;

  @CreateDateColumn()
  criadoEm: Date;
}
```

### File Handling

- **Default Mode**: Firebase Storage for production
- **Test Mode**: Set `FILE_STORAGE_TEST_MODE=true` in .env to use local `./uploads/` directory
- Service is injectable via `FileStorageService`

### OFX Import

- `lancamento/ofx-parser.ts` handles bank statement parsing
- Validates file structure and extracts transactions
- Creates `Lancamento` entities from parsed transactions
- Import logs tracked in `ImportLog` entity

### Environment Variables

**Backend (.env)**:
- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
- File Storage: `FILE_STORAGE_TYPE`, `BUCKET_NAME`
- Google APIs: `GOOGLE_SHEETS_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID`
- Optional: `FILE_STORAGE_TEST_MODE=true` for local uploads

**Frontend (.env.local)**:
- Firebase Public Config: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- API: `NEXT_PUBLIC_API_URL=/api` (rewritten to localhost:3001)

### Code Style

- **TypeScript Strict Mode**: Enabled in both frontend and backend
- **Prettier**: Use `npm run format` to auto-format
- **ESLint**: Use `npm run lint --fix` for linting
- **File Naming**: kebab-case for files (e.g., `user-auth.service.ts`)
- **Class Names**: PascalCase for classes
- **Constants**: UPPER_SNAKE_CASE

### Testing

- **Jest** for unit tests (backend)
- **Unit Test Naming**: `*.spec.ts` files
- **E2E Tests**: Located in `test/` directory with `jest-e2e.json` config
- **Run Single Test**: `npm run test -- users.service.spec.ts`
- **Coverage**: `npm run test:cov` generates HTML report

## Setup & Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL)

### Initial Setup

```bash
# Clone and install
git clone <repo-url>
cd dev-balancete-digital-web

# Backend setup
cd backend
npm install
cp .env.example .env
cd ..

# Frontend setup
cd frontend
npm install
cp .env.local.example .env.local
cd ..

# Start PostgreSQL
docker compose up -d

# In one terminal: Backend
cd backend
npm run start:dev

# In another terminal: Frontend
cd frontend
npm run dev
```

### Accessing the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: postgres://admin:adminpassword@localhost:5432/balancete_db (default from docker-compose.yml)

## Common Tasks

### Adding a New Feature Module

1. Create folder in `backend/src/feature-name/`
2. Generate module: `nest generate module feature-name`
3. Create service: `nest generate service feature-name`
4. Create controller: `nest generate controller feature-name`
5. Create entity in `entities/` subdirectory
6. Add DTOs in `dto/` subdirectory
7. Import module in `AppModule`

### Running Database Migrations

- Migrations are handled by TypeORM in `database/` module
- Check `database.module.ts` for TypeORM config
- Use `DataSource` from TypeORM for raw SQL queries if needed

### Debugging Backend

```bash
npm run start:debug
# Then attach debugger (VSCode will auto-detect)
```

### Checking Test Coverage

```bash
npm run test:cov
# Open coverage/index.html in browser
```

## E2E Testing with Playwright (Optional)

A Playwright MCP server is configured in `.github/mcp.json` for enhanced E2E testing capabilities. To use it:

1. **Install Playwright in frontend** (if not already installed):
   ```bash
   cd frontend
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Create test file** (e.g., `frontend/tests/login.spec.ts`):
   ```typescript
   import { test, expect } from '@playwright/test';

   test('login flow', async ({ page }) => {
     await page.goto('http://localhost:3000');
     await page.fill('[data-testid=email]', 'user@example.com');
     await page.fill('[data-testid=password]', 'password');
     await page.click('button:has-text("Login")');
     await expect(page).toHaveURL('http://localhost:3000/dashboard');
   });
   ```

3. **Run tests**:
   ```bash
   npx playwright test
   npx playwright test --ui  # Interactive mode
   ```

The Playwright MCP server enables AI assistants to write, execute, and debug browser automation scripts effectively.

## Important Notes

- **Env Files Are Ignored**: `.env` and `.env.local` are git-ignored; use `.env.example` and `.env.local.example` as templates
- **Cascading Roles**: Remember that ADMIN_GLOBAL (10) includes all permissions of TESOURARIA (8), etc. Don't hardcode role checks — use the hierarchy
- **Firebase Setup**: Both auth and file storage require Firebase credentials in backend .env
- **Next.js Compiler**: React Compiler is enabled for better performance — don't manually memoize unnecessarily
- **Docker State**: `docker compose down` wipes the database; use `docker compose up` to restart without data loss (if volume exists)

## Related Documentation

- **Architecture & System Design**: See `ai-guides/balancete_web_prompt_v2.md` for comprehensive system requirements
- **Project Roadmap**: `ROADMAP_TESOURARIA.md` for feature plans
- **NestJS Docs**: https://docs.nestjs.com
- **Next.js Docs**: https://nextjs.org/docs
