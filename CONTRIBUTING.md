# Contributing to Keyro

Thank you for your interest in contributing to Keyro! This guide will help you get started.

## Development Setup

1. **Prerequisites**
   - Node.js 18+ and npm
   - MySQL 8.0+ or MariaDB 10.4+

2. **Clone and install**
   ```bash
   git clone https://github.com/labssynova-coder/keyro-marketplace.git
   cd keyro-marketplace
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials and generate JWT secrets
   ```

4. **Create the database and seed**
   ```bash
   # Create the MySQL database
   mysql -u root -e "CREATE DATABASE keyro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   
   # Run the seed script (creates tables and sample data)
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000`  
   Admin panel: `http://localhost:3000/admin.html`

## Project Structure

```
Keyro/
├── server/
│   ├── config/          # DB pool and env config
│   ├── middleware/       # Auth, admin, validation, error handler
│   ├── models/          # Data access layer (one per entity)
│   ├── routes/          # Express routers (REST API)
│   ├── utils/           # Helpers (hash, token, pagination, crypto)
│   ├── migrations/      # SQL schema files
│   ├── seed.js           # Database seeder
│   └── index.js          # Express app entry point
├── public/
│   ├── css/             # Stylesheets
│   ├── js/              # Frontend JS modules (SPA)
│   ├── img/             # Static assets
│   ├── index.html        # Customer-facing SPA
│   └── admin.html       # Admin panel SPA
├── demo/                # Static demo pages for GitHub Pages
└── package.json
```

## Code Style

- **Backend:** CommonJS modules (`require`/`module.exports`), async/await, consistent error handling with `AppError`
- **Frontend:** Vanilla JS, global functions (no bundler), `escHTML()` for XSS protection
- **Naming:** camelCase for JS, snake_case for DB columns, kebab-case for files
- **Validation:** Joi schemas for all API inputs
- **CSS:** BEM-like classes, CSS custom properties for theming

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, descriptive commit messages
4. Ensure no secrets are committed (use `.env.example` for new env vars)
5. Test your changes locally
6. Push to your fork and open a Pull Request against `main`

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce, expected behavior, and actual behavior
- Mention your Node.js and MySQL versions

## Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, contact the maintainers privately.

## Demo Credentials

For local development and testing:
- **Admin:** admin@keyro.com / admin123
- **Customer:** jean.dupont@email.com / password123

⚠️ **Never use these credentials in production.** Always generate strong, unique secrets.