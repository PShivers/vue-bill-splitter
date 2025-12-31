# Vue Bill Splitter

A modern, feature-rich web application for splitting bills among roommates, built with Vue.js 3, Vuetify, and Node.js/Express backend with SQLite database.

## Features

### Core Functionality
- **Roommate Management**: Add and manage roommates with email addresses
- **Bill Management**: Create and edit bills with names, amounts, and due dates
- **Bill Assignment**: Assign bills to multiple roommates with checkbox selection
- **Automatic Calculations**: Real-time calculation of how much each roommate owes
- **Calendar View**: Visual calendar displaying bills on their due dates

### User Interface
- **Dark Mode**: Toggle between light and dark themes (persists in localStorage)
- **Collapsible Panels**: Three-panel layout (Bills, Calendar, Roommates) with expand/collapse functionality
- **Modal Dialogs**: Clean modal interfaces for adding/editing bills and roommates
- **Click-to-Edit**: Click any bill to open edit modal with inline roommate assignment
- **Material Design Icons**: Using MDI icons throughout the interface
- **Responsive Design**: Optimized for desktop and mobile devices
- **Smooth Animations**: Polished transitions and hover effects

### Advanced Features
- **Optimistic UI Updates**: Instant feedback when adding roommates
- **Soft Deletes**: Bills and roommates are deactivated, not permanently deleted
- **Bill Splitting**: Automatic equal split calculation among assigned roommates
- **Visual Calendar**: Month navigation with bills displayed on due dates

## Project Structure

```
vue-bill-splitter/
├── backend/                 # Node.js/Express API server
│   ├── server.js           # Main server file
│   ├── database.js         # SQLite database setup
│   └── package.json        # Backend dependencies
├── frontend/               # Vue.js application
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── App.vue         # Main app component
│   │   └── main.js         # App entry point
│   ├── index.html          # HTML template
│   ├── vite.config.js      # Vite configuration
│   └── package.json        # Frontend dependencies
└── package.json            # Root package.json with scripts
```

## Installation

1. Clone or download the project
2. Install dependencies:
   ```bash
   cd vue-bill-splitter
   npm run install:all
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
This starts both backend (port 3001) and frontend (port 3000) concurrently.

### Production Mode
```bash
# Build frontend
npm run build

# Start backend only
npm start
```

## API Endpoints

### Roommates
- `GET /api/roommates` - Get all active roommates
- `POST /api/roommates` - Add new roommate
- `DELETE /api/roommates/:id` - Deactivate roommate

### Bills
- `GET /api/bills` - Get all active bills
- `POST /api/bills` - Add new bill
- `DELETE /api/bills/:id` - Deactivate bill

### Assignments
- `GET /api/bills/:billId/assignments` - Get bill assignments
- `POST /api/bills/:billId/assign/:roommateId` - Assign bill to roommate
- `DELETE /api/bills/:billId/assign/:roommateId` - Remove assignment

### Totals
- `GET /api/roommates/totals` - Get all roommate totals
- `GET /api/roommates/:id/total` - Get specific roommate total

## Usage

1. **Add Roommates**: Use the right panel to add roommates
2. **Add Bills**: Use the left panel to create bills with amounts and due dates
3. **Assign Bills**: Use the center panel to assign bills to roommates
4. **View Totals**: See calculated totals for each roommate in the right panel

## Database Schema

### Roommates Table
- `id` - Primary key
- `name` - Roommate name
- `is_active` - Soft delete flag
- `created_at` - Creation timestamp

### Bills Table
- `id` - Primary key
- `name` - Bill name
- `amount` - Bill amount (decimal)
- `due_date` - Due date (optional)
- `is_active` - Soft delete flag
- `created_at` - Creation timestamp

### Bill Assignments Table
- `id` - Primary key
- `bill_id` - Foreign key to bills
- `roommate_id` - Foreign key to roommates
- `created_at` - Creation timestamp

## Technology Stack

- **Frontend**: Vue.js 3, Vite, Axios
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Styling**: CSS3 with responsive design