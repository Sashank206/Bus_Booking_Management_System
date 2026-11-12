# BusGo Testing Report

## 1. Testing Strategy
BusGo employs a multi-tiered test strategy covering:
- Unit and route handler tests
- Integration API tests
- Concurrency and race-condition tests (atomic segment overlapping & hold expiry)
- Role-based authorization & operator isolation tests
- Frontend build, routing, and component tree verification
- Phase 4 Full-Stack Integration Audit

## 2. Test Execution Status

### Phase 2: Project Setup Verification
| Category | Test Case | Target | Result | Date |
|---|---|---|---|---|
| Backend | Server initialization & route registration | `backend/server.js` | PASS | 2026-11-09 |
| Backend | Health check endpoint (`GET /api/health`) | `backend/tests/health-check.test.js` | PASS | 2026-11-09 |
| Backend | Base info endpoint (`GET /`) | `backend/tests/health-check.test.js` | PASS | 2026-11-09 |
| Backend | Unmatched route handler (404 Not Found) | `backend/tests/health-check.test.js` | PASS | 2026-11-09 |
| Frontend | Vite client production build | `frontend/` | PASS (1.13s) | 2026-11-09 |
| Frontend | Tailwind CSS v4 and Lucide icon rendering | `frontend/src/App.jsx` | PASS | 2026-11-09 |
| Frontend | API service layer initialization | `frontend/src/services/api.js` | PASS | 2026-11-09 |
| Version Control | .gitignore ignores `node_modules` and `.env` | Git tracking rules | PASS | 2026-11-09 |

### Phase 3: Backend Foundation Verification (45 Tests Passed)
| Category | Test Case | Target | Result | Date |
|---|---|---|---|---|
| Models | 18 Collections Mongoose Model Registration | `backend/models/index.js` | PASS (18/18 models) | 2026-11-09 |
| Models | SeatInventory unique index on `{ tripId, seatNumber }` | `backend/models/SeatInventory.js` | PASS | 2026-11-09 |
| Models | BookingSeat non-unique seatInventoryId constraint | `backend/models/BookingSeat.js` | PASS | 2026-11-09 |
| Models | RouteStop unique compound `{ routeId, stopSequence }` | `backend/models/RouteStop.js` | PASS | 2026-11-09 |
| Models | TripStop unique compound `{ tripId, stopSequence }` | `backend/models/TripStop.js` | PASS | 2026-11-09 |
| Models | Booking unique index on `{ pnr }` | `backend/models/Booking.js` | PASS | 2026-11-09 |
| Logic | Segment non-overlap [0,2) & [2,4) permitted | `SeatInventory.isOverlap` | PASS | 2026-11-09 |
| Logic | Segment overlap [0,2) & [1,3) conflict blocked | `SeatInventory.isOverlap` | PASS | 2026-11-09 |
| Logic | Segment non-overlap [1,3) & [3,4) permitted | `SeatInventory.isOverlap` | PASS | 2026-11-09 |
| Logic | Segment overlap [0,4) & [1,2) conflict blocked | `SeatInventory.isOverlap` | PASS | 2026-11-09 |
| Logic | Hold expiration unblocks seat for new segment booking | `isAvailableForSegment` | PASS | 2026-11-09 |
| Logic | Active hold blocks overlapping segment | `isAvailableForSegment` | PASS | 2026-11-09 |
| Security | Password hashing with bcrypt salt | `User.hashPassword` | PASS | 2026-11-09 |
| Security | Password verification matching & rejection | `user.comparePassword` | PASS | 2026-11-09 |
| Security | JWT signing and payload integrity verification | `jwt.generateToken / verifyToken` | PASS | 2026-11-09 |
| Auth | RBAC middleware blocking unauthorized role (403) | `middleware/auth.js (authorize)` | PASS | 2026-11-09 |
| Auth | RBAC middleware allowing authorized role | `middleware/auth.js (authorize)` | PASS | 2026-11-09 |
| Auth | Operator approval gate blocking pending status (403) | `requireApprovedOperator` | PASS | 2026-11-09 |
| API | Route `/api/auth/me` rejects missing token (401) | `routes/authRoutes.js` | PASS | 2026-11-09 |
| API | Registration validation rejects invalid email & short pass (400) | `validators/authValidator.js` | PASS | 2026-11-09 |
| API | Login validation rejects missing password (400) | `validators/authValidator.js` | PASS | 2026-11-09 |
| System | Centralized error handler response sanitization | `middleware/errorHandler.js` | PASS | 2026-11-09 |

### Phase 4: Frontend Foundation & Integration Audit (25 Tests Passed)
| Category | Test Case | Target | Result | Date |
|---|---|---|---|---|
| Client Build | Full Vite React 19 Client Production Build | `frontend/` | PASS (1.12s, 2,161 modules) | 2026-11-11 |
| Import Health | 106 Local JS/JSX Imports Resolution Check | `scratch/check-imports.js` | PASS (106/106 resolved) | 2026-11-11 |
| Auth Scenario | Customer Login, JWT issuance & Set-Cookie | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Auth Scenario | Operator Login & Operator Profile Association | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Auth Scenario | Administrator Login & Role Attribution | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Auth Scenario | Invalid Password returns 401 Unauthorized | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Auth Scenario | Non-existent Email returns 401 Unauthorized | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Auth Scenario | Empty Credentials return 400 Bad Request | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Session | Session Restore via Authorization: Bearer Header | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Session | Session Restore via HTTP-only Cookie Header | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Security | Stale cookie (`token=none`) rejected with 401 | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Security | Malformed JWT Bearer token rejected with 401 | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Logout | POST `/api/auth/logout` clears HTTP-only cookie with past date | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| RBAC | Customer blocked from admin resources (403) | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| RBAC | Operator blocked from admin resources (403) | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| RBAC | Administrator allowed through admin gate | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Operator Gate | Backend blocks pending operator profile (403) | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Operator Gate | Backend blocks suspended operator profile (403) | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Operator Gate | Backend allows approved operator profile | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Operator Gate | Administrator bypasses operator approval gate | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Validation | Registration form field error mapping | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| Validation | Operator registration business field error mapping | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| CORS | Preflight OPTIONS check for http://localhost:5173 | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |
| CORS | Preflight OPTIONS check for http://127.0.0.1:5173 | `tests/phase4-integration-audit.test.js` | PASS | 2026-11-11 |

### Phase 5: Admin & Operator Management (44 Tests Passed)
| Category | Test Case | Target | Result | Date |
|---|---|---|---|---|
| Admin RBAC | Customer blocked from admin operator listing (403) | `GET /api/admin/operators` | PASS | 2026-11-11 |
| Admin Op Mgmt | Admin successfully lists registered bus operators (200) | `GET /api/admin/operators` | PASS | 2026-11-11 |
| Admin Op Mgmt | Admin approves pending operator application | `PATCH /api/admin/operators/:id/approval` | PASS | 2026-11-11 |
| Audit Trail | Audit log record created for OPERATOR_APPROVED | `backend/models/AuditLog.js` | PASS | 2026-11-11 |
| Admin Op Mgmt | Admin rejects operator with documented rejection reason | `PATCH /api/admin/operators/:id/approval` | PASS | 2026-11-11 |
| Account Status | Admin successfully suspends operator user account | `PATCH /api/admin/users/:id/status` | PASS | 2026-11-11 |
| Account Status | Admin successfully reactivates operator user account | `PATCH /api/admin/users/:id/status` | PASS | 2026-11-11 |
| Bus RBAC | Customer blocked from registering a bus (403) | `POST /api/buses` | PASS | 2026-11-11 |
| Bus Creation | Approved operator registers bus with 2x2 seat layout | `POST /api/buses` | PASS | 2026-11-11 |
| Bus Validation | Bus rejected when totalSeats != seatLayout.seats.length (400) | `validators/busValidator.js` | PASS | 2026-11-11 |
| Bus Validation | Bus rejected when layout contains duplicate seat numbers (400) | `validators/busValidator.js` | PASS | 2026-11-11 |
| Bus Validation | Bus rejected when layout contains invalid row/col <= 0 (400) | `validators/busValidator.js` | PASS | 2026-11-11 |
| Bus Uniqueness | Duplicate registration number rejected with 409 Conflict | `POST /api/buses` | PASS | 2026-11-11 |
| Bus Ownership | Operator cannot modify or toggle another operator's bus (403) | `PATCH /api/buses/:id/status` | PASS | 2026-11-11 |
| Bus Immutability | Bus layout modification rejected when bus has active trips (409) | `PUT /api/buses/:id` | PASS | 2026-11-11 |
| Bus Metadata | Non-layout bus metadata (name, amenities) updates allowed (200) | `PUT /api/buses/:id` | PASS | 2026-11-11 |
| Stop RBAC | Customer blocked from creating a master stop (403) | `POST /api/stops` | PASS | 2026-11-11 |
| Stop Creation | Admin successfully creates origin master stop | `POST /api/stops` | PASS | 2026-11-11 |
| Stop Creation | Admin successfully creates intermediate master stop | `POST /api/stops` | PASS | 2026-11-11 |
| Stop Creation | Admin successfully creates destination master stop | `POST /api/stops` | PASS | 2026-11-11 |
| Stop Uniqueness | Duplicate stopName in same city rejected with 409 Conflict | `POST /api/stops` | PASS | 2026-11-11 |
| Stop Catalog | Public unauthenticated browse lists active physical stops (200) | `GET /api/stops` | PASS | 2026-11-11 |
| Route Validation | Route rejected when source and destination are identical (400) | `validators/routeValidator.js` | PASS | 2026-11-11 |
| Route Creation | Admin creates multi-stop route with ordered sequences (0, 1, 2) | `POST /api/routes` | PASS | 2026-11-11 |
| Route Status | Admin toggles route active status | `PATCH /api/routes/:id/status` | PASS | 2026-11-11 |
| Trip Validation | Trip rejected when arrival time <= departure time (400) | `validators/tripValidator.js` | PASS | 2026-11-11 |
| Trip Ownership | Operator cannot schedule trip with another operator's bus (403) | `POST /api/trips` | PASS | 2026-11-11 |
| Trip Schedule | Approved operator schedules trip and sets scheduled status | `POST /api/trips` | PASS | 2026-11-11 |
| Trip Stops | TripStops automatically generated for all stops in sequence | `backend/models/TripStop.js` | PASS | 2026-11-11 |
| Seat Inventory | SeatInventory automatically generated for all physical seats | `backend/models/SeatInventory.js` | PASS | 2026-11-11 |
| Schedule Conflict | Conflicting trip schedule on same bus blocked with 409 Conflict | `POST /api/trips` | PASS | 2026-11-11 |
| Midnight Crossing | Overnight trip crossing midnight (22:00 -> 06:00) scheduled (201) | `POST /api/trips` | PASS | 2026-11-11 |
| Midnight Collision | Conflicting trip overlapping overnight arrival blocked (409) | `POST /api/trips` | PASS | 2026-11-11 |
| Non-Overlap Trip | Non-overlapping trip on same bus after arrival succeeds (201) | `POST /api/trips` | PASS | 2026-11-11 |
| Manifest | Operator passenger manifest endpoint returns 200 manifest list | `GET /api/trips/:id/manifest` | PASS | 2026-11-11 |
| Manifest Guard | Operator cannot view manifest of another operator's trip (403) | `GET /api/trips/:id/manifest` | PASS | 2026-11-11 |
| Suspended Guard | Suspended operator is blocked from scheduling trips (403) | `POST /api/trips` | PASS | 2026-11-11 |
| Trip Cancellation | Operator successfully cancels trip (status: 'cancelled') | `PATCH /api/trips/:id/cancel` | PASS | 2026-11-11 |
| Booking Cascading | Confirmed bookings on cancelled trip marked cancelled | `backend/models/Booking.js` | PASS | 2026-11-11 |
| Seat Cascading | Confirmed seats on cancelled trip marked cancelled | `backend/models/BookingSeat.js` | PASS | 2026-11-11 |
| Notification | Passenger cancellation notification dispatched with PNR | `backend/models/Notification.js` | PASS | 2026-11-11 |
| Index Verification | SeatInventory compound unique index on { tripId, seatNumber } | `backend/models/SeatInventory.js` | PASS | 2026-11-11 |
| Admin Dashboard | Returns live aggregated metrics, operators, and audit logs | `GET /api/admin/dashboard` | PASS | 2026-11-11 |
| Operator Dashboard | Returns fleet size, occupancy %, revenue, and recent trips | `GET /api/operator/dashboard` | PASS | 2026-11-11 |

### Phase 6: Customer Search & Booking Workflow (46 Tests Passed)
| Category | Test Case | Target | Result | Date |
|---|---|---|---|---|
| Search Validation | Missing origin query parameter rejected with 400 | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Validation | Missing destination query parameter rejected with 400 | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Validation | Identical origin and destination rejected with 400 | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Route | Valid forward search (Delhi -> Agra) returns 200 with matching trips | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Route | Returns matching trip with boarding/dropping stop sequence metadata | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Route | Returns correct initial available seat count (16/16) | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Route | Validates boarding sequence (1) strictly precedes dropping sequence (3) | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Filter | Reverse direction search (Agra -> Delhi) excludes forward trip | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Filter | busType=Sleeper correctly filters out Seater buses | `GET /api/trips/search` | PASS | 2026-11-11 |
| Search Filter | busType=AC correctly matches AC vehicles | `GET /api/trips/search` | PASS | 2026-11-11 |
| Seat Map | Segment seat availability endpoint returns 200 with layout | `GET /api/trips/:id/seats` | PASS | 2026-11-11 |
| Segment Math | Non-overlapping segment [2, 4) available when seat booked on [1, 2) | `SeatInventory.isAvailableForSegment` | PASS | 2026-11-11 |
| Segment Math | Overlapping segment [1, 3) blocked when seat booked on [1, 2) | `SeatInventory.isAvailableForSegment` | PASS | 2026-11-11 |
| Dynamic Hold | Expired hold (5 min past) does not block seat (evaluated on the fly) | `SeatInventory.isAvailableForSegment` | PASS | 2026-11-11 |
| Dynamic Hold | Active unexpired hold correctly blocks seat availability | `SeatInventory.isAvailableForSegment` | PASS | 2026-11-11 |
| Hold Security | Unauthenticated hold request rejected with 401 | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Hold Validation | Request exceeding maximum limit of 6 seats rejected with 400 | `validators/bookingValidator.js` | PASS | 2026-11-11 |
| Hold Validation | Request with duplicate seat numbers rejected with 400 | `validators/bookingValidator.js` | PASS | 2026-11-11 |
| Hold Acquisition | Customer 1 successfully acquires atomic 10-minute hold on seat 2A | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Hold Token | Cryptographic holdToken issued in response | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Hold Expiry | holdExpiresAt initialized ~10 minutes in future | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Concurrency | Customer 2 receives 409 Conflict attempting to hold already-held seat 2A | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Atomic Rollback | Multi-seat hold failure rolls back partial holds completely | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Rollback State | Previously free seat remains free after rolled back multi-seat request | `backend/models/SeatInventory.js` | PASS | 2026-11-11 |
| Hold Release | Explicit release via `/api/bookings/release-hold` returns 200 | `POST /api/bookings/release-hold` | PASS | 2026-11-11 |
| Released State | Released seat immediately available for booking again | `SeatInventory.isAvailableForSegment` | PASS | 2026-11-11 |
| Hold Success | Customer 1 successfully acquires hold on seats 3A and 3B | `POST /api/bookings/hold` | PASS | 2026-11-11 |
| Booking Validation| Empty passenger fullName rejected with 400 | `validators/bookingValidator.js` | PASS | 2026-11-11 |
| Booking Validation| Invalid passenger age (145) rejected with 400 | `validators/bookingValidator.js` | PASS | 2026-11-11 |
| Booking Validation| Invalid passenger gender rejected with 400 | `validators/bookingValidator.js` | PASS | 2026-11-11 |
| Booking Validation| Two passengers sharing same seat number rejected with 400 | `validators/bookingValidator.js` | PASS | 2026-11-11 |
| Booking Creation | Valid booking created with 201 Created | `POST /api/bookings` | PASS | 2026-11-11 |
| PNR Format | Generated unique PNR matches regex `/^BG[A-Z0-9]{8}$/` | `generateUniquePNR` | PASS | 2026-11-11 |
| Booking Status | Booking status initialized to 'pending_payment' | `backend/models/Booking.js` | PASS | 2026-11-11 |
| Passenger Record | Passenger records created and linked to booking | `backend/models/Passenger.js` | PASS | 2026-11-11 |
| BookingSeat | BookingSeat records created with segment intervals | `backend/models/BookingSeat.js` | PASS | 2026-11-11 |
| Payment Record | Pending Payment record initialized with idempotencyKey | `backend/models/Payment.js` | PASS | 2026-11-11 |
| Booking Access | Customer 1 can retrieve their own booking by ID (200) | `GET /api/bookings/:id` | PASS | 2026-11-11 |
| Booking Payload | Booking response contains correct PNR, itinerary and seats | `GET /api/bookings/:id` | PASS | 2026-11-11 |
| Ownership Guard | Customer 2 blocked from Customer 1 booking with 403 Forbidden | `GET /api/bookings/:id` | PASS | 2026-11-11 |
| Admin Access | Administrator can access any booking for platform support (200) | `GET /api/bookings/:id` | PASS | 2026-11-11 |
| My Bookings | Customer 1 lists their bookings via `GET /api/bookings/my-bookings` | `GET /api/bookings/my-bookings` | PASS | 2026-11-11 |
| Booking List | Newly created booking appears in Customer 1's bookings list | `GET /api/bookings/my-bookings` | PASS | 2026-11-11 |
| Ownership Leak | Customer 2's booking list does not leak Customer 1's records | `GET /api/bookings/my-bookings` | PASS | 2026-11-11 |
| Customer 2 List | Customer 2's booking list remains empty (200) | `GET /api/bookings/my-bookings` | PASS | 2026-11-11 |
| Client Build | React 19 production build succeeds with Phase 6 components | `frontend/` | PASS (768ms) | 2026-11-11 |

---

## 5. Phase 7 Test Execution Matrix (Payment, Confirmation, Cancellation & Refunds)

| Category | Description / Assertion | Target Component | Status | Execution Date |
|---|---|---|:---:|:---:|
| Payment Validation | Missing `idempotencyKey` rejected with 400 | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Payment Validation | Invalid `simulationAction` rejected with 400 | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Payment Security | Customer 2 blocked with 403 paying for Customer 1 booking | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Payment Success | Payment success simulation returns 200 OK | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| State Transition | Booking status transitions to `confirmed` | `backend/models/Booking.js` | PASS | 2026-11-12 |
| Seat Confirmation | BookingSeat allocations transition to `confirmed` | `backend/models/BookingSeat.js` | PASS | 2026-11-12 |
| Inventory State | SeatInventory activeSegments update to `confirmed` | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Payment Reference | Generated valid transaction reference (`SIM_TXN_...`) | `backend/models/Payment.js` | PASS | 2026-11-12 |
| Idempotency Replay | Replaying same idempotency key succeeds idempotently (200) | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Idempotency Flag | Response explicitly flags duplicate replay (`isDuplicate: true`) | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Payment Failure | Payment failure simulation returns 200 with fail status | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| State Transition | Booking transitions to `failed` on payment failure | `backend/models/Booking.js` | PASS | 2026-11-12 |
| Seat Release | Seat allocation released (`released`) on payment failure | `backend/models/BookingSeat.js` | PASS | 2026-11-12 |
| Inventory Release | Held segment removed from `SeatInventory.activeSegments` | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Payment Guard | Rejects payment on already failed/cancelled booking (400) | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Hold Expiry Guard | Stale booking with expired hold rejected with 400 | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| State Auto-Expiry | Expired booking automatically transitioned to `expired` | `backend/models/Booking.js` | PASS | 2026-11-12 |
| Stale Clean | Stale held segment cleaned from SeatInventory | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Ticket Retrieval | Customer fetches ticket successfully with 200 OK | `GET /api/bookings/:id/ticket` | PASS | 2026-11-12 |
| Ticket Data | Ticket data contains correct PNR and itinerary | `GET /api/bookings/:id/ticket` | PASS | 2026-11-12 |
| QR Payload | Ticket contains verifiable QR payload string with PNR | `GET /api/bookings/:id/ticket` | PASS | 2026-11-12 |
| Policy Summary | Ticket includes active cancellation policy cutoff summary | `GET /api/bookings/:id/ticket` | PASS | 2026-11-12 |
| Ticket Security | Customer 2 blocked from Customer 1 ticket with 403 Forbidden | `GET /api/bookings/:id/ticket` | PASS | 2026-11-12 |
| Admin Ticket Access| Administrator can access any customer ticket for support | `GET /api/bookings/:id/ticket` | PASS | 2026-11-12 |
| PNR Verification | Public PNR verification succeeds with 200 OK | `GET /api/bookings/verify/:pnr` | PASS | 2026-11-12 |
| Verification Data | Public verification returns correct booking details | `GET /api/bookings/verify/:pnr` | PASS | 2026-11-12 |
| Privacy Masking | Public verification masks customer phone number | `GET /api/bookings/verify/:pnr` | PASS | 2026-11-12 |
| Privacy Masking | Public verification masks customer email address | `GET /api/bookings/verify/:pnr` | PASS | 2026-11-12 |
| PNR 404 | Public verification with non-existent PNR returns 404 | `GET /api/bookings/verify/:pnr` | PASS | 2026-11-12 |
| Cleanup Routine | `POST /api/bookings/cleanup-expired` returns 200 OK | `POST /api/bookings/cleanup-expired` | PASS | 2026-11-12 |
| Cleanup Metrics | Cleanup routine reports cleanedCount and releasedSeats | `POST /api/bookings/cleanup-expired` | PASS | 2026-11-12 |
| Cleanup Idempotent| Repeat cleanup executes idempotently without errors | `POST /api/bookings/cleanup-expired` | PASS | 2026-11-12 |
| Policy >24h | Calculates >24h departure cancellation as eligible | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy >24h | Applies 10% charge tier for >24 hours | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy >24h Calc | Deduction is ₹100, refund is ₹900 on ₹1000 fare | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy 12-24h | Applies 25% charge tier for 12 to 24 hours | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy 12-24h Calc| Deduction is ₹250, refund is ₹750 | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy 2-12h | Applies 50% charge tier for 2 to 12 hours | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy 2-12h Calc | Deduction is ₹500, refund is ₹500 | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Cutoff | Cancellation within 2-hour cutoff is ineligible | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Cutoff Calc| Refund amount within cutoff window is ₹0 | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Admin Get | Admin fetches cancellation policy with 200 OK | `GET /api/admin/cancellation-policy` | PASS | 2026-11-12 |
| Policy Default | Default cutoff window is 2 hours | `backend/services/policyService.js` | PASS | 2026-11-12 |
| Policy Security | Customer blocked with 403 from updating policy | `PUT /api/admin/cancellation-policy` | PASS | 2026-11-12 |
| Policy Update | Admin updates cutoff hours with 200 OK | `PUT /api/admin/cancellation-policy` | PASS | 2026-11-12 |
| Policy State | Updated policy reflects new cutoffHours | `backend/services/policyService.js` | PASS | 2026-11-12 |
| Cancellation Req | Empty seat IDs array rejected with 400 | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Cancellation Req | Duplicate seat IDs in request rejected with 400 | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Cancellation RBAC| Customer 2 blocked with 403 cancelling Customer 1 seats | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Partial Cancel | Partial cancellation succeeds with 200 OK | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Partial Seat State| Cancelled seat updated to `cancelled` | `backend/models/BookingSeat.js` | PASS | 2026-11-12 |
| Partial Remaining | Uncancelled seat remains `confirmed` | `backend/models/BookingSeat.js` | PASS | 2026-11-12 |
| Partial Booking | Booking status transitions to `partially_cancelled` | `backend/models/Booking.js` | PASS | 2026-11-12 |
| Partial Segment | Cancelled seat segment released from SeatInventory | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Partial Keep Seg | Unaffected seat segment remains in SeatInventory | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Partial Refund | Refund record generated according to 10% charge tier | `backend/models/Refund.js` | PASS | 2026-11-12 |
| Re-cancel Guard | Rejects re-cancellation with 400 for already cancelled seat | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Full Cancel | Final seat cancellation succeeds with 200 OK | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Full Seat State | All seat allocations updated to `cancelled` | `backend/models/BookingSeat.js` | PASS | 2026-11-12 |
| Full Booking State| Booking status transitions to `cancelled` | `backend/models/Booking.js` | PASS | 2026-11-12 |
| Full Inventory Rel| All seat segments released from SeatInventory | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Cancel History | Fetches cancellation history for booking with 200 OK | `GET /api/bookings/:id/cancellations` | PASS | 2026-11-12 |
| Cancel Records | Booking cancellation history contains 2 records | `GET /api/bookings/:id/cancellations` | PASS | 2026-11-12 |
| Refund Record | Refund record created in database | `backend/models/Refund.js` | PASS | 2026-11-12 |
| Refund Format | Refund reference formatted as `SIM_REF_...` | `backend/models/Refund.js` | PASS | 2026-11-12 |
| Customer Refunds | Customer fetches booking refunds with 200 OK | `GET /api/bookings/:id/refunds` | PASS | 2026-11-12 |
| Refund Items | Returns all refund records for booking | `GET /api/bookings/:id/refunds` | PASS | 2026-11-12 |
| Refund Security | Customer 2 blocked with 403 from Customer 1 refunds | `GET /api/bookings/:id/refunds` | PASS | 2026-11-12 |
| Admin Refunds | Admin lists all system refunds with 200 OK | `GET /api/admin/refunds` | PASS | 2026-11-12 |
| Admin Refund All | Admin receives all registered refunds | `GET /api/admin/refunds` | PASS | 2026-11-12 |
| Refund Simulation| Admin simulates refund status update with 200 OK | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Refund State | Refund status updated to `processing` | `backend/models/Refund.js` | PASS | 2026-11-12 |
| Refund Sim RBAC | Customer blocked with 403 from admin refund simulation | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Admin Payments | Admin lists all payments with 200 OK | `GET /api/admin/payments` | PASS | 2026-11-12 |
| Admin Payment All| Admin receives list of all payments | `GET /api/admin/payments` | PASS | 2026-11-12 |
| Admin Cancels | Admin lists all cancellations with 200 OK | `GET /api/admin/cancellations` | PASS | 2026-11-12 |
| Admin Cancel All | Admin receives list of all cancellations | `GET /api/admin/cancellations` | PASS | 2026-11-12 |
| Notification | Notification dispatched for `BOOKING_CONFIRMED` | `backend/models/Notification.js` | PASS | 2026-11-12 |
| Notification | Notification dispatched for booking cancellation | `backend/models/Notification.js` | PASS | 2026-11-12 |
| Audit Trail | AuditLog recorded for `PAYMENT_SUCCESS` | `backend/models/AuditLog.js` | PASS | 2026-11-12 |
| Audit Trail | AuditLog recorded for seat cancellation | `backend/models/AuditLog.js` | PASS | 2026-11-12 |
| Concurrency Isolation | Stolen/reused idempotency key across different booking rejected (409) | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Concurrency Race | Concurrent payment requests safely process booking without double charges | `POST /api/payments/simulate` | PASS | 2026-11-12 |
| Concurrency State | Booking cleanly confirmed once under concurrent payment calls | `backend/models/Booking.js` | PASS | 2026-11-12 |
| Concurrency Cancel | Concurrent cancellation of same seat allows only 1 and rejects competing (409/400) | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Seat Cancellation | Seat allocation cleanly cancelled exactly once without double release | `backend/models/BookingSeat.js` | PASS | 2026-11-12 |
| Refund Cap Guard | Rejects cancellation with 400 when cumulative refunds exceed original payment | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Refund Cap Reason | Error message explains cumulative refund cap boundary violation | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Lifecycle Pending | Refund transitions from `pending` -> `processing` (200 OK) | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Lifecycle Process | Refund status successfully updated to `processing` | `backend/models/Refund.js` | PASS | 2026-11-12 |
| Lifecycle Complete | Refund transitions from `processing` -> `completed` (200 OK) | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Lifecycle Settled | Refund status updated to terminal `completed` | `backend/models/Refund.js` | PASS | 2026-11-12 |
| Lifecycle Duplicate| Duplicate refund status update rejected with 400 Bad Request | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Lifecycle Terminal | Transition from terminal `completed` status rejected with 400 | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Lifecycle Retry | Failed refund retried to `processing` (200 OK) | `POST /api/admin/refunds/:id/simulate` | PASS | 2026-11-12 |
| Policy Boundary | Exactly 24.00 hours before departure -> 10% charge tier | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Boundary | 23.99 hours before departure -> 25% charge tier | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Boundary | Exactly 12.00 hours before departure -> 25% charge tier | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Boundary | 11.99 hours before departure -> 50% charge tier | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Boundary | Exactly 2.00 hours before departure -> 50% charge tier (eligible) | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Boundary | 1.99 hours before departure -> Cutoff window (ineligible / 0% refund) | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Policy Boundary | Past scheduled departure (-1.0h) -> Non-cancellable (0% refund) | `calculateSeatCancellation` | PASS | 2026-11-12 |
| Rollback State | Failed cancellation returns 404 cleanly | `POST /api/bookings/:id/cancel` | PASS | 2026-11-12 |
| Rollback State | SeatInventory activeSegments remain untouched and consistent | `backend/models/SeatInventory.js` | PASS | 2026-11-12 |
| Client Build | React 19 production build succeeds with Phase 7 components | `frontend/` | PASS (721ms) | 2026-11-12 |

### Phase 8: Reports, Analytics & Dashboard Verification (61 Tests Passed)
| Category | Test Case | Target | Result | Date |
|---|---|---|---|---|
| Admin Analytics | Fetches analytics overview with 200 OK | `GET /api/admin/analytics/overview` | PASS | 2026-11-12 |
| Admin Analytics | Total registered customers count | `User.countDocuments({ role: 'customer' })` | PASS | 2026-11-12 |
| Admin Analytics | Total registered operators count | `Operator.countDocuments()` | PASS | 2026-11-12 |
| Admin Analytics | Total buses count | `Bus.countDocuments()` | PASS | 2026-11-12 |
| Financial Math | Gross booking revenue from successful payments (₹4600) | `Payment.aggregate` | PASS | 2026-11-12 |
| Financial Math | Total refunds from completed refunds (₹900) | `Refund.aggregate` | PASS | 2026-11-12 |
| Financial Math | Net revenue strictly calculated as gross - refunds (₹3700) | `Math.max(0, gross - refunds)` | PASS | 2026-11-12 |
| Financial Math | Failed payments segregated and excluded from net revenue | `backend/controllers/reportController.js` | PASS | 2026-11-12 |
| Visual Analytics | Time series booking trends data array | `charts.bookingTrends` | PASS | 2026-11-12 |
| Visual Analytics | Booking status distribution array | `charts.bookingStatusDistribution` | PASS | 2026-11-12 |
| Date Filters | Preset `range=today` filtering | `parseDateRange` | PASS | 2026-11-12 |
| Date Filters | Applies today date range label | `parseDateRange` | PASS | 2026-11-12 |
| Date Filters | Preset `range=7days` filtering | `parseDateRange` | PASS | 2026-11-12 |
| Date Filters | Custom valid date range (startDate & endDate) | `parseDateRange` | PASS | 2026-11-12 |
| Date Filters | Rejects invalid date format with 400 Bad Request | `parseDateRange` | PASS | 2026-11-12 |
| Date Filters | Rejects `startDate > endDate` with 400 Bad Request | `parseDateRange` | PASS | 2026-11-12 |
| Operator Analytics | Operator fetches own analytics overview with 200 OK | `GET /api/operator/analytics/overview` | PASS | 2026-11-12 |
| Operator Fleet | Operator-owned fleet count (1 bus) | `Bus.countDocuments({ operatorId })` | PASS | 2026-11-12 |
| Operator Revenue | Gross revenue calculation for operator-owned trips | `backend/controllers/reportController.js` | PASS | 2026-11-12 |
| Operator Occupancy | Valid average occupancy percentage calculation | `backend/controllers/reportController.js` | PASS | 2026-11-12 |
| Operator Activity | Recent bookings activity list | `recentActivity.recentBookings` | PASS | 2026-11-12 |
| RBAC Protection | Customer blocked from operator analytics with 403 Forbidden | `GET /api/operator/analytics/overview` | PASS | 2026-11-12 |
| Occupancy Report | Admin fetches trip occupancy report with 200 OK | `GET /api/reports/occupancy` | PASS | 2026-11-12 |
| Occupancy Rows | Occupancy report returns populated trip rows | `GET /api/reports/occupancy` | PASS | 2026-11-12 |
| Occupancy Capacity | Accurate total seats capacity (30) | `totalSeats` | PASS | 2026-11-12 |
| Occupancy Seats | Accurate confirmed seats count (2) | `confirmedSeats` | PASS | 2026-11-12 |
| Occupancy Held | Held seats tracked separately from confirmed (1) | `heldSeats` | PASS | 2026-11-12 |
| Occupancy Available | Available seats calculated as Total - Confirmed - Held (27) | `availableSeats` | PASS | 2026-11-12 |
| Occupancy Math | Occupancy % calculated as (confirmed / total) * 100 (6.7%) | `occupancyPercentage` | PASS | 2026-11-12 |
| Operator Isolation | Operator fetches own occupancy report with 200 OK | `GET /api/operator/reports/occupancy` | PASS | 2026-11-12 |
| Operator Scoping | Operator occupancy report contains strictly own trips | `GET /api/operator/reports/occupancy` | PASS | 2026-11-12 |
| Manifest Admin | Admin fetches passenger manifest with 200 OK | `GET /api/reports/trips/:id/manifest` | PASS | 2026-11-12 |
| Manifest All | Manifest returns both confirmed and cancelled passengers | `GET /api/reports/trips/:id/manifest` | PASS | 2026-11-12 |
| Manifest Owner | Owning operator accesses own manifest with 200 OK | `GET /api/operator/reports/trips/:id/manifest` | PASS | 2026-11-12 |
| Manifest Isolation | Non-owning operator blocked with 403 Forbidden | `GET /api/reports/trips/:id/manifest` | PASS | 2026-11-12 |
| Manifest Filter | Status filter `confirmed` returns only confirmed passengers | `GET /api/reports/trips/:id/manifest?status=confirmed` | PASS | 2026-11-12 |
| Manifest Search | Searches manifest by passenger name successfully | `GET /api/reports/trips/:id/manifest?search=Pooja` | PASS | 2026-11-12 |
| Manifest Seat | Filters manifest by seatNumber successfully | `GET /api/reports/trips/:id/manifest?seat=1A` | PASS | 2026-11-12 |
| Refund Report | Admin fetches cancellations & refund report with 200 OK | `GET /api/admin/reports/cancellations` | PASS | 2026-11-12 |
| Cancel Count | Calculates total cancellations count correctly | `totalCancellations` | PASS | 2026-11-12 |
| Cancel Fee Math | Calculates total cancellation fee deduction correctly (₹100) | `totalCancellationCharges` | PASS | 2026-11-12 |
| Refund Amount | Calculates total refund amount correctly (₹900) | `totalRefundAmount` | PASS | 2026-11-12 |
| Refund Status | Tracks completed refunds in status breakdown | `statusBreakdown.completedCount` | PASS | 2026-11-12 |
| Refund Search | Searches refund report by PNR successfully | `GET /api/admin/reports/refunds?search=...` | PASS | 2026-11-12 |
| CSV Occupancy | Occupancy CSV export returns 200 OK | `GET /api/reports/occupancy?format=csv` | PASS | 2026-11-12 |
| CSV Header Mime | Occupancy CSV response header has Content-Type `text/csv` | `res.headers['content-type']` | PASS | 2026-11-12 |
| CSV Attachment | Occupancy CSV has attachment Content-Disposition header | `res.headers['content-disposition']` | PASS | 2026-11-12 |
| CSV Header Row | Occupancy CSV includes valid RFC 4180 header row | `backend/utils/csvHelper.js` | PASS | 2026-11-12 |
| CSV Manifest | Passenger Manifest CSV export returns 200 OK | `GET /api/reports/trips/:id/manifest?format=csv` | PASS | 2026-11-12 |
| CSV Manifest Mime| Passenger Manifest CSV has Content-Type `text/csv` | `res.headers['content-type']` | PASS | 2026-11-12 |
| CSV Manifest Row | Passenger Manifest CSV includes valid CSV header line | `backend/utils/csvHelper.js` | PASS | 2026-11-12 |
| CSV Bookings | Admin Bookings CSV export returns 200 OK | `GET /api/admin/analytics/bookings?format=csv` | PASS | 2026-11-12 |
| CSV Bookings Mime| Bookings CSV response has Content-Type `text/csv` | `res.headers['content-type']` | PASS | 2026-11-12 |
| CSV Revenue | Admin Revenue CSV export returns 200 OK | `GET /api/admin/analytics/revenue?format=csv` | PASS | 2026-11-12 |
| CSV Revenue Mime | Revenue CSV response has Content-Type `text/csv` | `res.headers['content-type']` | PASS | 2026-11-12 |
| CSV Op Revenue | Operator Revenue CSV export returns 200 OK | `GET /api/operator/analytics/revenue?format=csv` | PASS | 2026-11-12 |
| CSV Op Mime | Operator Revenue CSV has Content-Type `text/csv` | `res.headers['content-type']` | PASS | 2026-11-12 |
| Empty DB Status | Empty database returns 200 OK without errors | `GET /api/admin/analytics/overview` | PASS | 2026-11-12 |
| Empty DB Revenue | Returns 0 gross revenue when no payments exist | `grossBookingRevenue` | PASS | 2026-11-12 |
| Empty DB Net | Returns 0 net revenue when no payments exist | `netRevenue` | PASS | 2026-11-12 |
| Empty DB Occupy | Returns 0% average occupancy when no trips exist without NaN | `averageOccupancyPercentage` | PASS | 2026-11-12 |
| Client Build | React 19 production build succeeds with Phase 8 components | `frontend/` | PASS (915ms) | 2026-11-12 |

---

### Combined Test Suite Summary
- Phase 3 Tests: **45 Passed** (Foundation, 18 Collections, RBAC, Hashes)
- Phase 4 Tests: **25 Passed** (Integration Audit, Auth, Session, Security)
- Phase 5 Tests: **44 Passed** (Operator Approval, Fleet, Route, Schedules)
- Phase 6 Tests: **46 Passed** (Search, Segment Intervals, Holds, Passenger Booking)
- Phase 7 Tests: **105 Passed** (Simulated Payment, Ticket & PNR, Cancellations, Refunds, Policy Engine, Concurrency & Lifecycle)
- Phase 8 Tests: **61 Passed** (Admin Analytics, Operator Analytics, Occupancy Formula, Passenger Manifest, Cancellation/Refund Reports, CSV Exports, Date Filters, Empty DB Graceful Handling)
- Total Automated Backend Tests: **326**
- Tests Passing: **326 (100%)**
- Tests Failing: **0**
- Frontend Production Build: **PASS (915ms, 0 errors, 2,177 modules)**
