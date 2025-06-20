# Database Seed Scripts

This directory contains scripts to seed the database with test data for development and testing purposes.

## Available Seed Scripts

### 1. Main Seed Script (`seed.js`)

This script populates the database with essential data for the application to function:

- Chart of Accounts
- Users (admin and regular user)
- Clients
- Projects
- Project Costs
- Billings
- Fixed Assets
- Basic Transactions

**Usage:**

```bash
npm run seed
```

### 2. Transaction Seed Script (`transaction-seed.js`)

This script adds additional transaction data to the database for testing the financial transactions module:

- Income transactions with counter transactions
- Expense transactions with counter transactions
- Transfer transactions

**Usage:**

```bash
npm run seed:transactions
```

## Seeding Process

For a fresh database, follow these steps:

1. First run the main seed script to create the basic data structure:
   ```bash
   npm run seed
   ```

2. Then run the transaction seed script to add more transaction data:
   ```bash
   npm run seed:transactions
   ```

## Generated Data

### Users

- **Admin User**
  - Username: admin
  - Password: admin123
  - Email: admin@example.com

- **Regular User**
  - Username: user
  - Password: user123
  - Email: user@example.com

### Transactions

The transaction seed script generates:
- 20 income transactions (with counter transactions)
- 30 expense transactions (with counter transactions)
- 10 transfer transactions

## Notes

- Running the seed scripts will reset any existing data in the tables they affect
- The transaction seed script requires the main seed script to be run first
- All generated dates are in the past to avoid issues with future dates 