# Database Seeder

This folder contains organized seed files for populating the watchlist with default symbols.

## Structure

- `seed-indices.ts` - Indian market indices (NIFTY50, NIFTYMIDCAP, etc.)
- `seed-stocks.ts` - Popular Indian stocks (RELIANCE, TCS, HDFCBANK, etc.)
- `seed-mutual-funds.ts` - Indian mutual funds (scheme codes with names)
- `seed-usa.ts` - USA market symbols (indices and stocks)
- `index.ts` - Main seeder that runs all seed functions

## Usage

### Seed Everything
```bash
npm run db:seed-all
```

### Seed Individual Categories
```bash
# Seed only Indian indices
npm run db:seed-indices

# Seed only Indian stocks
npm run db:seed-stocks

# Seed only mutual funds
npm run db:seed-mf

# Seed only USA market
npm run db:seed-usa
```

## Features

- **Idempotent**: Safe to run multiple times - won't create duplicates
- **Name Updates**: Automatically updates names if they've changed
- **Progress Tracking**: Shows detailed progress and summary statistics
- **Error Handling**: Continues seeding even if individual items fail

## Output

Each seeder provides:
- ✅ Added count
- 🔄 Updated count (for names)
- ⏭️ Skipped count (already exists)
- 📊 Total count

