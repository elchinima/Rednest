# ☕ Rednest — Specialty Coffee & Management Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Sass](https://img.shields.io/badge/Styling-SCSS-CC6699?style=flat&logo=sass&logoColor=white)](https://sass-lang.com/)

**Rednest** is a modern, full-stack web application designed for a premium specialty coffee brand. It pairs an engaging customer-facing storefront with a robust ASP.NET Core Clean Architecture backend, customer loyalty system, interactive checkout & order tracking, and an administrative telemetry suite.

---

## 🌟 Key Features

### ☕ Customer Storefront & Catalog
- **Dynamic Hero & Narrative**: High-resolution video background, smooth Framer Motion animations, and storytelling sections.
- **Interactive Coffee Catalog (`/catalog`)**: Browse specialty coffees, signature drinks, desserts, and bakery goods categorized in real-time.
- **Persistent Shopping Basket (`/basket`)**: Real-time basket synchronization between client and server via `BasketContext` and PostgreSQL `jsonb` storage.

### 💳 Checkout & Payment System (`/order`)
- **Dual Payment Channels**: Choose between **In-Store Cashier** (Cash, Card/NFC) and **Pay Online**.
- **Online Payment Modal**: Support for **Stripe**, **Rednest Account Balance**, **Visa / Mastercard**, and **Google Pay**.
- **Promotional Discounts**: Automatic promo code deduction (Discounts up to 50%, Super Prizes, Free Drinks/Desserts).
- **Flexible Order Schema**: Structured order entities with `Items`, `Payment`, and `Notes` JSONB columns.

### 📦 Orders & Digital Receipts (`/orders`)
- **Real-Time Order Tracking**: Order statuses including *Pending Payment*, *Preparing*, *Ready for Pickup*, *Completed*, and *Cancelled*.
- **Interactive Receipt Modal**: Digital receipt breakdown with items, discount calculations, payment details, and Baku timestamp.
- **One-Click Reorder**: Quickly re-populate the basket from any previous order receipt.

### 🎡 Gamification & Loyalty (`/fortune`, `/promos`)
- **"Wheel of Fortune" Game**: Interactive spinning wheel mini-game for authenticated users with cooldown timer and prize animations.
- **Promos Vault**: Manage active and past promotional rewards, complete with generated barcodes and redemption codes.

### 👤 Profile & Session Management (`/profile`)
- **Avatar Management**: Upload and interactive image cropper modal with client-side WebP compression and Supabase Storage integration.
- **Security & Password**: Secure BCrypt-based password updates with validation modals.
- **Active Sessions Manager**: Inspect connected devices, operating systems, client hints, and geo-located login IPs with remote session revocation.

### 🔐 Authentication, Security & Reliability
- **Dual Authentication**: Independent contexts for customer accounts and administrative management.
- **Secure Token Lifecycle**: JWT authentication with automatic silent token refresh, singleton race-condition prevention, and cold-start retry mechanisms.
- **Security & Throttling**: Partitioned rate limiting (IP / User-based) with HTTP 429 `Retry-After` headers and bandwidth throttling middleware.

### 📊 Admin Portal & Storage Management (`/admin`)
- **Administrative Dashboard**: Metrics for active sessions, user registrations, and loyalty redemptions.
- **Media & File Explorer**: Directly upload, browse, preview, and delete WebP assets stored in Supabase Storage buckets.
- **Database Explorer**: Query and inspect users, orders, and system entities.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router v7, Framer Motion, Sass / SCSS, Oxlint |
| **Backend** | ASP.NET Core 10.0 (C#), Entity Framework Core, Npgsql (Dynamic JSON), Swagger / OpenAPI |
| **Image Processing** | SixLabors.ImageSharp (WebP encoding & resizing) |
| **Database & Storage** | PostgreSQL (Supabase), Supabase Storage |
| **Security** | JWT Bearer, BCrypt.Net, ASP.NET Core RateLimiter |
| **Deployment** | Multi-stage Dockerfile, Nginx reverse proxy, Render Web Services |

---

## 📁 Solution Architecture

```
Rednest/
├── index.html                   # HTML entry point
├── package.json                 # Frontend dependencies & build scripts
├── vite.config.js               # Vite bundler configuration
├── Dockerfile                   # Multi-stage container build (.NET + Vite)
├── nginx.conf                   # Nginx reverse proxy configuration
├── supervisord.conf             # Process control configuration
├── src/                         # Frontend Application (React 19)
│   ├── assets/                  # Icons, brand images, product photos, video
│   ├── components/
│   │   ├── AdminPages/          # Admin login, Database & Storage explorer
│   │   ├── Elements/            # Modals, AnimatedModalWrapper, UserNavPills, Widgets
│   │   ├── Footer/              # Global footer component
│   │   ├── PublicPages/         # Home, Catalog, Auth modals, Error pages
│   │   └── UserPages/           # Profile, Orders, Order Checkout, Promos, Fortune
│   ├── context/                 # AuthContext, AdminAuthContext, BasketContext
│   ├── routes/                  # AppRoutes and route guards
│   ├── styles/                  # SCSS variables, mixins, and design tokens
│   └── utils/                   # fetchWithRefresh, rateLimitInterceptor, clientHints
└── server/                      # Backend Solution (ASP.NET Core 10.0)
    ├── Rednest.Api/             # Controllers, Middleware, Swagger, Program.cs
    ├── Rednest.Application/     # Application interfaces, DTOs
    ├── Rednest.Core/            # Domain entities (User, Order, Basket, Product, Promo)
    └── Rednest.Infrastructure/  # EF Core AppDbContext, Migrations, Repositories, Services
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **.NET SDK**: `10.0` or higher
- **PostgreSQL Database** (e.g., Supabase)

---

### 1. Environment Configuration

Create a `.env` file in `secret/.env` (or set environment variables on your deployment platform):

```env
# Database Connection
DB_CONNECTION_STRING=Host=your_host;Port=5432;Database=postgres;Username=postgres;Password=your_password

# Authentication (JWT)
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_ISSUER=RednestApp

# Admin Secret
ADMIN_SECRET=your_admin_secret_key

# Supabase Storage Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Stripe Payments & Frontend (Vite)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### 2. Database Migrations

Apply the latest Entity Framework Core migrations to your database:

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
> API starts on `http://localhost:5045` (Swagger UI at `http://localhost:5045/swagger`).

#### Run Frontend (Vite Dev Server)
```bash
# In the project root
npm install
npm run dev
```
> Web application starts on `http://localhost:5173`.

---

### 4. Running with Docker

Build and run the unified single-container image (.NET + Vite + Static Assets):

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
  rednest-app
```
> Access the complete application at `http://localhost:8080`.

---

## 📜 Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite development server with Hot Module Replacement (HMR) |
| `npm run build` | Compiles and bundles production frontend assets into `/dist` |
| `npm run lint` | Runs `oxlint` for lightning-fast code quality checks |
| `npm run preview` | Locally previews the production build |

---

## 🔒 API Endpoints Overview

| Area | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Authenticate / register user & issue secure cookies |
| **Auth** | `POST` | `/api/auth/logout` | Clear cookies & terminate active session |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile & balance |
| **Auth** | `POST` | `/api/auth/refresh` | Rotate access & refresh tokens |
| **Auth** | `PUT` | `/api/auth/name` | Update user display name |
| **Auth** | `POST` | `/api/auth/change-password` | Update account password |
| **Auth** | `GET` | `/api/auth/sessions` | List active device & browser sessions |
| **Auth** | `POST` | `/api/auth/sessions/{id}/revoke` | Revoke a specific session |
| **Auth** | `POST` | `/api/auth/profile/picture` | Upload & optimize avatar to Supabase |
| **Auth** | `DELETE` | `/api/auth/profile/picture` | Remove user profile picture |
| **Promos** | `GET` | `/api/auth/promo` | Retrieve current active promotional reward |
| **Promos** | `GET` | `/api/auth/promos` | Retrieve all user promo rewards history |
| **Promos** | `POST` | `/api/auth/promo` | Save / spin a new promotional reward |
| **Basket** | `GET` | `/api/basket` | Fetch current user's basket items |
| **Basket** | `POST` | `/api/basket/add` | Add product to basket |
| **Basket** | `POST` | `/api/basket/remove` | Decrement item quantity in basket |
| **Basket** | `DELETE` | `/api/basket/delete/{productId}` | Remove item completely from basket |
| **Basket** | `POST` | `/api/basket/sync` | Synchronize local basket state with server |
| **Products** | `GET` | `/api/products` | Retrieve categorized products catalog |
| **Orders** | `POST` | `/api/orders/cashier` | Place order (Cashier / Online Payment methods) |
| **Orders** | `GET` | `/api/orders/active` | Get active pending / preparing order |
| **Orders** | `GET` | `/api/orders/history` | Get complete customer order history |
| **Admin** | `POST` | `/api/admin/login` | Authenticate admin via passkey |
| **Admin** | `POST` | `/api/admin/logout` | Terminate admin session |
| **Admin** | `GET` | `/api/admin/verify` | Verify admin authentication status |
| **Admin** | `GET` | `/api/admin/files` | List media files from Supabase bucket |
| **Admin** | `POST` | `/api/admin/upload` | Upload & convert image to WebP |
| **Admin** | `DELETE` | `/api/admin/files/{fileName}` | Delete media asset from Supabase |
