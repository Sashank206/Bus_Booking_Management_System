# BusGo System Architecture Overview

## 1. Architectural Style
BusGo is designed as a **Modular Monolith** full-stack web application.

```
+-------------------------------------------------------------+
|                     Client Tier (Browser)                   |
|      React 19 + Vite + Tailwind CSS v4 + React Router v7    |
|   (Customer Portal | Bus Operator Portal | Admin Portal)    |
+-------------------------------------------------------------+
                              |
                     HTTPS / JSON REST API
                              |
+-------------------------------------------------------------+
|                     Backend Application Tier                |
|               Node.js v22 + Express.js v5                   |
|                                                             |
|  [Security & Middleware]                                    |
|   - Helmet, CORS with credentials, Rate Limiting, JWT Auth  |
|                                                             |
|  [Modular Domain Controllers & Services]                    |
|   - Auth & User Management Service                          |
|   - Operator Management & Fleet Setup Service               |
|   - Bus, Stops & Route Management Service                   |
|   - Trip Scheduling & Segment Inventory Engine              |
|   - Booking & Atomic Seat Hold Engine                       |
|   - Simulated Idempotent Payment Service                    |
|   - Partial Cancellation & Policy-based Refund Engine       |
|   - Notification & Audit Logging Subsystem                  |
+-------------------------------------------------------------+
                              |
                     Mongoose ODM / MongoDB Driver
                              |
+-------------------------------------------------------------+
|                     Data Storage Tier                       |
|                   MongoDB / MongoDB Atlas                   |
|          18 Collections with Targeted Compound Indexes       |
|    - Users, Operators, Buses, Stops, Routes, RouteStops     |
|    - Trips, TripStops, SeatInventory                        |
|    - Bookings, Passengers, BookingSeats                     |
|    - Payments, Cancellations, CancellationItems, Refunds    |
|    - Notifications, AuditLogs                               |
+-------------------------------------------------------------+
```

## 2. Visual Architecture References
The complete visual architectural diagrams are located in this directory:
- [System Architecture Diagram (PNG)](System_Architecture.png)
- [System Architecture Specification (PDF)](System_Architecture.pdf)
- [System Architecture Source Model (Draw.io)](System_Full_Architecture.drawio)

## 3. Database Design References
- [Logical Database Design](../Database/database-design.md)
- [Indexes and Integrity Constraints](../Database/indexes-and-constraints.md)
- [Booking and Cancellation Workflows](../Database/booking-and-cancellation-workflow.md)
- [Database Schema (DBML)](../Database/busGo_final_ER_Diagram.dbml)
- [Final ER Diagram (PNG)](../Database/BusGo_Final_ER.png)
- [Final ER Diagram (PDF)](../Database/BusGo_Final_ER.pdf)

