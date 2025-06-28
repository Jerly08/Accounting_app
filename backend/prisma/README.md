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

### 3. WIP Seed Script (`wip-seed.js`)

This script generates comprehensive Work-In-Progress (WIP) data for demonstration and presentation purposes:

- Historical WIP data for existing projects (last 6 months)
- WIP cashflow projections for the next 6 months
- Three specialized demo projects with different WIP patterns:
  - High WIP Construction Project (large unbilled work)
  - Risky Geotechnical Survey (high risk score)
  - Well-Managed Soil Testing (declining WIP with regular billing)

**Usage:**

```bash
npm run seed:wip
```

### 4. WIP Transaction Seed Script (`wip-transaction-seed.js`)

This script creates the necessary accounting transactions for WIP data to ensure the balance sheet remains balanced:

- Creates WIP Asset account entries (debit)
- Creates Revenue Recognition entries (credit)
- Handles Advance from Customers (negative WIP)
- Ensures proper double-entry accounting for all WIP values

**Usage:**

```bash
npm run seed:wip-transactions
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

3. Run the WIP seed script to generate comprehensive WIP data for presentations:
   ```bash
   npm run seed:wip
   ```

4. Finally, run the WIP transaction seed to create accounting entries for WIP and balance the balance sheet:
   ```bash
   npm run seed:wip-transactions
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

### WIP Data

The WIP seed script generates:
- Historical WIP data for all projects (monthly entries for the past 6 months)
- Future WIP projections (monthly for the next 6 months)
- Three demo projects with distinct WIP characteristics for presentation purposes

## Notes

- Running the seed scripts will reset any existing data in the tables they affect
- The transaction seed script requires the main seed script to be run first
- The WIP seed script can be run independently but works best after the main seed script
- The WIP transaction seed script should be run after the WIP seed script to ensure accounting balance
- All generated dates are in the past to avoid issues with future dates 