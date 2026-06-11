# OmniAds Backend REST API

This repository houses the core Node.js Express engine for the OmniAds platform. It orchestrates user authentication, OAuth platform integration (Meta Ads, Google Ads, YouTube, LinkedIn, GA4), ad account syncing, automatic performance metric updates, generative AI assistance, multi-tenant workspace administration (Teams, Roles, Audit Logs), and Stripe subscriptions.

---

## 🚀 Key Modules & System Architecture

*   **Platform Connectors & OAuth Engine**: The backend handles the complete OAuth authorization flow and tokens (stored in `ads_tokens` table) with automatically managed background refresh tokens.
*   **Ad Campaign Synchronizer**: Standardized synchronization managers fetch campaigns, creatives, and metrics dynamically and cache them in local database tables to speed up client-side dashboards.
*   **Workspace Collaboration**: Supports workspaces (`teams` table) with role permissions (`admin`, `manager`, `editor`, `viewer`) and comprehensive activity tracing via the `audit_logs` table.
*   **Stripe SaaS Integrations**: Active subscription plan tier tracking (`subscriptions` table) with webhook handlers that listen for billing updates.
*   **Generative AI Pipeline**: Unified interface utilizing OpenAI, Anthropic, and Gemini SDKs for content ideation and copywriting recommendations.
*   **Background Jobs Manager**: Cron jobs configured in [cron/](file:///C:/Users/Admin/Desktop/stackby/omniads/omnin-ads-backend/cron) run synchronization, email reminders, and content publication tasks in the background.

---

## 📁 Repository Structure

```text
omnin-ads-backend/
├── config/
│   ├── database.js          # MySQL connection pooling, database verification, & table migrations
│   └── plans.js             # Subscription pricing plans and limits
├── controllers/
│   ├── authController.js    # JWT register/login endpoints
│   ├── adsController.js     # Unified ad platform synchronizer & manager (Campaigns, AdGroups, Creatives)
│   ├── aiController.js      # Generative copywriting & insights coordinator
│   ├── teamController.js    # Workspace member management
│   └── billingController.js # Stripe sessions and webhook handler
├── cron/
│   └── syncJobs.js          # Scheduled task synchronizers
├── middleware/
│   ├── auth.js              # Token validators & workspace role gatekeepers
│   ├── security.js          # Rate limiter configs & security headers
│   └── errorHandler.js      # Consolidated error handler
├── models/                  # Direct SQL entities (User, Campaign, ConnectedAccount, Team)
├── routes/                  # Express HTTP router declarations
├── services/                # External APIs integrations (MetaAds, GoogleAds, LinkedIn, AI)
├── utils/                   # Shared utility modules (JWT signature generation, responders)
├── app.js                   # Application wrapper & middleware mapping
└── server.js                # Server listener initializer
```

---

## 🛠️ Tech Stack & Key Libraries

*   **Runtime Environment**: Node.js (ES6 JavaScript)
*   **Application Framework**: Express.js
*   **Database Engine**: MySQL (v5.7+) connected via the `mysql2` client
*   **Encryption & Security**: JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`), secure headers (`helmet`), IP limiter (`express-rate-limit`)
*   **Payment Processing**: Stripe SDK
*   **AI Pipelines**: `@anthropic-ai/sdk`, `@google/genai`, `openai`
*   **Scheduling**: `node-cron`

---

## 💻 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   MySQL Server (v5.7+)
*   npm or yarn

### Installation & Local Setup

1.  **Clone the project and navigate to the directory:**
    ```bash
    cd omnin-ads-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Duplicate `.env.example` to create your own configuration file:
    ```bash
    cp .env.example .env
    ```
    Configure the following values inside `.env`:
    *   `PORT` (default: 3000)
    *   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (MySQL connection info)
    *   `JWT_SECRET`, `JWT_EXPIRE`
    *   Stripe Keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
    *   AI Keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`)
    *   Platform API credentials (Google Ads Client ID/Secret, Facebook App ID/Secret, LinkedIn Client ID/Secret)

4.  **Create local Database:**
    The server will automatically generate the database and create tables on its first boot. You only need to ensure the database server is running. If you want to create it manually, execute:
    ```sql
    CREATE DATABASE IF NOT EXISTS omniads_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```

5.  **Start Development Server:**
    ```bash
    npm run dev
    ```
    The REST API will be accessible at `http://localhost:3000`.

---

## 🔒 Security Implementations

*   **IP-Based Rate Limiting**: Limit API requests globally and set strict rate limiting on registration and login endpoints to prevent brute-force attacks.
*   **Parameterized SQL Queries**: No raw string concats are used in database operations to prevent SQL injection.
*   **Secure Headers (Helmet)**: Sets standard HTTP headers to protect against common cross-site attacks.
*   **Role-Based Access Control**: Standard route structures check token signatures and compare database membership roles before returning workspace records.