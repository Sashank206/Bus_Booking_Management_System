# BusGo API Documentation

## 1. Overview
The BusGo API is a RESTful API built on Express 5. All endpoints communicate using standard JSON payloads, status codes, and centralized error responses.

Base URL (Development): `http://localhost:5000/api`

## 2. Standard Response Structure
Successful responses adhere to:
```json
{
  "status": "success",
  "data": { ... }
}
```

Error responses adhere to:
```json
{
  "status": "fail" | "error",
  "message": "Human-readable error explanation",
  "errors": [ ... ]
}
```

## 3. Core Planned Endpoints

### 3.1 Health & System
- `GET /api/health` - Server connectivity and uptime verification.

### 3.2 Authentication & Profile
- `POST /api/auth/register` - Customer registration.
- `POST /api/auth/operator-register` - Operator business registration.
- `POST /api/auth/login` - Secure login (JWT in HTTP-only cookie or Bearer token).
- `POST /api/auth/logout` - Invalidate session / clear token cookie.
- `GET /api/auth/me` - Authenticated user identity and active role profile.

### 3.3 Trips & Segment Seat Search
- `GET /api/trips/search?from=StopA&to=StopB&date=YYYY-MM-DD` - Search available trips for given segment.
- `GET /api/trips/:tripId` - Trip schedule, route stops, and timing.
- `GET /api/trips/:tripId/seats?fromStopId=...&toStopId=...` - Segment-based seat availability map.

### 3.4 Booking & Atomic Holds
- `POST /api/bookings/holds` - Acquire atomic 10-minute temporary seat hold.
- `POST /api/bookings` - Create pending booking with passenger information and unique PNR.
- `GET /api/bookings/my-bookings` - Customer booking history.
- `GET /api/bookings/:bookingId` - Detailed booking view.
- `GET /api/bookings/:bookingId/ticket` - Printable / exportable ticket.

### 3.5 Simulated Payments
- `POST /api/payments/simulate` - Simulated payment execution with idempotency key.
- `GET /api/payments/:paymentId` - Payment receipt and status.

### 3.6 Partial Cancellations & Refunds
- `POST /api/bookings/:bookingId/cancellations` - Partial passenger/seat cancellation request.
- `GET /api/bookings/:bookingId/cancellations` - Booking cancellation log and policy snapshot.
- `GET /api/cancellations/:cancellationId/refunds` - Refund calculation and simulated processing status.

### 3.7 Operator Portal Endpoints
- `GET /api/operator/dashboard` - Metrics (fleet size, trips, occupancy rate, simulated revenue).
- `GET /api/operator/buses` - List operator fleet.
- `POST /api/operator/buses` - Create and configure bus seat layout.
- `GET /api/operator/trips` - Operator scheduled trips.
- `POST /api/operator/trips` - Schedule new trip and initialize segment inventory.
- `GET /api/operator/trips/:tripId/manifest` - Passenger manifest report.

### 3.8 Administrator Endpoints
- `GET /api/admin/dashboard` - Global platform KPIs.
- `GET /api/admin/operators` - Pending and active operator profiles.
- `PATCH /api/admin/operators/:operatorId/status` - Approve, reject, or suspend operator.
- `GET /api/admin/stops` / `POST /api/admin/stops` - Master stop catalog.
- `GET /api/admin/routes` / `POST /api/admin/routes` - Master route network.
- `GET /api/admin/bookings` - System-wide bookings review.
- `GET /api/admin/audit-logs` - Comprehensive security and operational audit trail.

