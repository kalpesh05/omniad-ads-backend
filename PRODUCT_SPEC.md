# OmniAds Backend API — Product Purpose & Feature Architecture Specification

---

## 1. System Vision & Product Purpose

The **OmniAds Backend API** serves as the high-concurrency engine powering the OmniAds Agency Operating System. It is engineered to deliver:
- **Enterprise Governance**: Granular role-based access control protecting agency financial data.
- **Automated Ad Publishing**: Direct background integration with ad networks (Meta Marketing API, Google Ads API).
- **AI Intelligence Processing**: Endpoints powering automated comment moderation, creative copy generation, and competitor intelligence.
- **Client Billing Autonomy**: "Bring Your Own Stripe" (BYOS) billing integration allowing agencies to bill clients without platform commission cuts.

---

## 2. Comprehensive Endpoint Feature Breakdown

### 2.1 Authentication & User Governance
- **`POST /api/auth/register`**: Validates input, hashes passwords via `bcryptjs` (salt factor 10), initializes new user with assigned role (`admin`, `manager`, `editor`, `viewer`), returns JWT access token.
- **`POST /api/auth/login`**: Authenticates credentials and issues signed JWT tokens containing user ID and role claims.
- **`middleware/rbac.js`**: Enforces strict route-level access boundaries. Restricts sensitive financial and agency configuration endpoints to designated roles.

### 2.2 Campaign Lifecycle & Client Approval Engine
- **`GET /api/campaigns`**: Fetches campaign listings with aggregated budget and ROI metrics.
- **`POST /api/campaigns`**: Creates new draft campaigns in the database.
- **`POST /api/campaigns/:id/request-approval`**: Moves draft campaign into `PENDING_CLIENT_APPROVAL` state, generates magic token, and logs audit record.
- **`POST /api/campaigns/:id/client-approve`**: Verifies magic token, updates status to `active`, and dispatches payload to `AdPublisherService` for immediate live deployment.

### 2.3 AI Comment Moderation Engine
- **`POST /api/inbox/:id/moderate`**: Analyzes message content for toxic patterns and spam keywords. Automatically sets message status to `archived` and flags it in audit logs.

### 2.4 Client Billing & Financial Analytics
- **`GET /api/billing/mrr`**: Computes agency Monthly Recurring Revenue (MRR), churn rate, and active subscriber metrics across connected client accounts. Restricted to `admin` & `manager` roles.
- **`POST /api/billing/client-invoices`**: Generates white-labeled invoice records via Stripe API. Restricted to `admin` & `manager` roles.

### 2.5 Competitor Intelligence & Ad Spy
- **`GET /api/spy/competitor`**: Queries competitor ad activity, estimated ad spend ranges, creative formats, and positioning angles.

---

## 3. Security, Auditability & Compliance

- **Data Encryption**: All secret keys (Stripe API keys, Meta Access Tokens) are encrypted at rest.
- **Audit Logging**: Every critical action generates a record in the `AuditLog` database table storing timestamps, acting user ID, IP address, target entity, and action type.
- **Rate Limiting & Hardening**: Protected with `helmet`, `express-rate-limit`, and CORS origin verification.
