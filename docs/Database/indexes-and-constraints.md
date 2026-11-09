# BusGo Indexes and Constraints

## 1. Purpose

This document lists recommended MongoDB indexes and the business constraints required for BusGo. Indexes improve query performance and enforce selected uniqueness rules. Other rules must be implemented in Mongoose validation and backend services.

**Important:** MongoDB references do not automatically enforce foreign keys. A normal unique index also cannot prevent overlapping journey intervals stored in an array. These require application-level validation and atomic updates.

## 2. Recommended indexes

The following examples can be added to the corresponding Mongoose schemas. Verify them against the actual schema and query patterns before deployment.

### Users

```javascript
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, accountStatus: 1 });
```

- Normalize email consistently before saving.
- Enforce unique email addresses.
- Never store plain-text passwords.

### Operators

```javascript
operatorSchema.index({ userId: 1 }, { unique: true });
operatorSchema.index({ approvalStatus: 1 });
```

- One operator profile per user account.
- Only approved and active operators may publish trips.
- Verify `approvedBy` refers to an authorized admin.

### Buses

```javascript
busSchema.index({ registrationNumber: 1 }, { unique: true });
busSchema.index({ operatorId: 1, isActive: 1 });
```

- Registration number must be normalized before uniqueness checks.
- `totalSeats` must be a positive integer.
- Seat numbers must be unique within the bus layout.
- If registration numbers may be absent on draft records, use a partial unique index.

### Stops

```javascript
stopSchema.index({ city: 1, stopName: 1 });
```

Add a text or dedicated search index only if the implemented stop-search query needs it.

### Routes

```javascript
routeSchema.index({
  sourceStopId: 1,
  destinationStopId: 1,
  isActive: 1
});
```

- Source and destination must be different valid stops.
- Validate the route's ordered stop list against its endpoints.

### RouteStops

```javascript
routeStopSchema.index(
  { routeId: 1, stopSequence: 1 },
  { unique: true }
);

routeStopSchema.index({ routeId: 1, stopId: 1 });
```

- `stopSequence` must be a positive integer.
- A route cannot have two stops at the same sequence position.

### Trips

```javascript
tripSchema.index({
  routeId: 1,
  travelDate: 1,
  tripStatus: 1
});

tripSchema.index({
  operatorId: 1,
  travelDate: 1
});

tripSchema.index({
  busId: 1,
  travelDate: 1
});
```

- Departure must be earlier than arrival.
- Bus ownership must match the trip operator.
- Operator must be approved and active.
- Prevent overlapping schedules for the same bus with a service-level time-range check; a simple index does not enforce arbitrary time overlap.
- Use trip-specific stop schedules for journey validation.

### TripStops

```javascript
tripStopSchema.index(
  { tripId: 1, stopSequence: 1 },
  { unique: true }
);

tripStopSchema.index({ tripId: 1, stopId: 1 });
```

- Every stop must belong to the trip's route.
- Sequence must be unique within a trip.
- Arrival and departure times must be valid and consistent with the schedule.

### SeatInventory

```javascript
seatInventorySchema.index(
  { tripId: 1, seatNumber: 1 },
  { unique: true }
);

seatInventorySchema.index({ tripId: 1, isActive: 1 });
```

- Exactly one inventory document per seat per trip.
- Seat number must exist in the bus layout.
- `activeSegments` stores current held and confirmed allocations.
- Expired holds must not block new reservations.
- Do not create a unique index on `BookingSeats.seatInventoryId`: the same physical seat must be reusable for non-overlapping segments.

### Bookings

```javascript
bookingSchema.index({ pnr: 1 }, { unique: true });

bookingSchema.index({
  userId: 1,
  bookingDate: -1
});

bookingSchema.index({
  tripId: 1,
  bookingStatus: 1
});
```

- PNR must be unique.
- Booking must reference an existing customer and trip.
- Use a collision-resistant PNR generator and retry if a duplicate-key error occurs.
- Booking status must reflect the state of its seat allocations and payment.

### Passengers

```javascript
passengerSchema.index({ bookingId: 1 });
```

- Passenger must belong to the referenced booking.
- Validate required passenger fields and project-defined age rules.
- Preserve passenger records after partial cancellation.

### BookingSeats

```javascript
bookingSeatSchema.index({ bookingId: 1 });

bookingSeatSchema.index({
  seatInventoryId: 1,
  allocationStatus: 1
});

bookingSeatSchema.index({
  passengerId: 1,
  allocationStatus: 1
});
```

- `fromSequence < toSequence`.
- Boarding and dropping stops must belong to the same trip as the seat inventory.
- Passenger must belong to the same booking.
- Booking must belong to the same trip as the seat inventory.
- Seat number must match the referenced inventory document.
- Active allocations for the same physical seat must not overlap.
- Confirmed allocations must have a successful simulated payment.
- Segment fare must be non-negative.

### Payments

```javascript
paymentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" }
    }
  }
);

paymentSchema.index({ bookingId: 1, createdAt: -1 });

paymentSchema.index(
  { paymentReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentReference: { $type: "string" }
    }
  }
);
```

- Payment amount must be non-negative.
- Repeated requests using the same idempotency key must not create duplicate successful processing.
- Only backend-controlled simulated payment results can confirm a booking.
- Never collect or store real card numbers, CVVs or banking credentials.

### Cancellations

```javascript
cancellationSchema.index({
  bookingId: 1,
  requestedAt: -1
});

cancellationSchema.index({
  cancellationStatus: 1,
  requestedAt: 1
});
```

- Cancellation must belong to the booking being changed.
- Only confirmed, not-already-cancelled seat allocations can be cancelled.
- Store a snapshot of the cancellation policy used.
- A booking may have multiple cancellation requests over time.

### CancellationItems

```javascript
cancellationItemSchema.index(
  { cancellationId: 1, bookingSeatId: 1 },
  { unique: true }
);

cancellationItemSchema.index({ bookingSeatId: 1 });
```

- Item must reference a seat allocation from the same booking as its cancellation.
- A booking-seat allocation must not be cancelled twice.
- Cancellation charge and refund amount must be non-negative.
- Item totals must reconcile with the cancellation summary.

### Refunds

```javascript
refundSchema.index({ cancellationId: 1, createdAt: -1 });

refundSchema.index({
  refundStatus: 1,
  createdAt: 1
});
```

- Refund must reference a payment belonging to the same booking.
- Refund amount must be non-negative.
- Total refunds must not exceed the eligible amount paid.
- Refund status is simulated and does not imply that money was transferred.

### Notifications

```javascript
notificationSchema.index({
  userId: 1,
  createdAt: -1
});

notificationSchema.index({
  deliveryStatus: 1,
  createdAt: 1
});
```

Notification delivery failure must not reverse a successful booking.

### AuditLogs

```javascript
auditLogSchema.index({
  userId: 1,
  createdAt: -1
});

auditLogSchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1
});
```

Do not log passwords, tokens, payment secrets or unnecessary passenger personal information.

## 3. Critical business constraints

### 3.1 Reference integrity

Before writing a related document, validate that:
- The referenced document exists.
- Related documents belong to the same parent context.
- The current user is authorized to access or modify the resource.
- The operator owns the bus and trip being managed.

Mongoose `ref` supports population; it does not automatically enforce foreign-key integrity.

### 3.2 Segment overlap rule

Represent a journey as a half-open interval:

`[fromSequence, toSequence)`

Two intervals overlap when:

```text
existingFrom < requestedTo
AND
existingTo > requestedFrom
```

Rules:
- `fromSequence < toSequence`.
- Both sequence values refer to stops in the selected trip.
- Only confirmed allocations and unexpired holds block a request.
- Released, cancelled and expired allocations do not block a request.

### 3.3 Atomic seat reservation

The overlap check and allocation update must be atomic against the same `SeatInventory` document.

Do not use a separate read followed by an unconditional write; simultaneous requests could both observe an available seat.

Recommended behavior:
1. Validate trip and stop sequence.
2. Attempt a conditional update that succeeds only when no active overlapping segment exists.
3. Check whether a document was modified.
4. If no document was modified, return a seat-conflict response.
5. Coordinate related multi-document writes in a MongoDB transaction when supported.

The unique index on `{ tripId, seatNumber }` prevents duplicate inventory documents. It does not enforce interval non-overlap.

### 3.4 Multi-seat atomicity

If a customer selects multiple seats:
- Treat the selection as one logical operation.
- If any seat cannot be reserved, release every hold acquired by that attempt.
- Do not leave a partial selection reserved.
- Use a transaction for coordinated writes when supported.
- Make rollback and retry behavior explicit.

### 3.5 Hold expiry

- Every hold has an expiry timestamp.
- Expired holds are inactive during every reservation check.
- A cleanup worker may mark expired holds and release them.
- Do not rely only on MongoDB TTL deletion; TTL cleanup is asynchronous and does not implement segment overlap rules.
- Keep `BookingSeats` and `SeatInventory` allocation state consistent.

### 3.6 Simulated payment

- Payment status is controlled by backend logic.
- A pending booking cannot become confirmed before simulated payment succeeds.
- Repeated requests must be idempotent.
- Failed or expired payment attempts release their holds.
- Never trust a client-submitted successful payment status.

### 3.7 Partial cancellation

- Cancel only selected `BookingSeats` records.
- Create a `Cancellation` and its `CancellationItems`.
- Do not cancel other passengers' allocations.
- Release only the selected journey segments.
- Calculate charge/refund using the stored policy snapshot.
- Update aggregate booking status:
  - `confirmed`: all allocations remain confirmed.
  - `partially_cancelled`: some are cancelled and some remain confirmed.
  - `cancelled`: no active confirmed allocations remain.
- Preserve booking, passenger, payment and cancellation history.

### 3.8 Refund integrity

- Refund must reference the relevant cancellation and payment.
- Refund amount cannot exceed the eligible amount.
- A failed simulated refund remains failed; do not silently mark it completed.
- Repeated refund processing must be idempotent.

## 4. Suggested validation rules

| Field or condition | Validation |
|---|---|
| User email | Required, normalized and unique |
| Password hash | Required; generated server-side |
| User role | Allowed enum value |
| Operator approval | Admin-only action |
| Bus seat count | Positive integer |
| Route endpoints | Valid and different stops |
| Stop sequence | Positive integer and unique within route/trip |
| Trip schedule | Arrival later than departure |
| Trip ownership | Bus operator matches trip operator |
| Seat number | Exists in bus layout |
| Segment | `fromSequence < toSequence` |
| Booking PNR | Required and unique |
| Passenger | Belongs to booking |
| Payment amount | Non-negative |
| Cancellation amount | Non-negative |
| Refund amount | Non-negative and within eligible amount |

## 5. Suggested API error behavior

| Scenario | HTTP status |
|---|---:|
| Invalid input | 400 |
| Unauthenticated request | 401 |
| Insufficient permission | 403 |
| Referenced resource not found | 404 |
| Duplicate email, PNR or unique key | 409 |
| Seat segment already held/booked | 409 |
| Invalid state transition | 409 |
| Unexpected server error | 500 |

Do not expose stack traces, credentials or internal implementation details in production responses.

## 6. Index deployment and maintenance

- Define indexes in Mongoose schemas or controlled database initialization scripts.
- Check existing data for duplicates before creating unique indexes.
- Create required indexes before accepting bookings.
- Use `explain()` on trip-search and booking-history queries.
- Avoid indexes that do not support actual query patterns.
- Keep index definitions under version control.
- Test indexes with representative seed data.

## 7. Integrity checklist

- [ ] Unique user email.
- [ ] Unique operator profile per user.
- [ ] Unique bus registration number.
- [ ] Unique route stop sequence.
- [ ] Unique trip stop sequence.
- [ ] Unique seat inventory per trip and seat.
- [ ] Unique PNR.
- [ ] Payment idempotency.
- [ ] Unique cancellation item per cancellation and booking seat.
- [ ] Reference ownership checks.
- [ ] Segment-overlap protection through atomic updates.
- [ ] Multi-seat rollback behavior.
- [ ] Hold expiry handling.
- [ ] Partial cancellation and refund reconciliation.
- [ ] Role and operator ownership enforcement.
- [ ] Automated duplicate and concurrency tests.

## 8. Conclusion

Indexes provide efficient lookups and selected uniqueness guarantees. Correct BusGo behavior also depends on server-side validation, authorization, atomic seat allocation, idempotent payment/refund processing and transaction handling. These controls must be implemented and tested in the backend rather than assumed from the ER diagram.
