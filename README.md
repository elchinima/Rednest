# ☕ Rednest — Specialty Coffee & Management Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Sass](https://img.shields.io/badge/Styling-SCSS-CC6699?style=flat&logo=sass&logoColor=white)](https://sass-lang.com/)

**Rednest** is a modern, full-stack web application designed for a premium specialty coffee brand. It pairs a rich, interactive customer-facing storefront with a robust ASP.NET Core Clean Architecture backend, administrative analytics suite, and gamified customer loyalty experiences.

---

## 🌟 Key Features

### ☕ Customer Storefront
- **Dynamic Hero & Storytelling**: Video backgrounds, smooth Framer Motion entrance animations, and brand narrative sections.
- **Interactive Coffee Catalog**: Browse and filter specialty coffee roasts, seasonal drinks, desserts, and merchandise with real-time UI state.
- **"Wheel of Fortune" Gamification**: An interactive spinning wheel mini-game for authenticated users with cooldowns and instant promotional rewards.
- **Floating Assist Widgets**: Quick access to Support, "Buy Now" flow, and Fortune game shortcuts.
- **Responsive & Modern UI**: Tailored SCSS design system optimized for all screen sizes.

### 🔐 Authentication & Security
- **Dual Authentication Contexts**: Dedicated client-side contexts for regular users and administrative staff.
- **Secure Token Lifecycle**: JWT tokens delivered via `HttpOnly` and `SameSite=Strict` cookies to safeguard against XSS attacks.
- **Automatic Silent Token Refresh**: Seamless token rotation handling access token expiration without interrupting the user experience.
- **Protected Routing**: Granular route guards on both the React frontend and ASP.NET Core API layers.

### 📊 Admin Portal & Telemetry
- **Administrative Dashboard**: Real-time traffic, session counts, registered user metrics, and promotional code tracking.
- **Database Explorer**: Direct management interface for users, user sessions, promo codes, and entity records.
- **Secure Access**: Passkey/role-verified administrative login flow.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router v7, Framer Motion, Sass / SCSS, Oxlint |
| **Backend** | ASP.NET Core 10.0 (C#), Entity Framework Core, Npgsql, Swashbuckle (Swagger/OpenAPI) |
| **Database & Cloud** | PostgreSQL / Supabase, BCrypt password hashing |
| **Deployment & Containers** | Multi-stage Dockerfile, Nginx reverse proxy, Supervisord process manager |

---

## 📁 Solution Architecture

The codebase is organized into a modular structure following Clean Architecture principles:

```
Rednest New/
├── index.html                   # HTML entry point
├── package.json                 # Frontend dependencies & scripts
├── vite.config.js               # Vite bundler configuration
├── Dockerfile                   # Multi-stage container build (.NET + Vite)
├── nginx.conf                   # Nginx reverse proxy configuration
├── supervisord.conf             # Process control configuration
├── src/                         # Frontend Application (React 19)
│   ├── assets/                  # Icons, brand images, product photos, video
│   ├── components/
│   │   ├── AdminPages/          # Admin login, Dashboard & Database explorer
│   │   ├── Elements/            # Widgets, modals, sticky buttons, scroll utilities
│   │   ├── Footer/              # Global footer component
│   │   ├── PublicPages/         # Home, Catalog, and Auth components
│   │   └── UserPages/           # Authenticated user pages (Fortune Wheel, etc.)
│   ├── context/                 # React Contexts (AuthContext, AdminAuthContext)
│   ├── routes/                  # AppRoutes and route guard middleware
│   ├── styles/                  # SCSS variables, mixins, and design tokens
│   └── utils/                   # Fetch helpers and token interceptors
└── server/                      # Backend Solution (ASP.NET Core 10.0)
    ├── Rednest.Api/             # API Controllers, JWT Middleware, Swagger, Program.cs
    ├── Rednest.Application/     # Application services, Interfaces, DTOs
    ├── Rednest.Core/            # Domain entities (User, Promo, Session models)
    └── Rednest.Infrastructure/  # EF Core AppDbContext, Repositories, Supabase client
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **.NET SDK**: `10.0` or higher
- **PostgreSQL Database** or a [Supabase](https://supabase.com/) project

---

### 1. Environment Configuration

Create a `.env` file in `secret/.env` (or configure corresponding environment variables):

```env
# Database
DB_CONNECTION_STRING=Host=your_host;Port=5432;Database=postgres;Username=postgres;Password=your_password

# Authentication (JWT)
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_ISSUER=RednestApp

# Admin Access
ADMIN_SECRET=your_admin_secret_key

# Supabase API (Optional / Telemetry integration)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

For the frontend during standalone development, you can optionally configure `.env` in the root:

```env
VITE_API_URL=http://localhost:5045
```

---

### 2. Running Locally

#### Run Backend (.NET API)
```bash
cd server/Rednest.Api
dotnet restore
dotnet run
```
> The API will start on `http://localhost:5045` (Swagger UI available at `http://localhost:5045/swagger` in development).

#### Run Frontend (Vite Dev Server)
```bash
# In the project root
npm install
npm run dev
```
> The application will be available at `http://localhost:5173`.

---

### 3. Running with Docker

The project includes a multi-stage `Dockerfile` that builds both the Vite frontend bundle and the .NET 10 Web API into a single unified container image:

```bash
# Build the Docker image
docker build -t rednest-app .

# Run the container
docker run -d -p 8080:8080 --name rednest-container \
  -e DB_CONNECTION_STRING="your_connection_string" \
  -e JWT_SECRET="your_jwt_secret" \
  -e ADMIN_SECRET="your_admin_secret" \
  rednest-app
```
> Access the complete application at `http://localhost:8080`.

---

## 📜 Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Compiles and bundles production frontend assets into `/dist` |
| `npm run lint` | Runs `oxlint` for high-speed code quality checks |
| `npm run preview` | Locally previews the production build |

---

## 🔒 API Endpoints Overview

| Area | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Register a new customer account |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user & issue HttpOnly JWT cookies |
| **Auth** | `POST` | `/api/auth/logout` | Clear auth cookies and revoke session |
| **Auth** | `GET` | `/api/auth/me` | Retrieve authenticated user profile |
| **Auth** | `POST` | `/api/auth/refresh` | Manually rotate access & refresh tokens |
| **Fortune** | `POST` | `/api/auth/fortune/spin` | Spin the wheel and earn reward / promo code |
| **Admin** | `POST` | `/api/admin/login` | Verify administrative secret key |
| **Admin** | `GET` | `/api/admin/stats` | Retrieve site telemetry, metrics, and session statistics |
| **Admin** | `GET` | `/api/admin/database/*` | Direct database explorer and entity query endpoints |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) (or proprietary to Rednest). All rights reserved.
