# OmniAds Backend API — Project Memory & Architecture Decision Records (ADR)

> **Document Status**: Active  
> **Last Updated**: July 2026  
> **Target Audience**: Backend Engineers, AI Engineering Agents, System Architects  

---

## 1. Architectural Principles & System Design

### 1.1 Core Architecture
- **Framework**: Node.js with Express.js REST API architecture.
- **ORM & Database**: MySQL managed via Prisma ORM (`prisma/schema.prisma`).
- **Authentication**: JWT-based stateless authentication with `bcryptjs` password hashing and header-injected token verification (`Authorization: Bearer <token>`).
- **Error Handling**: Centralized global error handling middleware using standard custom `AppError` class and HTTP status codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`).
- **Audit Logging**: Comprehensive activity tracking via `AuditLog` Prisma model for key actions (campaign approvals, comment moderation, user registration, role changes).

### 1.2 Database Models & Schema Highlights (`prisma/schema.prisma`)
- **`User`**: Account model supporting roles (`admin`, `manager`, `editor`, `viewer`).
- **`Campaign`**: Multi-platform ad campaign records supporting status state machine (`draft`, `PENDING_CLIENT_APPROVAL`, `active`, `paused`, `completed`, `archived`).
- **`InboxMessage`**: Social media message items supporting AI moderation status (`active`, `archived`, `flagged_spam`).
- **`AuditLog`**: Security and operational audit log storing `userId`, `action`, `entityType`, `entityId`, `details`, and `ipAddress`.
- **`Integration`**: Connected third-party credentials (Meta Ads, Google Ads, TikTok, Stripe BYOS).

---

## 2. Key Architecture Decision Records (ADR)

### ADR 001: Granular RBAC Middleware (`middleware/rbac.js`)
- **Implementation**: `requireRole(allowedRoles)` middleware layer executing after `authenticateToken`.
- **Enforcement Rules**:
  - `GET /api/billing/mrr` -> Restricted to `['admin', 'manager']`.
  - `POST /api/billing/client-invoices` -> Restricted to `['admin', 'manager']`.
  - Returns `403 Forbidden` with descriptive error payload if role criteria is not satisfied.

### ADR 002: Client Approval Workflow & Automated Publishing
- **Endpoints**:
  - `POST /api/campaigns/:id/request-approval`: Sets campaign status to `PENDING_CLIENT_APPROVAL` and logs audit entry.
  - `POST /api/campaigns/:id/client-approve`: Validates pending state, transitions campaign status to `active`, and automatically invokes `AdPublisherService.publishCampaign(campaign)` to publish ads across Meta/Google APIs.

### ADR 003: AI Moderation Engine (`controllers/inboxController.js`)
- **Endpoint**: `POST /api/inbox/:id/moderate`.
- **Behavior**: Analyzes text for keywords/patterns indicative of toxicity or spam. Upon detection, transitions status to `archived` and creates an audit log entry.

### ADR 004: Automated Testing Isolation (`tests/setup.js`)
- Tests run against a dedicated `omniads_test` MySQL database.
- `setup.js` executes table truncation before test suites run to guarantee zero cross-test state pollution.

---

## 3. Directory Structure & Map

```
omnin-ads-backend/
├── controllers/
│   ├── ads/                  # campaignController.js, platformController.js, adPublisherService.js
│   ├── authController.js     # User registration, login, JWT issuance
│   ├── billingController.js  # Stripe BYOS, invoices, MRR tracking
│   ├── inboxController.js    # AI comment moderation, inbox queries
│   ├── onboardingController.js # Magic Link generation & validation
│   └── spyController.js      # Competitor X-Ray & ad spy service
├── middleware/
│   ├── auth.js               # JWT verification (authenticateToken)
│   ├── rbac.js               # Role-based access control (requireRole)
│   └── errorHandler.js       # Centralized HTTP error formatter
├── prisma/
│   └── schema.prisma         # Database models & Prisma client configuration
├── routes/
│   ├── auth.js               # Auth endpoints
│   ├── billing.js            # Billing & MRR endpoints
│   ├── campaigns.js          # Campaign CRUD & approval endpoints
│   ├── inbox.js              # Inbox & moderation endpoints
│   └── onboarding.js         # Magic link endpoints
├── services/                 # External service integrations (AI generation, Meta/Google publishing)
├── tests/                    # Integration & unit test suites (Jest + Supertest)
├── utils/                    # AppError, logger, helpers
├── MEMORY.md                 # Architecture rules & ADRs
├── CONTEXT.md                # Developer handover & setup
└── PRODUCT_SPEC.md           # Product purpose & feature breakdown
```

---

## 4. Past Phase Milestones & Execution History

- **Phase 1-8**: Core REST API creation, auth JWT, Prisma ORM setup, Stripe BYOS integration, competitor spy routes.
- **Phase 9**: Unified API endpoints for export, ad publisher service skeleton, audit logging integration.
- **Phase 10**: `rbac.js` middleware, route protection for MRR and billing, client approval controller logic, AI moderation endpoint.
