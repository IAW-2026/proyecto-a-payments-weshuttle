# WeShuttle - Payments App (Etapa 2)

## Project Overview
This is a Next.js Full-Stack application acting as the **Payments App** for the WeShuttle transportation platform. 
WeShuttle is a scheduled pool service optimizing transport to industrial nodes. This app specifically handles pricing rules, auto-charges using Mercado Pago, transactions, and settlements to drivers.

During "Etapa 2" (Phase 2) of development, this application runs in isolation. **All external API calls to the Rider App, Driver App, and Feedback App must be mocked** to return static data respecting their contracts.

### Main Tech Stack
- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Clerk
- **Payments:** Mercado Pago (Sandbox mode required)
- **Styling:** Tailwind CSS (v4)

## Architecture & Data Model
The Prisma schema (`prisma/schema.prisma`) represents the core domain:
- `PaymentMethod`: Rider's linked payment methods.
- `PayoutAccount`: Driver's accounts to receive settlements.
- `PricingRule`: Rules defining base prices, discounts, and capacity constraints.
- `AutoChargeJob` & `Charge`: Tracking T-1h scheduled charges and individual transaction states.
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
- **Mocking External Dependencies:** As this app works in isolation, external endpoints (e.g., getting passengers from the Rider app, or notifying payment results) must be mocked using stubs or mock `fetch` implementations.
- **Roles:** The app supports three Clerk roles: `rider`, `driver`, and `admin`. Test users are structured under the format `<role>+clerk_test@iaw.com`.
- **Database:** Ensure local development has a PostgreSQL instance running. Use the provided seed script to populate the database with enough mock data to test all use cases (Pricing Rules, Payment Methods, Charges, etc.).
- **Git Flow:** Active development is done on the `develop` branch.
