# BusGo Booking and Cancellation Workflow

## 1. Purpose

This document describes the BusGo customer booking lifecycle: trip search, segment-based seat availability, temporary seat holds, simulated payment, PNR confirmation, partial cancellation and simulated refunds.

Confirmed decisions:
- Simulated payment only.
- Segment-based seat allocation.
- Partial cancellation at passenger/seat-allocation level.

## 2. Main collections involved

| Workflow stage | Collections |
|---|---|
| Trip search | Routes, RouteStops, Trips, TripStops |
| Seat availability | SeatInventory, BookingSeats |
| Booking creation | Bookings, Passengers, BookingSeats |
| Payment | Payments |
| Confirmation | Bookings, BookingSeats, SeatInventory, Notifications |
| Cancellation | Cancellations, CancellationItems, BookingSeats, SeatInventory |
| Refund | Refunds, Payments |
| Traceability | AuditLogs |

## 3. Trip search

1. Customer selects origin, destination and travel date.
2. Backend finds trips operating on the requested date.
3. Backend verifies that origin and destination are stops on the same trip.
4. Backend obtains their sequence values from `TripStops`.
5. A valid journey requires origin sequence to be lower than destination sequence.
6. Backend returns matching trips with departure/arrival information, route details, fare and availability for the requested segment.

Availability must be calculated for the selected origin-to-destination segment. A seat occupied on another portion of the route may still be available for the requested journey.

## 4. Segment-based seat availability

### 4.1 Example stop sequence

| Stop | Sequence |
|---|---:|
| Delhi | 0 |
| Ambala | 1 |
| Ludhiana | 2 |
| Jalandhar | 3 |
| Amritsar | 4 |

A Delhi-to-Ludhiana booking uses `[0, 2)`. A Ludhiana-to-Amritsar booking uses `[2, 4)`. These intervals do not overlap, so the same physical seat can be allocated to both passengers on the same trip.

### 4.2 Overlap rule

For an existing allocation `[existingFrom, existingTo)` and a requested allocation `[requestedFrom, requestedTo)`, the intervals overlap when:

```text
existingFrom < requestedTo
AND
existingTo > requestedFrom
```

| Existing allocation | Requested allocation | Result |
|---|---|---|
| Delhi → Ludhiana `[0,2)` | Ludhiana → Amritsar `[2,4)` | Allowed |
| Delhi → Ludhiana `[0,2)` | Ambala → Jalandhar `[1,3)` | Conflict |
| Ambala → Jalandhar `[1,3)` | Jalandhar → Amritsar `[3,4)` | Allowed |
| Delhi → Amritsar `[0,4)` | Ambala → Ludhiana `[1,2)` | Conflict |

Only confirmed allocations and unexpired holds block a new request.

## 5. Seat selection and temporary hold

1. Customer selects one or more seats.
2. Frontend sends trip ID, seat numbers, boarding stop and dropping stop.
3. Backend authenticates the customer.
4. Backend verifies that the trip exists and is bookable.
5. Backend verifies that both stops belong to the trip.
6. Backend validates `fromSequence < toSequence`.
7. Backend attempts an atomic conditional update on each relevant `SeatInventory` document.
8. The update succeeds only if no active overlapping segment exists.
9. A temporary hold is recorded with an expiry timestamp.
10. Corresponding `BookingSeats` records are created with `held` status as part of the booking process.

If any requested seat cannot be held, the entire multi-seat attempt must be rolled back or every hold acquired by that attempt must be released. Return a clear seat-conflict response.

### Concurrency requirement

Do not implement reservation as a separate read followed by an unconditional write. Two simultaneous requests could both read the seat as available.

The overlap check and allocation update must be atomic against the same `SeatInventory` document. Use MongoDB transactions to coordinate multi-document writes when the deployment supports transactions. A transaction does not replace the atomic overlap check.

## 6. Passenger details and pending booking

After seats are held:

1. Customer enters passenger details.
2. Backend validates each passenger.
3. Passenger records are stored in `Passengers`.
4. Each passenger is associated with the correct `BookingSeats` allocation.
5. Backend creates a `Bookings` document with a unique PNR and `pending_payment` status.
6. Backend calculates the booking total from selected segment fares.
7. Backend creates a `Payments` document with `pending` status and an idempotency key.

The PNR may be generated when the pending booking is created. The ticket must not be presented as confirmed until payment succeeds.

## 7. Simulated payment

BusGo uses simulated payment. No real money is collected, and the application must not request or store real card credentials.

1. Frontend displays booking amount and a simulated payment action.
2. Customer initiates the simulated payment.
3. Backend receives the attempt and checks its idempotency key.
4. Backend applies the configured simulation result, such as success or failure.
5. On success, payment status becomes `successful`.
6. Backend confirms the booking and seat allocations.
7. Matching `SeatInventory.activeSegments` entries change from held to confirmed.
8. Backend records confirmation timestamps.
9. Backend creates a notification and audit event.

On failure:
- Mark payment as `failed`.
- Do not confirm the booking.
- Release held segments.
- Mark corresponding `BookingSeats` as released or expired, as appropriate.
- Preserve failed payment and booking history.

The backend, not the frontend, controls the final payment result and booking status.

## 8. Booking confirmation and ticket

After successful simulated payment:
- Booking status becomes `confirmed`.
- Active `BookingSeats` records become `confirmed`.
- Corresponding `SeatInventory.activeSegments` entries become confirmed.
- PNR is shown to the customer.
- Ticket displays trip, passenger, seat, boarding, dropping, fare and booking details.
- A notification is recorded for delivery.

If email integration is configured, the notification may be delivered by email. Notification delivery failure must not reverse a confirmed booking.

## 9. Hold expiry

Every hold has a finite expiry time.

When a hold expires:
1. The booking/payment attempt is no longer eligible for confirmation under that hold.
2. The allocation is marked `expired` or `released`.
3. The corresponding active segment is removed or marked inactive in `SeatInventory`.
4. The seat becomes available for another customer if no other active overlapping allocation exists.

The backend must check expiry during every reservation attempt. A background cleanup task may also process expired holds. Do not rely only on MongoDB TTL deletion because TTL cleanup is asynchronous and does not implement segment-overlap rules.

## 10. Partial cancellation

A booking can contain multiple passengers and seat allocations. A customer may cancel selected allocations while keeping the others confirmed.

Example:

| Passenger | Seat | Segment | Initial status |
|---|---|---|---|
| Passenger 1 | A1 | Delhi → Ludhiana | Confirmed |
| Passenger 2 | A2 | Delhi → Ludhiana | Confirmed |
| Passenger 3 | A3 | Delhi → Ludhiana | Confirmed |

The customer requests cancellation of Passenger 2 only.

### 10.1 Cancellation steps

1. Customer opens booking details through an authenticated account.
2. Backend verifies booking ownership or authorized access.
3. Customer selects the passenger/seat allocation to cancel.
4. Backend verifies that the selected `BookingSeats` record belongs to the booking.
5. Backend verifies that the allocation is confirmed and not already cancelled.
6. Backend loads the applicable cancellation policy.
7. Backend stores a snapshot of the policy in `Cancellations.policySnapshot`.
8. Backend calculates cancellation charge and eligible refund.
9. Backend creates a `Cancellations` record.
10. Backend creates `CancellationItems` for the selected allocations.
11. Backend marks only the selected `BookingSeats` records as `cancelled`.
12. Backend releases only those allocations' segments from `SeatInventory.activeSegments`.
13. Backend creates a simulated `Refund` record when a refund is due.
14. Backend updates cancellation and aggregate booking status.
15. Backend records notifications and an audit event.

Coordinate related database changes transactionally where supported, so a failure does not leave booking, inventory and cancellation records inconsistent.

### 10.2 Cancellation result

| Passenger | Seat | Status after cancellation |
|---|---|---|
| Passenger 1 | A1 | Confirmed |
| Passenger 2 | A2 | Cancelled |
| Passenger 3 | A3 | Confirmed |

The booking status becomes `partially_cancelled`. The other passengers' allocations must remain unchanged.

If all confirmed allocations are cancelled, the booking status becomes `cancelled`.

## 11. Cancellation charge and refund calculation

The application should use a configurable cancellation policy. Exact percentages and time windows are project configuration decisions and should not be hard-coded in this document.

A general calculation is:

```text
eligibleAmount = amount paid for the selected seat allocation
cancellationCharge = policy-calculated charge
refundAmount = max(0, eligibleAmount - cancellationCharge)
```

The policy may depend on time remaining before departure or another configured rule.

Store the policy snapshot and calculated amounts with the cancellation so later policy changes do not rewrite historical results.

The sum of cancellation-item charges and refunds should reconcile with the cancellation summary.

## 12. Simulated refund

1. Backend creates a `Refund` record linked to the cancellation and original payment.
2. Refund starts with `pending` status.
3. Simulation service changes status to `processing`.
4. The configured simulated result changes it to `completed` or `failed`.
5. Backend stores the result and processing timestamp.
6. Customer can view simulated refund status in booking history.

A completed simulated refund is only a project status; it does not mean money has been transferred.

## 13. Booking status rules

| Situation | Booking status |
|---|---|
| Booking created, payment not completed | `pending_payment` |
| Payment successful and all allocations active | `confirmed` |
| Some allocations cancelled, others active | `partially_cancelled` |
| All confirmed allocations cancelled | `cancelled` |
| Hold/payment window expires | `expired` |
| Booking creation or payment process fails | `failed` |

The backend should derive or validate aggregate booking status after each allocation transition.

## 14. Transaction boundaries

Use a transaction-capable MongoDB deployment for multi-document operations where available.

### Reservation and confirmation

Coordinate:
- Booking creation/update.
- Passenger creation.
- BookingSeats creation/update.
- Payment record update.
- SeatInventory allocation state.

The conditional seat reservation must remain atomic. A transaction alone does not replace the overlap check.

### Partial cancellation

Coordinate:
- Cancellation creation.
- CancellationItems creation.
- BookingSeats status update.
- SeatInventory segment release.
- Refund record creation.
- Booking aggregate status update.

Send external email after the database transaction commits. A failed email must not roll back the booking or cancellation.

## 15. Suggested API endpoints

These are proposed endpoint names for implementation, not claims that the endpoints already exist.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/trips/search` | Search trips by origin, destination and date |
| GET | `/api/trips/:tripId/seats` | Get seat availability for a selected segment |
| POST | `/api/bookings/holds` | Temporarily hold selected seats |
| POST | `/api/bookings` | Create a pending booking |
| POST | `/api/payments/simulate` | Run a simulated payment attempt |
| GET | `/api/bookings/:bookingId` | View booking details |
| GET | `/api/bookings/:bookingId/ticket` | Retrieve ticket information |
| POST | `/api/bookings/:bookingId/cancellations` | Request partial cancellation |
| GET | `/api/bookings/:bookingId/cancellations` | View cancellation history |
| GET | `/api/cancellations/:cancellationId/refunds` | View simulated refund status |

Protect customer endpoints with authentication and booking-ownership checks. Apply operator/admin RBAC to their respective management and reporting endpoints.

## 16. Essential workflow tests

| Test | Expected result |
|---|---|
| Search with valid origin/destination | Matching trips returned |
| Destination sequence before origin | Request rejected |
| Same seat, non-overlapping segments | Both allocations allowed |
| Same seat, overlapping segments | Second allocation rejected |
| Two simultaneous requests for same segment | At most one succeeds |
| One seat unavailable in multi-seat request | No partial reservation remains |
| Simulated payment success | Booking and allocations confirmed |
| Simulated payment failure | Holds released; booking not confirmed |
| Repeated payment request with same key | No duplicate successful processing |
| Expired hold | Seat can be allocated again if no other conflict exists |
| Cancel one passenger | Only that passenger's allocation released |
| Cancel already-cancelled allocation | Request rejected |
| Cancel all remaining passengers | Booking becomes cancelled |
| Simulated refund success | Refund status becomes completed |
| Simulated refund failure | Refund status remains failed |
| Notification delivery failure | Booking status remains unchanged |

## 17. End-to-end workflow summary

```text
Customer searches trip
        |
        v
Select origin and destination
        |
        v
Validate trip stop sequence
        |
        v
Check segment-based seat availability
        |
        v
Atomically hold selected seats
        |
        v
Enter passenger details
        |
        v
Create pending booking and PNR
        |
        v
Run simulated payment
        |
   +----+----+
   |         |
 Success   Failure
   |         |
   v         v
Confirm    Release holds
booking    and mark failed
   |
   v
Issue ticket and notification
   |
   v
Customer requests partial cancellation
   |
   v
Validate selected passenger/seat
   |
   v
Calculate charge and refund
   |
   v
Release only selected seat segment
   |
   v
Create simulated refund record
   |
   v
Update booking status and history
```

## 18. Conclusion

This workflow supports BusGo's booking lifecycle while protecting seat availability across non-overlapping journey segments. Individual `BookingSeats` records enable passenger-level cancellation, while separate cancellation and refund records preserve history. Atomic seat updates, idempotency, backend authorization and transaction handling are essential to reliability.
