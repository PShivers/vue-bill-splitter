# RoomieSplit · Vue Bill Splitter

A modern, full-featured web application for tracking household expenses and splitting bills among roommates, built with Vue.js 3, Vuetify icons, and a Node.js/Express SQLite backend.

## Features

### Core Functionality

- **Roommate Management**: Add and manage roommates with names and emails
- **Bill Management**: Create and edit bills with names, amounts, due dates, categories, and notes
- **Atomic Bill Assignment**: Assign bills to multiple roommates with atomic batch persistence
- **Share Settlement**: Mark individual roommate shares as Paid or Unpaid, updating balances in real time
- **Roommate Itemized Ledger**: Click any roommate to view all their assigned bills, share breakdowns, and settle shares with one tap
- **Visual Monthly Calendar**: Interactive calendar displaying bills on their exact local due dates with monthly summary totals and click-to-add
- **KPI Metrics Dashboard**: Live header indicators tracking total bills, total amount, outstanding balance, and bills due soon

### User Interface & Experience

- **Curated Category System**: Rent, Utilities, Electricity, Water, Internet, Groceries, Entertainment, and Other with custom badges and icons
- **Search & Filters**: Search bills by keyword and filter by status (All, Pending, Settled) or category
- **Toast Notifications**: Non-blocking toast alerts for instant feedback on all user actions
- **Dark Mode**: High-contrast, sleek dark mode toggle persisting across sessions in `localStorage`
- **Collapsible Panels**: Three-panel desktop layout (Bills, Calendar, Roommates) optimized for both desktop and mobile
- **Polished Typography**: Modern typography using Google Fonts (Inter & Outfit)

## Project Structure

```
vue-bill-splitter/
├── backend/
│   ├── database.js          # SQLite database with WAL mode and auto-migrations
│   ├── server.js            # Express API server with batch assignment and settlement
│   ├── package.json         # Backend dependencies & test scripts
│   └── tests/
│       └── api.test.js      # Automated unit and integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BillPanel.vue           # Bills list, search, filters & add modal
│   │   │   ├── CalendarPanel.vue       # Month calendar with click-to-add
│   │   │   ├── RoommatePanel.vue       # Roommates list, totals & delete confirm
│   │   │   ├── RoommateDetailModal.vue # Itemized bills ledger & share settlement
│   │   │   ├── EditBillModal.vue       # Bill editing & whole-bill settle toggle
│   │   │   └── ToastNotification.vue   # Reusable feedback toast stack
│   │   ├── App.vue          # Main layout, header KPI chips, and state manager
│   │   └── main.js          # Vue app bootstrap & Vuetify icons
│   ├── index.html           # HTML template with modern typography
│   ├── vite.config.js       # Vite configuration
│   └── package.json         # Frontend dependencies
└── package.json             # Root npm scripts
```

## Getting Started

### Installation

```bash
npm run install:all
```

### Running Locally (Development)

```bash
npm run dev
```

Starts the Express backend on `http://localhost:3001` and Vite frontend on `http://localhost:3000`.

### Running Tests

```bash
npm --prefix backend test
```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Roommates
- `GET /api/roommates` - Get all active roommates
- `POST /api/roommates` - Add roommate (`{ name, email }`)
- `DELETE /api/roommates/:id` - Deactivate roommate
- `GET /api/roommates/:id/breakdown` - Get itemized bill ledger for a roommate
- `GET /api/roommates/totals` - Get totals owed and settled for all roommates
- `GET /api/roommates/:id/total` - Get specific roommate totals

### Bills
- `GET /api/bills` - Get all active bills with assigned roommates
- `POST /api/bills` - Create bill with atomic assignments (`{ name, amount, due_date, category, notes, roommate_ids }`)
- `PUT /api/bills/:id` - Update bill and synchronise assignments
- `DELETE /api/bills/:id` - Deactivate bill
- `POST /api/bills/:id/toggle-settled` - Mark entire bill settled/unsettled

### Assignments & Share Settlement
- `GET /api/bills/:billId/assignments` - Get bill assignments
- `POST /api/bills/:billId/assign/:roommateId` - Assign roommate to bill
- `DELETE /api/bills/:billId/assign/:roommateId` - Remove assignment
- `POST /api/bills/:billId/assignments/:roommateId/toggle-paid` - Toggle individual share payment

### Dashboard Stats
- `GET /api/stats` - Get summary KPI metrics (total bills, total amount, outstanding, settled, due soon)