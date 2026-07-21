# Backend Project Context: OmniAds API

This document provides a comprehensive overview of the backend codebase, database design, integration architecture, security systems, and opportunities for development and refactoring.

---

## 1. Overview & Purpose
The **OmniAds API** serves as the central orchestration engine for the OmniAds ecosystem. It connects users' workspaces with third-party advertising APIs (Meta/Facebook, Instagram, Google Ads, GA4, YouTube, LinkedIn), automates the collection and consolidation of ad metrics, schedules content publication, handles secure multi-role tenant management (teams, invitations, audit logs), processes payments via Stripe, and generates predictive AI insights.

---

## 2. Technical Stack
The server is built using standard Node.js frameworks:
- **Runtime Environment**: [Node.js](https://nodejs.org/) (ES6 JavaScript).
- **Web Framework**: [Express.js](https://expressjs.com/) for routing and middleware orchestration.
- **Database Engine**: [MySQL](https://www.mysql.com/) (v5.7+) for relational data storage.
- **Database Client**: `mysql2` utilizing promise-based connection pools.
- **AI Integrations**: `@anthropic-ai/sdk`, `@google/genai` (Gemini SDK), and `openai`.
- **Payment Processing**: `stripe` SDK for SaaS subscription tiers and webhooks.
- **Security & Utilities**:
  - `jsonwebtoken` for stateless bearer token authentication.
  - `bcryptjs` for high-entropy password hashing.
  - `express-rate-limit` for DDoS and brute-force mitigation.
  - `helmet` for secure HTTP headers.
  - `winston` for contextual log generation.
  - `node-cron` for scheduling ad data sync and publication jobs.
  - `joi` for schema-based input validators.

---

## 3. Database Schema Overview
The database tables are initialized and verified automatically at boot via [database.js](file:///C:/Users/Admin/Desktop/stackby/omniads/omnin-ads-backend/config/database.js):

| Table | Purpose | Relationships |
|---|---|---|
| `users` | User credentials, profiles, global role (`admin`, `moderator`, `user`). | Root identity table |
| `refresh_tokens` | Manages stateless session tokens to grant new access tokens. | `FOREIGN KEY (user_id) REFERENCES users(id)` |
| `ads_tokens` | OAuth tokens (access & refresh tokens) for third-party platforms. | `FOREIGN KEY (user_id) REFERENCES users(id)` |
| `connected_accounts` | Accounts selected from connected platforms (e.g. ad accounts). | `FOREIGN KEY (token_id) REFERENCES ads_tokens(id)` |
| `ads_campaigns` | Unified representation of ad campaigns across all platforms. | `FOREIGN KEY (account_id) REFERENCES connected_accounts(id)` |
| `ads_creatives` | Ads visuals, assets, and layouts associated with a campaign. | `FOREIGN KEY (campaign_id) REFERENCES ads_campaigns(id)` |
| `ads_insights` | Tabular timeseries metrics (impressions, clicks, spend, conversions). | `FOREIGN KEY (campaign_id) REFERENCES ads_campaigns(id)` |
| `ads_platforms` | Supported platform URLs, credentials, and API client identifiers. | Lookup platform configuration |
| `analytics` | Aggregated user performance metrics across configured accounts. | `FOREIGN KEY (user_id) REFERENCES users(id)` |
| `selected_properties` | Analytics reporting properties chosen by the user (Google Analytics). | `FOREIGN KEY (user_id) REFERENCES users(id)` |
| `teams` | Workspaces supporting collaborative ad management. | `FOREIGN KEY (owner_id) REFERENCES users(id)` |
| `team_members` | Pivot table detailing users mapped to teams with workspace roles. | Mapped to `teams` and `users` tables |
| `audit_logs` | Trace log tracking workspace changes (IP, action, resource). | `FOREIGN KEY (team_id) REFERENCES teams(id)` |
| `content_posts` | Drafted, scheduled, or published social media updates. | `FOREIGN KEY (team_id) REFERENCES teams(id)` |
| `content_media` | Media files and assets associated with a content post. | `FOREIGN KEY (post_id) REFERENCES content_posts(id)` |
| `notifications` | Application alerts distributed to specific workspace members. | `FOREIGN KEY (user_id) REFERENCES users(id)` |
| `inbox_messages` | Social media comments, DMs, or thread messages from integrations. | `FOREIGN KEY (team_id) REFERENCES teams(id)` |
| `subscriptions` | Active billing states synchronized from Stripe. | `FOREIGN KEY (team_id) REFERENCES teams(id)` |
| `team_settings` | Workspace-level configurations, timezone adjustments, and preferences. | `FOREIGN KEY (team_id) REFERENCES teams(id)` |

---

## 4. Key Services & API Design

### OAuth Token Authenticator (`AdPlatformAuthenticator`)
Provides unified token management for third-party integrations:
- Natively handles token expiration checks.
- Automatically uses stored `refresh_token` to retrieve fresh `access_token` from Meta, Google, LinkedIn, etc., on demand.
- Updates the database on renewal without needing user interaction.

### Synchronizers & Ad Managers (`dataSyncService.js`)
Abstracts third-party APIs via factory patterns:
- Interacts with Facebook Graph SDK, Google Ads APIs, and YouTube API.
- Imports campaigns, creatives, and insights into local MySQL tables to avoid API rate limits and speed up frontend requests.
- Daily cron jobs fetch updated metrics.

### AI Engine (`aiService.js`)
Integrates three AI providers:
- Generates campaign performance recommendations, text copy options, and identifies anomalies.
- Falls back gracefully between OpenAI (GPT), Anthropic (Claude), and Google GenAI (Gemini) based on credential availability.

---

## 5. Architectural Evaluation: Pros & Cons

### Pros:
- **Unified OAuth Strategy**: Clear database storage design for refresh tokens makes it easy to integrate additional networks.
- **Robust Connection Pool Management**: Prevents connection drops via standard pooling configurations and a 5-minute keep-alive ping on the connection socket.
- **Clean Service Layer Abstraction**: Ad managers inherit standard interfaces, keeping controller logic decoupled from third-party API payloads.
- **Graceful Multi-Provider AI Fallback**: If an API key expires or is rate-limited, the system automatically falls back to an alternative provider.

### Cons:
- **Raw SQL Bloat**: Hand-written query strings are embedded throughout models and controllers, making refactoring or database dialect migration difficult.
- **Monolithic Ad Controller**: `adsController.js` has grown to over 90KB and handles Google Ads, YouTube, Facebook, TikTok, campaign creation, and account synchronization in a single class.
- **Verbose Error Boundaries**: Route controllers rely on repetitive `try-catch` blocks; utilizing an Express async handler wrapper would clean up hundreds of lines.
- **Missing DB Migrations**: Tables are generated programmatically on startup. As the project evolves, this will cause conflicts when column types change or fields are added, since there is no migration history.

---

## 6. Future Roadmap & Opportunities for Improvement
- **Migrate to an ORM**: Move to `Prisma` or `Sequelize` to enforce strict type checking on schemas, simplify queries, and implement a structured migration workflow.
- **Deconstruct the Ad Controller**: Break `adsController.js` into platform-specific sub-controllers (e.g., `MetaAdsController`, `GoogleAdsController`, `YouTubeController`).
- **Implement Centralized Async Wrapper**: Create an `asyncHandler` middleware to handle promise rejections, removing duplicate try-catch blocks.
- **Comprehensive API Mocks**: Create mock ad servers in the test suite to simulate Meta and Google API responses, allowing developers to test syncing logic offline.
