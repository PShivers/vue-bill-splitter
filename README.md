# Vue Bill Splitter

A modern web application for splitting bills among roommates, built with Vue.js frontend and Node.js/Express backend with SQLite database.

## Features

- **Roommate Management**: Add and manage roommates
- **Bill Management**: Create bills with names, amounts, and due dates
- **Bill Assignment**: Assign bills to specific roommates
- **Automatic Calculations**: View how much each roommate owes
- **Responsive Design**: Works on desktop and mobile devices

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