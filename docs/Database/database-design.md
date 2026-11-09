# BusGo Database Design

## 1. Overview

BusGo is a bus booking management system using **MongoDB Atlas** with **Mongoose**. This document describes the logical database model used to guide the backend implementation.

Confirmed decisions:
- **Payment:** simulated payment only; no real money is collected.
- **Seat availability:** segment-based. A physical seat can be allocated to different passengers on the same trip when their journey segments do not overlap.
- **Cancellation:** partial cancellation at individual passenger/seat-allocation level.
- **Roles:** customer, operator and admin.

The DBML file is the editable logical ER model. It is not executable MongoDB schema code.

## 2. Technology and data modelling approach

| Item | Design |
|---|---|
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Identifiers | MongoDB ObjectId |
| Relationships | Referenced documents plus selected embedded documents |
| Validation | Mongoose validation and backend service rules |
| Integrity | Unique indexes, atomic updates and transactions where supported |

MongoDB references do not automatically enforce foreign keys. Backend services must check that referenced documents exist and belong to the expected user, operator, trip or booking.

## 3. Collection catalogue

The logical design contains 18 collections.

| # | Collection | Purpose |
|---:|---|---|
| 1 | `Users` | Login identity, profile, role and account status |
| 2 | `Operators` | Operator company details and admin approval |
| 3 | `Buses` | Vehicle details, capacity, seat layout and amenities |
| 4 | `Stops` | Boarding and dropping locations |
| 5 | `Routes` | Reusable route definition and endpoints |
| 6 | `RouteStops` | Ordered stops on a route |
| 7 | `Trips` | Scheduled journey using a bus and route |
| 8 | `TripStops` | Trip-specific stop sequence and timings |
| 9 | `SeatInventory` | One physical seat record per trip and its active segment allocations |
| 10 | `Bookings` | PNR, customer, trip and overall booking status |
| 11 | `Passengers` | Passenger details belonging to a booking |
| 12 | `BookingSeats` | Passenger seat allocation and journey segment |
| 13 | `Payments` | Simulated payment attempts |
| 14 | `Cancellations` | Cancellation request and policy calculation summary |
| 15 | `CancellationItems` | Individual seat allocations included in a cancellation |
| 16 | `Refunds` | Simulated refund records |
| 17 | `Notifications` | Booking and cancellation notifications |
| 18 | `AuditLogs` | Important customer, operator and admin actions |

## 4. Collection descriptions

### Users
Stores account identity and authentication data. Key fields include `name`, normalized unique `email`, `passwordHash`, `phone`, `role`, `accountStatus`, `emailVerified` and timestamps. Passwords must be hashed; plain-text passwords must never be stored.

### Operators
Stores an operator's company profile and approval state. `userId` references the operator's user account. `approvalStatus` can be pending, approved, rejected or suspended. Only approved and active operators should publish trips.

### Buses
Stores vehicle details, including `operatorId`, bus number/name/type, registration number, `totalSeats`, embedded `seatLayout`, embedded `amenities` and `isActive`. Generate a trip's seat inventory from the assigned bus layout when creating the trip.

### Stops
Stores reusable stop information such as stop name, city, state, address and optional coordinates.

### Routes
Defines a reusable route with source and destination stop references, distance, estimated duration and active status.

### RouteStops
Defines the ordered stops on a reusable route. `routeId`, `stopId`, `stopSequence` and `distanceFromStart` describe each route stop. The pair `(routeId, stopSequence)` must be unique.

### Trips
Represents one scheduled journey. It references a bus, operator and route and stores travel date, departure/arrival times, base fare and trip status. The backend must verify that the bus belongs to the operator and that the operator is approved before publishing the trip.

### TripStops
Stores the actual stop sequence and arrival/departure times for one trip. `RouteStops` defines reusable route order; `TripStops` defines the schedule for a particular trip.

### SeatInventory
Stores one document per physical seat per trip. It contains `tripId`, `seatNumber`, `seatType`, `isActive` and an embedded `activeSegments` array. The array is an operational allocation guard for current holds and confirmed allocations, not the permanent booking history.

### Bookings
Stores a customer's booking for one trip, including unique PNR, `userId`, `tripId`, total amount, booking date and status. For partial cancellation, status is an aggregate of the booking's individual seat allocations.

### Passengers
Stores passenger details for a booking. Passenger records should be retained after cancellation for manifest and audit history.

### BookingSeats
Stores one passenger's seat allocation for a journey segment. It references the booking, passenger, seat inventory, boarding stop and dropping stop, and stores `fromSequence`, `toSequence`, fare, allocation status and relevant timestamps. The segment is a half-open interval `[fromSequence, toSequence)`.

### Payments
Stores simulated payment attempts, including booking reference, idempotency key, method, amount, status and timestamps. Do not collect or store real card numbers, CVVs or banking credentials.

### Cancellations
Stores a cancellation request, requester, status, reason, a snapshot of the policy used, total cancellation charge and total refund amount. A booking may have multiple cancellation requests over time when different passenger allocations are cancelled separately.

### CancellationItems
Stores the individual `BookingSeats` records included in a cancellation. Each item stores the cancellation charge and refund amount for that allocation.

### Refunds
Stores simulated refund outcomes linked to a cancellation and payment. A completed simulated refund is a project status only; it does not represent a real transfer of money.

### Notifications
Stores notification type, message, delivery status and references to the recipient and optionally the booking. Notification delivery failure must not reverse a confirmed booking.

### AuditLogs
Stores important actions with optional user reference, action, entity type/id, description and timestamp. Do not store passwords, tokens or payment secrets in audit logs.

## 5. Main relationships

| Parent | Child | Relationship |
|---|---|---|
| Users | Operators | One user has zero or one operator profile |
| Operators | Buses | One operator manages many buses |
| Operators | Trips | One operator publishes many trips |
| Stops | Routes | A stop may be a route source or destination |
| Routes | RouteStops | One route has many ordered route stops |
| Stops | RouteStops | One stop may appear on many routes |
| Routes | Trips | One route can have many trips |
| Buses | Trips | One bus can serve many trips over time |
| Trips | TripStops | One trip has many scheduled stops |
| Trips | SeatInventory | One trip has one inventory document per physical seat |
| Users | Bookings | One customer can create many bookings |
| Trips | Bookings | One trip can have many bookings |
| Bookings | Passengers | One booking can contain many passengers |
| Bookings | BookingSeats | One booking can contain many seat allocations |
| SeatInventory | BookingSeats | One seat inventory record can be referenced by multiple allocations over time |
| Bookings | Payments | One booking can have multiple payment attempts |
| Bookings | Cancellations | One booking can have multiple cancellation requests |
| Cancellations | CancellationItems | One cancellation can include multiple seat allocations |
| CancellationItems | BookingSeats | Each item identifies one seat allocation |
| Cancellations | Refunds | A cancellation can have refund records |
| Payments | Refunds | A refund references the payment being refunded |
| Users | Notifications | One user can receive many notifications |
| Users | AuditLogs | One user can generate many audit events |

## 6. Embedded documents versus references

Use embedded documents for data naturally owned by a parent and commonly read with it:
- `Buses.seatLayout`
- `Buses.amenities`
- `SeatInventory.activeSegments`
- `Cancellations.policySnapshot`

Use references for independently managed entities or records with their own lifecycle:
- Users, Operators, Buses, Routes, Stops and Trips.
- Bookings, Passengers, BookingSeats and Payments.
- Cancellations, CancellationItems, Refunds, Notifications and AuditLogs.

## 7. Segment-based seat allocation

Each trip stop has an ordered sequence number. For a requested journey:
- `requestedFrom` is the boarding stop sequence.
- `requestedTo` is the dropping stop sequence.
- A valid journey requires `requestedFrom < requestedTo`.

Two intervals overlap when:

```text
existingFrom < requestedTo
AND
existingTo > requestedFrom
```

The interval is half-open: `[fromSequence, toSequence)`. Thus one passenger may alight at the same stop where another passenger boards. Only confirmed allocations and unexpired holds block a new reservation.

## 8. Data integrity

The backend must verify that:
- Referenced documents exist.
- Passenger and BookingSeat belong to the same booking.
- Booking and SeatInventory belong to the same trip.
- Boarding and dropping stops belong to the selected trip and are in the correct order.
- Seat number exists in the assigned bus layout.
- Bus ownership matches the operator publishing the trip.
- Only approved operators can publish trips.

Use MongoDB transactions for multi-document operations when the selected Atlas deployment supports them. Use atomic conditional updates on `SeatInventory` to prevent overlapping segment reservations.

## 9. Implementation notes and limitations

- DBML is a logical ER representation, not executable MongoDB schema code.
- A unique index on `{ tripId, seatNumber }` ensures one inventory document per seat per trip; it does not prevent overlapping segment allocations.
- MongoDB cannot enforce non-overlapping intervals in an array using a normal unique index. The application must perform an atomic conditional update.
- Do not treat a simple `availableSeats` count as the source of truth for segment-based availability. Calculate availability for the requested segment.
- Preserve booking, passenger, payment, cancellation and refund history rather than deleting records after cancellation.
- Store timestamps consistently in UTC and display them in the relevant trip location's time zone.

## 10. Conclusion

The BusGo model separates reusable route data, trip-specific schedules, physical seat inventory, passenger-level seat allocations and cancellation/refund history. This supports trip search, PNR booking, segment-based seat reuse, overlapping-reservation protection, simulated payments and partial cancellations.
