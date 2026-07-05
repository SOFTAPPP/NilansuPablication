# Production Deployment Guide

This guide details the exact steps required to clone, configure, and deploy the application on a fresh Linux VPS (Virtual Private Server), including setting up the PostgreSQL database (`nilansupublication`).

## 1. Prerequisites (Ubuntu/Debian VPS)

First, update your server and install Node.js, Redis, and PostgreSQL:

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

## 2. Database Setup (`nilansupublication`)

We need to create the database and a dedicated user for the application.

```bash
# Switch to the postgres user
sudo -u postgres psql
```

Inside the PostgreSQL terminal (`postgres=#`), run the following commands:

```sql
-- Create the database
CREATE DATABASE nilansupublication;

-- Update the postgres user password
ALTER USER postgres WITH ENCRYPTED PASSWORD 'Aritradutta@2005';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nilansupublication TO postgres;
ALTER DATABASE nilansupublication OWNER TO postgres;

-- Connect to the new database to create the required extension
\c nilansupublication
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Exit psql
\q
```

## 3. Application Setup

Now, clone the repository and install dependencies.

```bash
# Clone the repository
git clone <repo-url> nilansu-publication
cd nilansu-publication

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cp .env.example .env

# Install client dependencies
cd ../client
npm install
cp .env.example .env
```

## 4. Environment Configuration

Edit the `server/.env` file with your actual production keys. 
Crucially, set your `DATABASE_URL` matching the user and password you created above:

```bash
# Example: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://postgres:Aritradutta%402005@localhost:5432/nilansupublication?schema=public"
JWT_SECRET="generate_a_very_secure_random_string"
NODE_ENV="production"
```

## 5. Migrations & Seeding (Production)

Once your `.env` is configured, apply the database schema and seed the initial data:

```bash
cd ../server

# Generate Prisma Client
npx prisma generate

# Apply all migrations safely to the production database
npx prisma migrate deploy

# Seed the default Categories, Publications, and Admin User
npx prisma db seed
```

> [!WARNING]
> **Never** run `npx prisma migrate dev` or `npx prisma migrate reset` in a production environment. These commands are destructive and can delete your data. Always use `migrate deploy`.

## 6. Build and Start

Build the frontend for production, and start the backend server.

```bash
# Build Frontend
cd ../client
npm run build

# Start the Backend Server (Using PM2 is recommended for production)
cd ../server
npm run build # (if using compiled TS)
npm run start # OR pm2 start index.ts --name "nilansu-backend"
```

---

## Developer Cheatsheet

### Local Development Commands
```bash
# Start backend in dev mode
cd server && npm run dev

# Start frontend in dev mode
cd client && npm run dev

# Create a new migration after modifying schema.prisma
npx prisma migrate dev --name <descriptive_name>

# Reset local database (WARNING: DELETES ALL DATA)
npx prisma migrate reset

# Open Prisma Studio (GUI Database Editor)
npx prisma studio
```

### Production Maintenance Commands
```bash
# Check database migration status
npx prisma migrate status

# Deploy pending migrations
npx prisma migrate deploy
```

### Database Backup and Restore
Production databases must be backed up regularly.

**To Create a Backup:**
```bash
# Dumps the entire database into a backup.sql file
pg_dump "postgresql://postgres:Aritradutta%402005@localhost:5432/nilansupublication?schema=public" > backup.sql
```

**To Restore a Backup:**
```bash
# Restores the backup.sql file into the database
psql "postgresql://postgres:Aritradutta%402005@localhost:5432/nilansupublication?schema=public" < backup.sql
```
