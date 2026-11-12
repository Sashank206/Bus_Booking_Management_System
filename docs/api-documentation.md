# BusGo API Documentation

## 1. Overview
The BusGo API is a RESTful API built on Express 5. All endpoints communicate using standard JSON payloads, HTTP status codes, and centralized error responses.

Base URL (Development): `http://localhost:5000/api`

## 2. Standard Response Structure

### 2.1 Successful Response
```json
{
  "status": "success",
  "message": "Optional descriptive status message",
  "data": { ... }
}
```

### 2.2 Error Response
```json
{
  "status": "fail" | "error",
  "message": "Human-readable error explanation",
  "errors": {
    "field": "Specific validation failure description"
  }
}
```

---

## 3. Implemented API Endpoints

### 3.1 Health & Service Inspection
- `GET /` — Service identity and route registry summary.
- `GET /api/health` — System uptime, environment, and connectivity status.

---

### 3.2 Authentication & Session Lifecycle (`/api/auth`)
- `POST /api/auth/register` — Customer account registration.
  - Body: `{ name, email, password, phone }`
- `POST /api/auth/operator-register` — Transport operator registration.
  - Body: `{ name, email, password, phone, companyName, registrationNumber, contactPerson, address }`
- `POST /api/auth/login` — Account authentication (JWT issued in HTTP-only cookie and JSON payload).
  - Body: `{ email, password }`
- `POST /api/auth/logout` — Session termination and HTTP-only cookie clearance.
- `GET /api/auth/me` — Authenticated session restore and profile lookup.
- `PUT /api/auth/profile` — User profile update (name, phone).

---

### 3.3 Platform Administration (`/api/admin`)
*(Protected: Requires authenticated user with `admin` role)*

- `GET /api/admin/dashboard`
  - Returns global platform KPIs: total registered customers, total operators, pending applications, active fleet size, scheduled trips, confirmed bookings, simulated revenue, recent applications queue, and recent audit logs.
- `GET /api/admin/operators?status=...&search=...&page=...&limit=...`
  - Lists bus operators with filtering by approval status (`pending`, `approved`, `rejected`), text search across company name and registration number, and pagination.
- `GET /api/admin/operators/:operatorId`
  - Detailed operator profile inspection including fleet count and scheduled trips.
- `PATCH /api/admin/operators/:operatorId/approval`
  - Approve or reject an operator application.
  - Body: `{ decision: 'approved' | 'rejected', rejectionReason?: string }`
  - Side effects: Updates user `accountStatus` to `active` (on approval) or `rejected` (on rejection); logs an immutable `AuditLog` event.
- `PATCH /api/admin/users/:userId/status`
  - Suspend or reactivate user account.
  - Body: `{ status: 'active' | 'suspended' }`
- `GET /api/admin/audit-logs?action=...&page=...&limit=...`
  - Cryptographically traceable chronological audit trail with pagination and action type filtering.

---

### 3.4 Operator Portal (`/api/operator`)
*(Protected: Requires authenticated user with `operator` or `admin` role)*

- `GET /api/operator/dashboard`
  - Returns operator-isolated metrics: fleet size, active buses, scheduled trips, upcoming trips, confirmed bookings count, simulated revenue, and average seat occupancy percentage.

---

### 3.5 Bus Fleet Management (`/api/buses`)
*(Protected: Requires `operator` or `admin` role; creation requires approved operator)*

- `GET /api/buses`
  - Lists buses. Operators only see their own fleet vehicles; administrators see all buses.
- `GET /api/buses/:busId`
  - Detailed bus inspection with seat layout definition. Enforces operator ownership.
- `POST /api/buses`
  - Registers a new bus vehicle and validates custom seat layout.
  - Body:
    ```json
    {
      "busNumber": "VOLVO-EXPRESS-1",
      "busName": "Volvo 9600 Multi-Axle",
      "busType": "AC Sleeper (2+1)",
      "registrationNumber": "DL 01 AB 1234",
      "totalSeats": 30,
      "seatLayout": {
        "rows": 10,
        "columns": 3,
        "deckCount": 1,
        "seats": [
          { "seatNumber": "1A", "row": 1, "col": 1, "deck": 1, "seatType": "sleeper" },
          { "seatNumber": "1B", "row": 1, "col": 2, "deck": 1, "seatType": "sleeper" }
        ]
      },
      "amenities": ["Wi-Fi", "Charging Point", "Blanket"]
    }
    ```
  - Validation rules: `totalSeats` must strictly match `seatLayout.seats.length`; duplicate seat numbers are rejected with 400 Bad Request; duplicate registration number rejected with 409 Conflict.
- `PUT /api/buses/:busId`
  - Updates bus specifications and layout. Enforces operator ownership.
- `PATCH /api/buses/:busId/status`
  - Toggles bus `isActive` status (activate / deactivate). Enforces operator ownership.

---

### 3.6 Master Stop Catalog (`/api/stops`)
- `GET /api/stops?city=...&search=...&isActive=...`
  - Public endpoint: Browse physical boarding and dropping points.
- `GET /api/stops/:stopId`
  - View individual stop coordinates and address details.
- `POST /api/stops` *(Admin only)*
  - Registers a new physical stop.
  - Body: `{ stopName, city, state, address, latitude, longitude }`
  - Validation rules: `stopName` and `city` are required; duplicate stop name in the same city is blocked with 409 Conflict.
- `PUT /api/stops/:stopId` *(Admin only)*
  - Modifies stop information.
- `PATCH /api/stops/:stopId/status` *(Admin only)*
  - Toggles stop `isActive` status.

---

### 3.7 Route Network & Stop Sequences (`/api/routes`)
- `GET /api/routes`
  - Public endpoint: Lists established route corridors with source and destination details.
- `GET /api/routes/:routeId`
  - Full route corridor inspection with ordered intermediate stops timeline.
- `POST /api/routes` *(Admin only)*
  - Creates a new reusable route corridor with sequential stop waypoints.
  - Body:
    ```json
    {
      "routeName": "Delhi to Amritsar Express",
      "sourceStopId": "67...",
      "destinationStopId": "67...",
      "distanceKm": 450,
      "estimatedDurationMinutes": 480,
      "stops": [
        { "stopId": "67...", "stopSequence": 0, "distanceFromStart": 0 },
        { "stopId": "67...", "stopSequence": 1, "distanceFromStart": 310 },
        { "stopId": "67...", "stopSequence": 2, "distanceFromStart": 450 }
      ]
    }
    ```
  - Validation rules: Source and destination stops cannot be identical; stop sequences must be strictly sequential.
- `PATCH /api/routes/:routeId/status` *(Admin only)*
  - Toggles route `isActive` status.

---

### 3.8 Trip Scheduling & Passenger Manifests (`/api/trips`)
- `GET /api/trips?operatorId=...&routeId=...&date=...&status=...`
  - Public/Operator trip browsing. If authenticated as an operator, automatically filters to trips belonging to that operator.
- `GET /api/trips/:tripId`
  - Detailed trip information including stops and total available inventory seats.
- `POST /api/trips` *(Protected: Approved Operator / Admin)*
  - Schedules a new trip journey.
  - Body:
    ```json
    {
      "busId": "67...",
      "routeId": "67...",
      "travelDate": "2026-11-20T00:00:00.000Z",
      "departureTime": "2026-11-20T08:00:00.000Z",
      "arrivalTime": "2026-11-20T16:00:00.000Z",
      "baseFare": 750
    }
    ```
  - Automated Operations:
    1. Enforces vehicle operator ownership.
    2. Enforces operator approval state (`approved` required).
    3. Validates arrival time is strictly after departure time.
    4. Detects vehicle scheduling conflicts (`departureTime < existingArr && arrivalTime > existingDep`) on the same physical vehicle; rejects overlap with 409 Conflict.
    5. Automatically generates **TripStops** records with linear interpolation of intermediate arrival/departure timings based on route stop sequence and distance.
    6. Automatically generates **SeatInventory** documents matching every seat in the bus layout (`tripId`, `seatNumber`, `seatType`, `isActive: true`, `activeSegments: []`) ensuring uniqueness on `{ tripId, seatNumber }`.
    7. Records `TRIP_SCHEDULED` in `AuditLog`.
- `PATCH /api/trips/:tripId/cancel` *(Protected: Operator owner / Admin)*
  - Cancels scheduled trip, sets `tripStatus: 'cancelled'`, closes seat inventory, and records `TRIP_CANCELLED` audit log.
- `GET /api/trips/:tripId/manifest` *(Protected: Operator owner / Admin)*
  - Generates comprehensive passenger manifest detailing all reserved seats, passenger names, age, gender, contact numbers, PNR codes, boarding stops, dropping stops, sequence intervals `[fromSequence, toSequence)`, and collected segment fares.

---

### 3.9 Customer Search & Seat Availability (`/api/trips`)
- `GET /api/trips/search?origin=...&destination=...&date=...&busType=...&operatorId=...&minFare=...&maxFare=...&sortBy=...&page=...&limit=...`
  - Public search engine matching scheduled journeys that include both origin and destination stops in strictly forward sequence (`fromSequence < toSequence`).
  - Supports resolution by stop ObjectId or case-insensitive city/stop name queries.
  - Returns calculated segment duration, calculated segment fare proportional to distance ratio, bus operator profile with rating, vehicle specifications, and total unallocated seats for the requested segment `[fromSequence, toSequence)`.
- `GET /api/trips/:tripId/seats?fromStopId=...&toStopId=...`
  - Returns complete vehicle cabin seating layout (decks, rows, columns, sleeper vs seater attributes).
  - Calculates real-time segment availability for each individual seat using half-open intervals `[fromSequence, toSequence)`.
  - Non-overlapping occupied segments on the same physical vehicle remain completely available for booking.
  - Dynamically evaluates hold expiry (`status === 'held' && holdExpiresAt <= now`), preventing expired holds from blocking seats.

---

### 3.10 Seat Holds & Booking Workflow (`/api/bookings`)
- `POST /api/bookings/hold` *(Protected: Customer / Admin)*
  - Acquires atomic 10-minute hold on 1 to 6 selected seats.
  - Body:
    ```json
    {
      "tripId": "67...",
      "seatNumbers": ["1A", "1B"],
      "boardingStopId": "67...",
      "droppingStopId": "67..."
    }
    ```
  - Response returns `holdToken`, `holdExpiresAt` (now + 10 mins), calculated `seatFare`, and `totalAmount`.
  - Concurrency & Rollback: Employs all-or-nothing rollback. If any seat in a multi-seat request is blocked or concurrently acquired by another user, all acquired holds in that request are released and returns 409 Conflict.
- `POST /api/bookings/release-hold` *(Public / Customer)*
  - Explicitly releases temporary holds when customer deselects seats or abandons booking.
  - Body: `{ tripId, seatNumbers, holdToken }`
- `POST /api/bookings` *(Protected: Customer / Admin)*
  - Creates booking record with cryptographically generated unique PNR (matching `/^[A-Z0-9]{6,12}$/`).
  - Body:
    ```json
    {
      "tripId": "67...",
      "boardingStopId": "67...",
      "droppingStopId": "67...",
      "holdToken": "HT_...",
      "passengers": [
        {
          "fullName": "Rohan Sharma",
          "age": 28,
          "gender": "male",
          "seatNumber": "1A",
          "phone": "9876543210",
          "email": "rohan@example.com"
        }
      ]
    }
    ```
  - Multi-Document Consistency: Creates `Booking` (`pending_payment`), individual `Passenger` records, `BookingSeat` segment allocations (`held`), pending `Payment` with idempotency key, and records `BOOKING_CREATED` audit log. On failure, triggers compensational rollback.
- `GET /api/bookings/my-bookings?page=...&limit=...&status=...` *(Protected: Customer)*
  - Lists historical and active bookings exclusively for the authenticated user, populated with passenger rosters, bus details, and allocated seat numbers.
- `GET /api/bookings/:bookingId` *(Protected: Customer owner / Admin)*
  - Detailed booking retrieval by MongoDB ObjectId or PNR. Enforces strict customer ownership isolation (Customer A cannot access Customer B's booking). Admin retains platform-wide verification access.

---

### 3.11 Simulated Payment Processing (`/api/payments`)
- `POST /api/payments/simulate` *(Protected: Customer owner / Admin)*
  - Simulates payment gateway processing (success or failure) without actual credit card or banking integration.
  - Body:
    ```json
    {
      "bookingId": "67...",
      "idempotencyKey": "PAY_IDEM_...",
      "simulationAction": "success",
      "paymentMethod": "simulated_card"
    }
    ```
  - **Success Flow**:
    - Validates 10-minute hold window (`holdExpiresAt > now`).
    - Transitions `Booking.bookingStatus` from `pending_payment` to `confirmed`.
    - Transitions all associated `BookingSeat.allocationStatus` to `confirmed`.
    - Confirms `SeatInventory.activeSegments` status to `confirmed`.
    - Generates unique `paymentReference` (`SIM_TXN_...`).
    - Dispatches `BOOKING_CONFIRMED` notification and writes audit log.
    - Idempotency Guarantee: Replaying the endpoint with the identical `idempotencyKey` on an already-confirmed booking returns 200 with `{ isDuplicate: true }` without redundant charges.
  - **Failure Flow**:
    - Marks `Payment.paymentStatus = 'failed'`.
    - Transitions `Booking.bookingStatus = 'failed'`.
    - Releases all `BookingSeat` records (`allocationStatus: 'released'`).
    - Removes held segments from `SeatInventory.activeSegments`, instantly freeing seats.
- `GET /api/payments/:paymentId` *(Protected: Customer owner / Admin)*
  - Retrieves specific payment record with transaction details and timestamps.
- `GET /api/payments/booking/:bookingId` *(Protected: Customer owner / Admin)*
  - Retrieves payment status and history for a given booking.

---

### 3.12 Confirmed Ticket & Public PNR Verification
- `GET /api/bookings/:bookingId/ticket` *(Protected: Customer owner / Admin)*
  - Generates comprehensive electronic travel ticket.
  - Returns complete route itinerary, boarding and dropping points with contact info, passenger manifest with allocated seat numbers, fare breakdown, payment transaction reference, active cancellation policy summary, and cryptographic QR payload string (`BUSGO|...`).
- `GET /api/bookings/verify/:pnr` *(Public / Optional Authentication)*
  - Public ticket verification endpoint for conductors and passengers.
  - Masks sensitive user contact information (e.g. `98****3210`, `a***v@example.com`) to protect privacy while displaying journey itinerary, bus type, seat allocations, and validity.
  - Returns 404 for invalid PNR.
- `POST /api/bookings/cleanup-expired` *(Protected: Admin / Background Task)*
  - Scans and cleans up stale `pending_payment` reservations whose 10-minute hold window expired.
  - Transitions bookings and seats to `expired`, strips orphaned held segments from `SeatInventory.activeSegments`, and returns `{ cleanedCount, releasedSeats }`.

---

### 3.13 Partial & Full Cancellation Management (`/api/cancellations`)
- `POST /api/bookings/:bookingId/cancel` *(Protected: Customer owner / Admin)*
  - Processes selective seat cancellation or complete booking cancellation.
  - Body:
    ```json
    {
      "bookingSeatIds": ["67..."],
      "reason": "Change of travel plans"
    }
    ```
  - **Deduction Engine & Policy Snapshot**:
    - Calculates exact hours until journey departure.
    - Matches active tiered policy rules (>24h: 10% deduction, 12-24h: 25%, 2-12h: 50%, <2h: 100% non-cancellable).
    - Snapshots the complete policy rules into `Cancellation.policySnapshot` for permanent immutability.
    - Creates `Cancellation` and `CancellationItem` records.
  - **Seat Release & Inventory Consistency**:
    - Marks cancelled `BookingSeat` as `cancelled`.
    - Unaffected seats remain `confirmed`.
    - Releases cancelled segment `[fromSequence, toSequence)` from `SeatInventory.activeSegments`, enabling instant re-booking by other travelers.
    - If all seats cancelled, transitions `Booking.bookingStatus` to `cancelled`; if partial, transitions to `partially_cancelled`.
  - **Automatic Refund Generation**:
    - If net refund > 0, generates a `Refund` record with `SIM_REF_...` reference.
- `GET /api/bookings/:bookingId/cancellations` *(Protected: Customer owner / Admin)*
  - Lists historical cancellation requests, deduction charges, and itemized passenger breakdowns for a booking.
- `GET /api/cancellations/:cancellationId` *(Protected: Customer owner / Admin)*
  - Retrieves detailed cancellation document by ID.

---

### 3.14 Simulated Refund Management (`/api/refunds`)
- `GET /api/refunds/:refundId` *(Protected: Customer owner / Admin)*
  - Retrieves refund status, reference, amount, and original payment linkage.
- `GET /api/refunds/booking/:bookingId` *(Protected: Customer owner / Admin)*
  - Lists all refund records associated with cancellations on a specific booking.
- `GET /api/admin/refunds?status=...&page=...&limit=...` *(Protected: Admin)*
  - Master administration listing of all system refunds with status filters.
- `POST /api/admin/refunds/:refundId/simulate` *(Protected: Admin)*
  - Simulates gateway refund fulfillment transitions (`completed`, `failed`, `processing`).
  - Dispatches customer notification and records audit log.

---

### 3.15 Cancellation Policy Engine (`/api/admin/cancellation-policy`)
- `GET /api/admin/cancellation-policy` *(Protected: Admin)*
  - Retrieves active policy settings: cutoff window in hours, policy name, and deduction tiers.
- `PUT /api/admin/cancellation-policy` *(Protected: Admin)*
  - Updates departure cutoff hours and percentage tiers.
  - Validates that deduction percentage + refund percentage equals exactly 100%.
  - Records administrative audit trail.


