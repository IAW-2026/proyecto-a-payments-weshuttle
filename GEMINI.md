# WeShuttle - Payments App (Etapa 3)

## Project Overview
This is a Next.js full-stack application acting as the **Payments App** for the WeShuttle transportation platform.
WeShuttle is a scheduled pool service optimizing transport to industrial nodes. This app handles pricing rules, reservation checkouts, charges, credit balances, credit adjustments, and settlements to drivers.

During **Etapa 3** (Phase 3), the main flows must be described as **integrated flows** across Rider App, Driver App, Payments App, and, when relevant, Feedback App. External APIs are no longer documented as the primary source of mock data.

### Main Tech Stack
- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Clerk
- **Payments:** Mercado Pago (Sandbox mode required)
- **Styling:** Tailwind CSS (v4)

## Architecture & Data Model
The Prisma schema (`prisma/schema.prisma`) represents the core domain:
- `PayoutAccount`: Driver's accounts to receive settlements.
- `PricingRule`: Rules defining base prices, discounts, and capacity constraints.
- `Charge`: Tracking reservation charges and their transaction states.
- `CheckoutSession`: Reservation checkout sessions created by Payments App.
- `CreditAccount` & `CreditMovement`: Credit balances and adjustments granted to riders.
- `PoolPriceFinalizationJob`: T-1h pool final price calculations and credit generation.
- `Settlement`: Funds settled to drivers after trip completion.

## Building and Running
Ensure you have Node.js 20+ and npm 10+.

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio to manage database records
npm run prisma:studio

# Build for production
npm run build
```

The app will run on `http://localhost:3000`.

## Development Conventions
- **Real Integrations First:** For Etapa 3 documentation and expected behavior, main flows should use real inter-app integrations when external apps are available and configured.
- **Mocks Are Not Primary:** Local mocks, demo data, or fallbacks may still exist for development or verification, but they must not be documented as the primary production behavior.
- **Integration Failures:** If another app is unavailable, the expected behavior is a controlled integration error or an unavailable integration state, not silent masking of the failure.
- **Roles:** The app supports three Clerk roles: `rider`, `driver`, and `admin`. Test users are structured under the format `<role>+clerk_test@iaw.com`.
- **Database:** Ensure local development has a PostgreSQL instance running. Use the provided seed script to populate the database with enough representative data to test pricing rules, charges, credits, and settlements.
- **Git Flow:** Active development is done on the `develop` branch.
