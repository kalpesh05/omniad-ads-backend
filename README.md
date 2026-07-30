# OmniAds Backend API

Welcome to the backend repository of **OmniAds**, the high-concurrency engine powering our AI Agency-in-a-Box operating system.

---

## 📚 Documentation Quick Links

- 🧠 [MEMORY.md](./MEMORY.md) — System design principles, ADRs, database models, and security rules.
- 🤝 [CONTEXT.md](./CONTEXT.md) — Developer handover guide, environment setup, database commands, and API route overview.
- 📋 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) — Purpose specification, feature details, and audit compliance breakdown.

---

## 🚀 Overview

This backend is a Node.js / Express REST API that powers client billing, OAuth integrations, AI comment moderation, automated campaign approval workflows, and competitor intelligence.

---

## ✨ Core Backend Services

- **Authentication & RBAC Middleware**: JWT authentication paired with custom role-based route protection (`admin`, `manager`, `editor`, `viewer`).
- **Client Approval & Ad Publishing Engine**: State machine routing campaigns from `draft` -> `PENDING_CLIENT_APPROVAL` -> `active`, auto-triggering ad deployment across Meta and Google APIs.
- **AI Comment Moderation**: Endpoint for scanning social messages and automatically archiving toxic or spam comments.
- **Stripe BYOS Billing**: "Bring Your Own Stripe" architecture for direct agency client billing without third-party cuts.
- **Competitor X-Ray Intelligence**: High-level analysis of competitor ad spend and creative angles.
- **Audit Logging**: Comprehensive activity tracking via `AuditLog` database records for complete compliance.

---

## 🛠️ Technology Stack

- **Server Framework**: Node.js + Express.js
- **Database & ORM**: MySQL + Prisma ORM (`prisma/schema.prisma`)
- **Testing**: Jest + Supertest (automated isolation setup)
- **Security**: Helmet, Rate Limiter, CORS, JWT, BcryptJS

---

## 📁 Repository Structure

```
omnin-ads-backend/
├── controllers/          # Business logic handlers (auth, campaigns, inbox, billing, etc.)
├── middleware/           # auth.js, rbac.js, errorHandler.js
├── prisma/
│   └── schema.prisma     # Database schema & models
├── routes/               # API route definitions
├── services/             # AdPublisherService, AI generators
├── tests/                # Automated Jest test suites
├── MEMORY.md             # Architecture rules & ADRs
├── CONTEXT.md            # Developer handover & setup
└── PRODUCT_SPEC.md       # Feature purpose & specification
```

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Server

### Quick Start
```bash
# Clone the repository
git clone https://github.com/kalpesh05/omniad-ads-backend.git
cd omnin-ads-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma client & push schema
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Running Tests
```bash
npx dotenv-cli -e .env.test -- npx prisma db push --accept-data-loss
npm test
```

---

## 🤝 Handover & Contribution
Please refer to [CONTEXT.md](./CONTEXT.md) and [MEMORY.md](./MEMORY.md) before submitting pull requests or making database schema migrations.