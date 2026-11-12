# BusGo — Full-Stack Bus Booking Management System

A production-quality full-stack bus booking and transportation management platform designed as a modular monolith using React, Node.js, Express.js, and MongoDB.

BusGo delivers role-based portals for Customers, Bus Operators, and Administrators with high-integrity segment-based seat availability, atomic holds, partial cancellations, and simulated idempotent payments.

---

## 1. Project Overview & Architecture

BusGo is structured as a **Modular Monolith**:
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Lucide Icons, Axios.
- **Backend**: Node.js v22, Express.js v5, Mongoose v9, Helmet, CORS, Cookie Parser, Express Rate Limit, Express Validator.
- **Database**: MongoDB / MongoDB Atlas (18 Collections with compound indexes).
- **Authentication**: JWT authentication with bcrypt password hashing and role-based access control.

### Role Capabilities
1. **Customer**:
   - Search trips by origin, destination, and travel date.
   - Interactive bus seat selection with segment-aware availability.
   - Temporary 10-minute seat holds.
   - Unique PNR ticket confirmation via simulated payment.
   - Partial cancellation at individual passenger/seat level with automated refund computation.
2. **Bus Operator**:
   - Business onboarding with required Administrator approval.
   - Fleet and bus seat layout configuration.
   - Trip scheduling with route stops and timing.
   - Boarding passenger manifests with seat assignments, print view, and CSV export.
   - Fleet seat occupancy auditing and net revenue reconciliation.
   - Strict resource ownership isolation.
3. **Administrator**:
   - Operator vetting and approval/rejection lifecycle.
   - System-wide stop and route network management.
   - Global executive analytics dashboard with date filtering (today, 7 days, 30 days, monthly, custom).
   - Visual charts: booking trends over time, revenue trends, status distribution, bus occupancy overview.
   - Comprehensive reports hub for trip occupancy, bookings master, payment collections, and cancellation refunds with RFC 4180 CSV exports.
   - Audit trail and operational compliance.

---

## 2. Directory Structure

```
busgo/
│
├── frontend/                        # Client-side React Application
│   ├── public/                      # Static assets & favicons
│   ├── src/
│   │   ├── assets/                  # Images, SVGs, logos
│   │   ├── components/              # Modular UI components
│   │   │   ├── common/              # Global shared components
│   │   │   ├── forms/               # Form fields, inputs, validations
│   │   │   ├── navigation/         # Navbars, sidebars, breadcrumbs
│   │   │   └── ui/                  # Badges, modals, cards, skeletons
│   │   ├── layouts/                 # Role-based layouts (Customer, Operator, Admin)
│   │   ├── pages/                   # Application pages
│   │   │   ├── customer/            # Search, seat selection, booking, tickets
│   │   │   ├── operator/            # Fleet, trip schedules, manifests
│   │   │   ├── admin/               # Operator approvals, network master, audit
│   │   │   └── public/              # Home, login, registration, contact
│   │   ├── routes/                  # Protected routes & role routers
│   │   ├── context/                 # Auth & state management contexts
│   │   ├── hooks/                   # Custom reusable React hooks
│   │   ├── services/                # Axios API service layer (api.js)
│   │   ├── utils/                   # Formatting, date, and math helpers
│   │   ├── App.jsx                  # Main application component
│   │   ├── index.css                # Tailwind CSS v4 styling
│   │   └── main.jsx                 # React root mounting
│   ├── .env.example                 # Frontend environment template
│   ├── package.json                 # Frontend dependencies and scripts
│   └── vite.config.js               # Vite configuration with Tailwind plugin
│
├── backend/                         # Server-side Express API
│   ├── config/                      # Database & environment configurations
│   ├── controllers/                 # Route controllers for all domains
│   ├── middleware/                  # Auth, RBAC, error, rate-limiting
│   ├── models/                      # 18 Mongoose database schemas & indexes
│   ├── routes/                      # Express routers
│   ├── services/                    # Business logic (seat inventory, payments)
│   ├── utils/                       # Token helpers, PNR generator, logger
│   ├── validators/                  # Express-validator validation schemas
│   ├── tests/                       # Unit, integration, and concurrency tests
│   ├── server.js                    # Express application entry point
│   ├── .env.example                 # Backend environment template
│   ├── .gitignore                   # Backend ignore rules
│   └── package.json                 # Backend dependencies and scripts
│
├── docs/                            # Project Documentation & Architecture
│   ├── architecture/                # System diagrams & architecture specs
│   ├── Database/                    # ER diagrams, DBML, database design docs
│   ├── api-documentation.md         # REST API documentation & endpoints
│   └── testing-report.md            # Automated testing reports & benchmarks
│
├── README.md                        # Master repository documentation
└── .gitignore                       # Root Git ignore configuration
```

---

## 3. Environment Setup

### Prerequisites
- Node.js >= 20.x (Node v22 recommended)
- npm >= 10.x
- MongoDB (Local instance or MongoDB Atlas connection URI)

### Backend Configuration
Create `backend/.env` from `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```
Default configuration values:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/busgo
JWT_SECRET=busgo_super_secret_jwt_key_2026_production_grade
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
HOLD_EXPIRATION_MINUTES=10
```

### Frontend Configuration
Create `frontend/.env` from `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env
```
Default configuration values:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 4. Running the Application

### Running Backend
```bash
# In the repository root
npm --prefix backend run dev

# Or directly from the backend directory
cd backend
npm run dev
```
Backend API will start at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### Running Frontend
```bash
# In the repository root
npm --prefix frontend run dev

# Or directly from the frontend directory
cd frontend
npm run dev
```
Frontend client will start at: `http://localhost:5173`

---

## 5. Testing Instructions

### Run Backend Tests
```bash
npm --prefix backend test
```

### Run Frontend Build & Lint Verification
```bash
npm --prefix frontend run build
```

---

## 6. Database Principles & Segment Overlap Rule

BusGo uses a segment-based seat inventory model. A single physical seat on a bus can be booked by multiple passengers across non-overlapping journey intervals:

- Stop sequences are represented as half-open intervals: `[fromSequence, toSequence)`.
- An existing allocation and a requested allocation overlap when:
  ```text
  existingFrom < requestedTo AND existingTo > requestedFrom
  ```
- All seat holds and reservations are guarded by atomic conditional operations on the `SeatInventory` document to avoid double bookings.
- Temporary seat holds expire automatically after 10 minutes and are actively verified during every reservation request.

---

## 7. Documentation Links
- [System Architecture Specification](docs/architecture/architecture-overview.md)
- [Logical Database Design](docs/Database/database-design.md)
- [Indexes and Integrity Constraints](docs/Database/indexes-and-constraints.md)
- [Booking and Cancellation Workflows](docs/Database/booking-and-cancellation-workflow.md)
- [API Documentation](docs/api-documentation.md)
- [Testing Report](docs/testing-report.md)

---

## 8. License
ISC License
