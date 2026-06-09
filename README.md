<div align="center">

# Keyro 🎮

**Marketplace de jeux vidéo et clés digitales**

A full-stack digital game key marketplace built with Node.js, Express, MySQL, and vanilla JavaScript.  
Browse, purchase, and deliver CD keys, gift cards, and shared accounts — all in French.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://labssynova-coder.github.io/keyro-marketplace/)
[![API Docs](https://img.shields.io/badge/API-docs-blue?style=for-the-badge)](https://labssynova-coder.github.io/keyro-marketplace/api.html)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)](./LICENSE)

</div>

---

## 🌐 Live Demos

| Demo | Description | URL |
|------|-------------|-----|
| **Frontend** | Interactive storefront with mock data — browse products, cart, account, wishlist | [labssynova-coder.github.io/keyro-marketplace](https://labssynova-coder.github.io/keyro-marketplace/) |
| **API Docs** | Complete REST API reference with example requests & responses | [labssynova-coder.github.io/keyro-marketplace/api.html](https://labssynova-coder.github.io/keyro-marketplace/api.html) |

> ⚠️ The demos use **mock data** — no real transactions, no real database.

---

## ✨ Features

### Customer Storefront
- 🎮 Product catalog with search, filters (platform, genre, price), and sorting
- 🏷️ Dynamic discount badges and sale pricing
- 🛒 Shopping cart with quantity controls
- ❤️ Wishlist / favorites
- 🔑 Key delivery system — reveal purchased CD keys and shared account credentials
- 💳 Checkout flow with payment reference generation
- 📦 Order history with delivery status tracking
- ⭐ Product reviews and ratings
- 📱 Fully responsive (mobile, tablet, desktop)

### Admin Panel
- 📊 Dashboard with revenue stats, top products, orders by status
- 📦 Product CRUD with image upload and Steam API import
- 🔑 Key/account inventory management per product
- 📋 Order management with status transitions
- 👤 User management (role changes, activation)
- ⭐ Review moderation (approve/decline)
- 🏠 Homepage content editor (hero, featured products)
- 🏷️ Platform and genre management

### Technical
- 🔐 JWT authentication with access + refresh token rotation
- 🔒 AES-256-GCM encryption for product keys at rest
- 🛡️ Helmet CSP, CORS, rate limiting, input validation (Joi)
- 🗄️ MySQL with connection pooling and transaction support
- 🔄 Runtime schema migration (auto-creates missing columns/tables)
- 📡 Steam Store API integration for product data import
- 🎨 Dark gaming theme (Space Grotesk + Inter fonts)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express 4 |
| **Database** | MySQL 8 / MariaDB 10.4+ |
| **Auth** | JSON Web Tokens (access + refresh), bcrypt |
| **Encryption** | AES-256-GCM (product keys at rest) |
| **Validation** | Joi |
| **Security** | Helmet, CORS, express-rate-limit |
| **File Upload** | Multer |
| **Frontend** | Vanilla JavaScript SPA (no framework) |
| **Styling** | Custom CSS with design tokens |

---

## 📁 Project Structure

```
keyro-marketplace/
├── server/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool
│   │   └── env.js             # Environment variable validation
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication middleware
│   │   ├── admin.js           # Admin role check
│   │   ├── validate.js        # Joi validation wrapper
│   │   └── errorHandler.js   # Centralized error handling
│   ├── models/
│   │   ├── user.js            # User CRUD
│   │   ├── product.js         # Product CRUD with filtering
│   │   ├── platform.js        # Platform CRUD
│   │   ├── genre.js           # Genre CRUD
│   │   ├── review.js          # Review CRUD + approval
│   │   ├── cart.js             # Cart operations
│   │   ├── wishlist.js        # Wishlist operations
│   │   ├── order.js           # Order lifecycle + key delivery
│   │   ├── productKey.js      # Key inventory management
│   │   ├── admin.js           # Dashboard statistics
│   │   └── siteSettings.js   # Homepage content config
│   ├── routes/
│   │   ├── auth.js            # /api/auth/*
│   │   ├── products.js        # /api/products/*
│   │   ├── platforms.js       # /api/platforms/*
│   │   ├── genres.js          # /api/genres/*
│   │   ├── reviews.js         # /api/reviews/* + /api/products/:id/reviews
│   │   ├── cart.js            # /api/cart/*
│   │   ├── wishlist.js        # /api/wishlist/*
│   │   ├── orders.js          # /api/orders/*
│   │   ├── productKeys.js     # /api/products/:id/keys/*
│   │   ├── payments.js        # /api/payments/*
│   │   ├── users.js           # /api/users/*
│   │   ├── admin.js           # /api/admin/*
│   │   ├── steam.js           # /api/steam/*
│   │   └── site.js            # /api/site/*
│   ├── utils/
│   │   ├── AppError.js       # Custom error class
│   │   ├── hash.js            # bcrypt password hashing
│   │   ├── token.js           # JWT sign/verify
│   │   ├── pagination.js     # Pagination helpers
│   │   ├── downloadImage.js  # Fetch external images
│   │   ├── secretCrypto.js   # AES-256-GCM encryption
│   │   └── schemaEnsure.js  # Runtime DB migration
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_key_delivery.sql
│   │   ├── 003_site_settings.sql
│   │   └── 004_payments.sql
│   ├── seed.js                # Database seeder
│   └── index.js               # Express app entry point
├── public/
│   ├── css/
│   │   ├── style.css          # Main stylesheet (dark theme)
│   │   └── admin.css          # Admin panel styles
│   ├── js/
│   │   ├── api.js             # API client with auto-refresh
│   │   ├── auth.js            # Authentication state management
│   │   ├── home.js            # Home page rendering
│   │   ├── product.js         # Product detail page
│   │   ├── cart.js            # Cart page
│   │   ├── account.js         # Account/orders/wishlist/settings
│   │   ├── info.js            # Static info pages
│   │   └── app.js             # SPA router + initialization
│   ├── img/products/          # Product images
│   ├── index.html              # Customer-facing SPA
│   └── admin.html             # Admin panel SPA
├── demo/
│   ├── index.html              # Static frontend demo (mock data)
│   └── api.html                # Static API documentation demo
├── .env.example                # Environment template
├── .gitignore
├── package.json
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or later
- **MySQL** 8.0+ or **MariaDB** 10.4+
- **npm** 9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/labssynova-coder/keyro-marketplace.git
cd keyro-marketplace

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials and generate strong JWT secrets
# IMPORTANT: Change JWT_SECRET and JWT_REFRESH_SECRET for production!

# 4. Create the database
mysql -u root -p -e "CREATE DATABASE keyro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Seed the database (creates tables + sample data)
npm run seed

# 6. Start the development server
npm run dev
```

The app is now running at:
- **Storefront:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin.html

### Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@keyro.com | admin123 |
| Customer | jean.dupont@email.com | password123 |

> ⚠️ Change these passwords immediately in any non-local environment.

---

## 📡 API Overview

The API follows REST conventions with JSON payloads. Authentication uses JWT access tokens (15min) with refresh token rotation (7 days).

### Authentication

```
POST   /api/auth/register      # Create account
POST   /api/auth/login         # Login (returns access + refresh tokens)
POST   /api/auth/refresh       # Refresh access token
POST   /api/auth/logout        # Revoke refresh token
GET    /api/auth/me             # Get current user (requires auth)
```

### Products (Public: list/get, Admin: create/update/delete)

```
GET    /api/products            # List with filters & pagination
GET    /api/products/:id        # Get single product
POST   /api/products            # Create (admin, multipart)
PUT    /api/products/:id        # Update (admin, multipart)
DELETE /api/products/:id        # Deactivate (admin)
```

### Key Delivery (Admin only)

```
GET    /api/products/:id/keys          # List keys for product
GET    /api/products/:id/keys/count    # Key inventory counts
POST   /api/products/:id/keys          # Add a key or account
DELETE /api/products/:id/keys/:keyId   # Delete available key
```

### Orders

```
GET    /api/orders              # User's orders
GET    /api/orders/:id          # Order detail (masked keys)
POST   /api/orders/:id/items/:itemId/reveal   # Reveal delivery key
```

### Payments

```
POST   /api/payments/initiate   # Create order from cart
POST   /api/payments/confirm    # Webhook: confirm payment & assign keys
```

### Cart, Wishlist, Reviews, Platforms, Genres, Users, Admin, Steam, Site

See the [interactive API documentation](https://labssynova-coder.github.io/keyro-marketplace/api.html) for complete details on all endpoints including request/response examples.

---

## 🔐 Security

- **JWT Authentication** — Access tokens (15min) + HttpOnly refresh tokens (7d) with rotation
- **Password Hashing** — bcrypt with 12 salt rounds
- **Key Encryption** — AES-256-GCM for product keys and account credentials at rest
- **Helmet** — Content Security Policy, XSS protection, and more
- **CORS** — Configurable origin with credentials support
- **Rate Limiting** — 2000 req/15min general, 20 req/15min for auth endpoints
- **Input Validation** — Joi schemas on all endpoints
- **SQL Injection Prevention** — Parameterized queries throughout
- **XSS Protection** — HTML escaping on the frontend (`escHTML()`)

---

## 🔑 Key Delivery System

Keyro supports two delivery types per product:

| Type | Description |
|------|------------|
| **CD Key** (`key`) | A standard activation key (e.g., `XXXXX-XXXXX-XXXXX`) |
| **Shared Account** (`account`) | Username + password for a shared game account |

### Flow

1. **Admin** adds keys/accounts to product inventory
2. **Customer** adds product to cart and initiates checkout
3. **Payment** is confirmed via webhook (`POST /api/payments/confirm`)
4. System automatically **assigns an available key** from inventory
5. **Customer** reveals the key in their order detail — it's shown masked by default, then fully revealed on click

All keys and credentials are **encrypted at rest** using AES-256-GCM.

---

## 🎨 Theming

Keyro uses a dark gaming aesthetic with CSS custom properties:

```css
:root {
  --bg: #0B0E14;          /* Background */
  --surface: #14171F;      /* Elevated surface */
  --card: #1A1E28;         /* Card background */
  --accent: #E89A2D;       /* Gold accent */
  --fg: #F0F0F2;            /* Primary text */
  --fg-secondary: #B0B6C3;  /* Secondary text */
  --success: #34D399;        /* Success green */
  --danger: #F87171;         /* Error red */
}
```

Fonts: **Space Grotesk** (headings) + **Inter** (body)

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">

**Built with ❤️ by [labssynova-coder](https://github.com/labssynova-coder)**

</div>