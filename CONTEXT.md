# OmniAds Backend API — Developer Handover & Context File

> **For New Backend Engineers & AI Agents**: Read this document first before starting any work on this codebase.

---

## 1. Project Handover Summary

### Current Status
- **Phase Completed**: Phase 10 (Enterprise Agency Features: RBAC Middleware, Client Approval Workflows, AI Moderation Endpoint).
- **Next Planned Milestone**: Phase 11 ("Pocket CEO" React Native / Expo Mobile App Endpoints).
- **Branch Name**: `growth-os-be`
- **Testing Status**: Passing 100% (Automated Jest suites passing).

---

## 2. Environment Setup & Configuration

### Prerequisites
- **Node.js**: v18.x or higher
- **Database**: Local or Cloud MySQL Instance
- **Prisma CLI**: `npx prisma`

### Required Environment Variables (`.env`)
```env
PORT=3000
DATABASE_URL="mysql://root:password@localhost:3306/omniads"
JWT_SECRET="your-super-secret-jwt-key"
STRIPE_SECRET_KEY="sk_test_..."
```

### Database Initialization
```bash
# Generate Prisma Client
npx prisma generate

# Push schema changes to database
npx prisma db push
```

---

## 3. How to Run & Test

### Running Local Development Server
```bash
npm run dev
```
Starts Express server on `http://localhost:3000`.

### Running Automated Test Suite
```bash
# Setup dedicated test database
npx dotenv-cli -e .env.test -- npx prisma db push --accept-data-loss

# Execute Jest tests
npm test
```

---

## 4. Primary API Route Overview

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account with default role |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/campaigns` | Auth JWT | Fetch all agency campaigns |
| `POST` | `/api/campaigns` | Auth JWT | Create new campaign draft |
| `POST` | `/api/campaigns/:id/request-approval` | Auth JWT | Transition status to `PENDING_CLIENT_APPROVAL` |
| `POST` | `/api/campaigns/:id/client-approve` | Public (Magic Link) | Client approves campaign -> Triggers `AdPublisherService` |
| `POST` | `/api/inbox/:id/moderate` | Auth JWT | AI moderates social comment & auto-archives spam |
| `GET` | `/api/billing/mrr` | Auth JWT + Role (`admin`/`manager`) | Fetch Monthly Recurring Revenue analytics |
| `POST` | `/api/billing/client-invoices` | Auth JWT + Role (`admin`/`manager`) | Generate client Stripe invoice |

---

## 5. Where Things Left Off & Next Steps

1. **Phase 10 Done**: All security middleware, approval endpoints, moderation logic, and role checks are committed.
2. **Phase 11 (Next Task)**: Expose mobile-optimized push notification endpoints and executive summary data routes for the upcoming "Pocket CEO" React Native app.
