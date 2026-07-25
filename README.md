# OmniAds Backend API

Welcome to the backend repository of **OmniAds**, the engine powering our AI Agency-in-a-Box operating system.

## 🚀 Overview

This backend is a robust Node.js/Express REST API that handles everything from secure client billing and OAuth integrations to AI creative generation and competitor intelligence.

## ✨ Core Services

- **Authentication Engine**: Secure JWT-based auth with bcrypt password hashing and route protection.
- **Client Onboarding API**: Generates and verifies time-sensitive "Magic Links" for white-labeled client portals.
- **Billing & Stripe (BYOS)**: "Bring Your Own Stripe" architecture allowing agencies to securely store their API keys to bill clients directly.
- **Data Source Ingestion**: Connects to Salesforce, HubSpot, and Snowflake to feed the AI agents.
- **AI Integration Controllers**: Handlers for generating Ad Creatives (DALL-E simulation) and Voice Briefings (ElevenLabs/HeyGen simulation).
- **Competitor Spy Engine**: Endpoints for gathering and analyzing competitor ad spend and angles.

## 🛠️ Tech Stack

- **Server**: Node.js + Express
- **Database**: MySQL managed via Prisma ORM
- **Testing**: Jest + Supertest (Integration & Unit Testing)
- **Security**: Helmet, Express Rate Limit, CORS, JSON Web Tokens

## 🛡️ Testing & Hardening

The backend is fully equipped with an automated testing suite using Jest.
A custom `setup.js` script connects to a dedicated `omniads_test` database and safely truncates all tables before each test run to ensure zero test pollution.

## 📦 Getting Started

1. Clone the repository.
2. Run `npm install`.
3. Configure your `.env` file with your MySQL `DATABASE_URL` and `JWT_SECRET`.
4. Run `npx prisma generate` and `npx prisma db push`.
5. Run `npm run dev` to start the server on port 3000.

### Running Tests

Ensure your local MySQL server is running, then execute:
\`\`\`bash
npx dotenv-cli -e .env.test -- npx prisma db push --accept-data-loss
npm test
\`\`\`