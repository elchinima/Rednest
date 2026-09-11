# ☕ Rednest — Specialty Coffee & Management Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Sass](https://img.shields.io/badge/Styling-SCSS-CC6699?style=flat&logo=sass&logoColor=white)](https://sass-lang.com/)

**Rednest** is a modern, enterprise-grade full-stack web platform designed for a premium specialty coffee brand. It seamlessly pairs an engaging, cinematic customer storefront with an ASP.NET Core 10 Clean Architecture backend, an interactive gamified customer loyalty ecosystem, end-to-end checkout & order tracking, comprehensive profile security, and a full administrative management and telemetry suite.

---

## 🌟 Key Features

### ☕ Customer Storefront & Interactive Catalog
- **Cinematic Experience**: High-definition video hero, fluid Framer Motion animations, storytelling brand narrative, and responsive modern layout.
- **Dynamic Coffee Catalog (`/catalog`)**: Browse specialty roasts, signature drinks, artisan desserts, and bakery goods categorized with real-time filtering and pricing.
- **Persistent Shopping Basket (`/basket`)**: Real-time basket synchronization between client and server via `BasketContext` and PostgreSQL dynamic `jsonb` storage.
- **Interactive Global Widgets**: Floating quick checkout (`BuyNowWidget`), Wheel of Fortune shortcut (`FortuneWidget`), live support modal (`SupportWidget`), and smooth scroll-to-top helper.

### 💳 Checkout & Multi-Channel Payments (`/order`)
- **Flexible Payment Methods**: Choose between **In-Store Cashier** (Cash, Physical Card / NFC) and **Pay Online**.
- **Integrated Payment Gateway**: Support for **Stripe Elements**, **Rednest Account Balance**, **Visa / Mastercard**, **Apple Pay**, and **Google Pay**.
- **Encrypted Saved Payment Methods (`/payment-methods`)**: Securely manage saved credit/debit cards protected by AES-256 server-side encryption.
- **Promotional Discounts**: Automatic promo code redemption with instant calculations (discounts up to 50%, free drinks, desserts, and super prizes).

### 📦 Orders & Digital Receipts (`/orders`)
- **Real-Time Order Tracking**: Order fulfillment tracking across statuses (*Pending Payment*, *Preparing*, *Ready for Pickup*, *Completed*, and *Cancelled*).
- **Interactive Digital Receipts**: Detailed receipt modals breakdown with individual items, applied promo deductions, payment metadata, and Baku timestamp.
- **One-Click Reorder**: Instantly re-populate the shopping basket directly from any past order receipt.

### 📍 Addresses & Delivery Preferences (`/addresses`)
- **Multiple Saved Addresses**: Add, edit, remove, and label primary delivery destinations (home, office, apartment, delivery notes).
- **Default Address Selection**: One-click selection of default shipping/pickup address for streamlined checkout.

### 🎡 Gamification & Loyalty Rewards (`/fortune`, `/promos`)
- **"Wheel of Fortune" Mini-Game (`/fortune`)**: Interactive spinning wheel with cooldown timers, prize animations, and direct voucher issuing to authenticated users.
- **Promos Vault (`/promos`)**: Manage active and redeemed promotional rewards, complete with generated barcodes and redemption codes.

### ⭐ Public Reviews & AI Moderation (`/review`, `/reviews`)
- **Community Testimonials**: Leave verified ratings, detailed feedback, and review stories.
- **Automated AI Moderation**: Background moderation service (`ReviewModerationService`) powered by LLM models to analyze content sentiment, filter spam, and ensure high-quality community standards.

### 👤 Profile & Enhanced Account Security (`/profile`)
- **Profile Security Guard (`ProfileSecurityGuard`)**: Sensitive operations and user pages (addresses, payment methods, profile settings, sessions) require temporary security verification via `ProfilePasswordModal`.
- **Avatar Customization**: Interactive crop tool with client-side WebP compression and direct Supabase Storage bucket integration.
- **Active Sessions Explorer (`/sessions`)**: Inspect connected devices, operating systems, client hints, IP geo-locations, and remotely revoke untrusted sessions.
- **Security Credentials**: Secure BCrypt-based password updates with confirmation modals.

### 🔐 Authentication & Security Infrastructure
- **Dual Independent Auth Systems**: Isolated authentication flows and security contexts for customer accounts (`AuthContext`) and administrative management (`AdminAuthContext`).
- **Google OAuth 2.0 Integration (`/google-auth`)**: Seamless single sign-on (SSO) with Google credentials, automatic profile creation, and account linking.
- **Silent JWT Token Rotation**: Automatic token refresh via secure `HttpOnly` cookies, race-condition mitigation, and transient failure retries.
- **Rate Limiting & Throttling**: Partitioned rate limiter (per-IP and per-authenticated-user) with HTTP 429 `Retry-After` headers and bandwidth throttling middleware.
- **Client Hints & Geo-Location**: Detailed client telemetry parsing (platform version, device model, user agent) paired with IP geolocation lookups.

### 📊 Comprehensive Admin Management Suite (`/admin`)
- **Executive Telemetry Dashboard (`/admin/dashboard`)**: Key performance indicators, active session counts, registration trends, revenue metrics, and email dispatch stats.
- **Product & Menu Management (`/admin/products`)**: Create, edit, and organize catalog items, pricing, categories, and inventory statuses.
- **Order Management & Processing (`/admin/orders`)**: Real-time overview of customer orders with live status updates and fulfillment workflow.
- **Promotions & Campaign Desk (`/admin/promos`)**: Configure loyalty vouchers, discount codes, and Wheel of Fortune reward distributions.
- **User Administration & RBAC (`/admin/users`)**: Inspect registered customers and assign role-based permissions (`Customer`, `Admin`, `Superadmin`, `AI`).
- **Database & Media Storage Explorer (`/admin/database`)**: Query system entities and manage media assets stored in Supabase buckets with instant WebP previews.
- **Newsletter & Brevo Email Campaigns (`/admin/newsletter`)**: Create and dispatch marketing or transactional emails, track delivery metrics, and manage subscriptions.
- **Review Moderation Hub (`/admin/reviews`)**: Review, approve, reject, or delete submitted community reviews.
- **Audit & Security Logs (`/admin/logs`)**: Comprehensive audit trail of administrative actions and security events.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router v7, Framer Motion, Sass / SCSS, Oxlint |
| **Backend** | ASP.NET Core 10.0 (C#), Entity Framework Core 10, Npgsql (Dynamic JSON), Swagger / OpenAPI |
| **Payments** | Stripe Elements (`@stripe/react-stripe-js`), AES-256 Encrypted Payment Storage |
| **Authentication** | JWT Bearer (Silent Cookie Rotation), Google OAuth 2.0, BCrypt.Net |
| **Database & Storage** | PostgreSQL (Supabase), Supabase Storage Buckets |
| **Email Service** | Brevo (Sendinblue) Transactional & Newsletter API |
| **AI & Automation** | Background Review Moderation Service (LLM), Keep-Alive Service, Analytics Tracker |
| **Security & Middleware** | ASP.NET Core RateLimiter (Partitioned), Bandwidth Throttling, Client Hints Parser |
| **Deployment** | Multi-stage Docker container (.NET 10 + Node 20), Render |

---

## 📁 Solution Architecture

```
Rednest/
├── index.html                   # HTML entry point
├── package.json                 # Frontend dependencies & build scripts
├── vite.config.js               # Vite bundler configuration
├── Dockerfile                   # Multi-stage container build (.NET 10 + Vite 8)
├── src/                         # Frontend Application (React 19)
│   ├── assets/                  # Brand imagery, video backgrounds, product icons
│   ├── components/
│   │   ├── AdminPages/          # Admin suite (Dashboard, Products, Orders, Promos, Users, Database, Newsletter, Reviews, Logs)
│   │   ├── Elements/            # Widgets (BuyNow, Fortune, Support), Modals, UserNavPills, ProfilePasswordModal
│   │   ├── Footer/              # Dynamic footer component
│   │   ├── PublicPages/         # Home, Catalog, Basket, Auth, GoogleAuth, Reviews, Rules, ErrorPage
│   │   └── UserPages/           # Profile, Orders, Order Checkout, Addresses, PaymentMethods, Promos, Fortune, Reviews, Sessions
│   ├── context/                 # AuthContext, AdminAuthContext, BasketContext, ProfileSecurityContext
│   ├── routes/                  # AppRoutes, ProtectedRoute, AdminProtectedRoute, ProfileSecurityGuard
│   ├── styles/                  # SCSS tokens, variables, mixins, glassmorphism themes
│   └── utils/                   # fetchWithRefresh, rateLimitInterceptor, clientHints
└── server/                      # Backend Solution (ASP.NET Core 10.0)
    ├── Rednest.Api/             # Controllers, Middleware, Swagger, Program.cs
    │   ├── Controllers/         # Addresses, Admin, Auth, Basket, Orders, PaymentMethods, Products, Reviews
    │   ├── Helpers/             # SecurityVerificationHelper, Client hints helpers
    │   └── Middleware/          # BandwidthThrottlingMiddleware
    ├── Rednest.Application/     # Application interfaces, DTOs, contracts
    ├── Rednest.Core/            # Domain entities (User, Order, Basket, Product, Promo, Review, Analytics, etc.)
    └── Rednest.Infrastructure/  # EF Core AppDbContext, Migrations, Repositories, Background Services
        ├── Data/                # AppDbContext & entity configurations
        ├── Migrations/          # Entity Framework Core database migrations
        ├── Repositories/        # Data access implementations (UserRepository, etc.)
        └── Services/            # AuthService, BrevoEmailService, GeoLocationService, PaymentEncryptionService, ReviewModerationService, KeepAliveService, AnalyticsTrackingService
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **.NET SDK**: `10.0` or higher
- **PostgreSQL Database** (e.g., Supabase)

---

### 1. Environment Configuration

Create a `.env` file in `secret/.env` (or configure environment variables in your deployment dashboard):

```env
# Database Connection (PostgreSQL / Supabase)
DB_CONNECTION_STRING=Host=your_host;Port=5432;Database=postgres;Username=postgres;Password=your_password

# Authentication (JWT)
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_ISSUER=RednestApp

# Admin Secret Passkey
ADMIN_SECRET=your_admin_secret_key

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/google-auth

# Supabase Storage Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Stripe Payments & Frontend Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Payment Data Encryption (AES-256)
PAYMENT_ENCRYPTION_KEY=your_32_character_encryption_key

# Brevo (Sendinblue) Email Service
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@domain.com
BREVO_SENDER_NAME=Rednest Coffee

# AI Review Moderation (Optional)
REVIEW_AI_API=your_llm_api_key
REVIEW_AI_MODEL=gemma-4-31b-it

# Application Base URL
BASE_URL=http://localhost:5173
```

---

### 2. Database Migrations

Apply the latest Entity Framework Core migrations to your PostgreSQL database:

```bash
cd server
dotnet ef database update --project Rednest.Infrastructure --startup-project Rednest.Api
```

---

### 3. Running Locally

#### Run Backend (.NET API)
```bash
cd server/Rednest.Api
dotnet restore
dotnet run
```
> API starts on `http://localhost:5045` (Swagger UI available at `http://localhost:5045/swagger`).

#### Run Frontend (Vite Dev Server)
```bash
# In the project root
npm install
npm run dev
```
> Web application starts on `http://localhost:5173`.

---

### 4. Running with Docker

Build and run the unified single-container image (.NET 10 + Vite 8 + Static Assets):

```bash
# Build the Docker image
docker build -t rednest-app .

# Run the container
docker run -d -p 8080:8080 --name rednest-container \
  -e DB_CONNECTION_STRING="your_connection_string" \
  -e JWT_SECRET="your_jwt_secret" \
  -e ADMIN_SECRET="your_admin_secret" \
  -e SUPABASE_URL="your_supabase_url" \
  -e SUPABASE_SERVICE_KEY="your_supabase_key" \
  -e STRIPE_SECRET_KEY="your_stripe_secret" \
  -e PAYMENT_ENCRYPTION_KEY="your_payment_encryption_key" \
  -e BREVO_API_KEY="your_brevo_api_key" \
  rednest-app
```
> Access the complete application at `http://localhost:8080`.
