# BusGo — Demo Data & Manual Testing Guide

This guide documents the pre-populated fictional demo records in the **BusGo** MongoDB database, credentials for all roles, route network topology, and step-by-step procedures to manually test the customer booking workflow, segment seat allocation, operator dashboards, and administrative controls.

---

## 1. Demo Login Credentials

All seeded accounts share a development password:

> **Development Password:** `BusGo@Demo2026`

### 1.1 System Administrator
| Role | Name | Email | Password | Access Scope |
|---|---|---|---|---|
| Admin | System Administrator | `admin@busgo.com` | `BusGo@Demo2026` | Full platform control, operator approval/rejection, user suspension, global route/stop management, audit logs |

### 1.2 Approved Bus Operators
| Company Name | Contact Person | Email | Password | Fleet Details |
|---|---|---|---|---|
| **Rajesh Royal Express** | Rajesh Sharma | `rajesh@travels.com` | `BusGo@Demo2026` | 3 Buses: AC Sleeper, AC Seater, Volvo Multi-Axle |
| **Punjab Super Liner** | Harpreet Singh | `punjab@travels.com` | `BusGo@Demo2026` | 3 Buses: AC Sleeper, Non-AC Sleeper, AC Seater |
| **Deccan Southern Star** | Venkatesh Rao | `south@travels.com` | `BusGo@Demo2026` | 2 Buses: Volvo Multi-Axle, AC Sleeper |
| **Himalayan Heights Transport** | Mohit Negi | `himalayan@travels.com` | `BusGo@Demo2026` | 2 Buses: AC Seater, AC Sleeper |

### 1.3 Sample Customers
| Name | Email | Password | Pre-seeded Scenario |
|---|---|---|---|
| **Priya Sharma** | `priya.sharma@example.com` | `BusGo@Demo2026` | Confirmed 2-passenger booking (PNR: `BGDELAMR01`) |
| **Amit Kumar** | `amit.kumar@example.com` | `BusGo@Demo2026` | Confirmed 1-passenger booking (PNR: `BGDELJAI02`) |
| **Neha Gupta** | `neha.gupta@example.com` | `BusGo@Demo2026` | Segment booking [0, 2) on Seat 3A (PNR: `BGSEGREU01`) |
| **Rohit Verma** | `rohit.verma@example.com` | `BusGo@Demo2026` | Segment reuse booking [2, 4) on Seat 3A (PNR: `BGSEGREU02`) |
| **Ananya Reddy** | `ananya.reddy@example.com` | `BusGo@Demo2026` | Active 10-minute hold booking (PNR: `BGHOLDCHE4`) |
| **Vikram Singh** | `vikram.singh@example.com` | `BusGo@Demo2026` | Cancelled booking history (PNR: `BGCANCDEH5`) |
| **Pooja Patel** | `pooja.patel@example.com` | `BusGo@Demo2026` | Clean customer account for new booking testing |
| **Rahul Nair** | `rahul.nair@example.com` | `BusGo@Demo2026` | Clean customer account for new booking testing |
| **Divya Krishnan** | `divya.krishnan@example.com` | `BusGo@Demo2026` | Clean customer account for new booking testing |
| **Karan Malhotra** | `karan.malhotra@example.com` | `BusGo@Demo2026` | Clean customer account for new booking testing |

---

## 2. Seeded Route Network Topology

The database includes 15 Master Stops and 8 Master Routes across Northern, Southern, and Coastal India:

```text
[Delhi] ────── (245km) ─────> [Chandigarh] ─── (95km) ───> [Ludhiana] ─── (60km) ───> [Jalandhar] ─── (50km) ───> [Amritsar]
  │
  ├────── (280km) ─────> [Jaipur]
  ├────── (250km) ─────> [Dehradun]
  └────── (245km) ─────> [Chandigarh] ─── (110km) ──> [Shimla] ─── (185km) ───> [Manali]

[Bengaluru] ──── (340km) ────> [Chennai]
[Bengaluru] ──── (250km) ────> [Tirupati]
[Hyderabad] ──── (275km) ────> [Vijayawada] ─── (350km) ───> [Visakhapatnam]
```

### 2.1 Master Stops Catalog
1. **Delhi**: Kashmere Gate ISBT
2. **Chandigarh**: Sector 43 ISBT
3. **Ludhiana**: Ludhiana Bus Terminal
4. **Jalandhar**: Jalandhar City Bus Stand
5. **Amritsar**: Amritsar Golden Temple Bay
6. **Jaipur**: Sindhi Camp Central Stand
7. **Dehradun**: ISBT Dehradun Express Stand
8. **Shimla**: Shimla Old Bus Stand
9. **Manali**: Manali Private Bus Depot
10. **Bengaluru**: Majestic Inter-City Terminus
11. **Hyderabad**: MGBS Central Station
12. **Chennai**: Koyambedu CMBT
13. **Vijayawada**: PNBS Central Bus Station
14. **Visakhapatnam**: Dwaraka Bus Complex
15. **Tirupati**: Tirupati Central Bus Stand

---

## 3. Seeded Trips & Testing Scenarios

20 scheduled trips are distributed across routes, departure dates (Today, Tomorrow, Day +2, Day +3, Day +5), bus types, and time slots.

### 3.1 Route: Delhi to Amritsar (Test Filtering & Segment Reuse)
- **Trip 1 (Today, 06:00 AM)** — *Rajesh Royal Express* (Volvo Multi-Axle, ₹850).
  - **Seat Allocations:**
    - Seats `1A` & `1B`: Booked by Priya Sharma (PNR: `BGDELAMR01`) for the full journey [Delhi -> Amritsar].
    - Seat `3A`: **Segment Reuse Demonstration!**
      - Occupied by Neha Gupta for [Delhi -> Ludhiana] (intervals `[0, 2)`).
      - Occupied by Rohit Verma for [Ludhiana -> Amritsar] (intervals `[2, 4)`).
      - **Testing check:** Search `Delhi -> Ludhiana`: Seat 3A is occupied. Search `Ludhiana -> Amritsar`: Seat 3A is occupied. Search `Chandigarh -> Jalandhar`: Seat 3A is blocked because `[1, 3)` overlaps with both `[0, 2)` and `[2, 4)`.
    - Seats `1C`, `1D`, `2A`, `2B`, etc.: Completely available for booking.
- **Trip 2 (Tomorrow, 02:00 PM)** — *Punjab Super Liner* (AC Sleeper, ₹950). 100% available seats.
- **Trip 3 (Tomorrow, 10:30 PM)** — *Rajesh Royal Express* (AC Sleeper, ₹1100). Night departure.
- **Trip 4 (Day +2, 05:30 PM)** — *Punjab Super Liner* (AC Seater, ₹750). Economy evening trip.

### 3.2 Route: Delhi to Jaipur (Test Multiple Operators & Pricing)
- **Trip 5 (Today, 07:00 AM)** — *Rajesh Royal Express* (AC Seater, ₹550).
  - Seat `2A`: Confirmed booking by Amit Kumar (PNR: `BGDELJAI02`).
  - Remaining 39 seats available.
- **Trip 6 (Tomorrow, 03:00 PM)** — *Rajesh Royal Express* (Volvo Multi-Axle, ₹650).
- **Trip 7 (Day +2, 11:00 PM)** — *Rajesh Royal Express* (AC Sleeper, ₹750).

### 3.3 Route: Bengaluru to Chennai (Test Active Holds)
- **Trip 13 (Today, 06:30 AM)** — *Deccan Southern Star* (Volvo Multi-Axle, ₹780).
  - Seat `1A`: Temporary 10-minute hold by Ananya Reddy (PNR: `BGHOLDCHE4`).
- **Trip 14 (Tomorrow, 02:00 PM)** — *Deccan Southern Star* (AC Sleeper, ₹890).
- **Trip 15 (Day +2, 10:00 PM)** — *Deccan Southern Star* (Volvo Multi-Axle, ₹850).

### 3.4 Route: Delhi to Dehradun (Test Cancelled Bookings)
- **Trip 11 (Tomorrow, 08:30 AM)** — *Rajesh Royal Express* (AC Seater, ₹480).
  - PNR: `BGCANCDEH5` was previously booked by Vikram Singh and cancelled. Seat `1A` was released and is available.

---

## 4. Manual Testing Walkthroughs

### 4.1 Scenario A: Search, Filter, and Sort Buses
1. Open the frontend: `http://localhost:5173/search` (or click **Search Buses** in the top navigation).
2. Enter:
   - **From:** `Delhi`
   - **To:** `Amritsar`
   - **Date:** Select Today or Tomorrow.
3. Click **Search**.
4. Test Filtering:
   - Filter by **Bus Type**: Check `AC` or `Sleeper`. Verify non-matching buses are hidden.
   - Filter by **Departure Time**: Click `Morning (6 AM - 12 PM)` or `Afternoon (12 PM - 6 PM)`.
   - Filter by **Max Fare Slider**: Move slider to `₹800`. Notice higher-priced Volvo/Sleeper buses filter out.
   - Test **Sorting**: Switch between `Price: Low to High`, `Departure Time`, and `Seats Left`.

### 4.2 Scenario B: Segment Seat Map & Booking
1. On Trip 1 (`Delhi to Amritsar Grand Trunk Express`), click **Select Seats**.
2. Notice the live cabin layout:
   - Seats `1A` and `1B` are locked/occupied (Booked by Priya Sharma).
   - Click any free seat (e.g., `2A` and `2B`). Notice the green selection highlight and live total calculation at the bottom.
3. Click **Hold Seats & Enter Passenger Details**:
   - If not signed in, a modal prompts you to sign in. Log in as `pooja.patel@example.com` (`BusGo@Demo2026`).
   - The **Passenger Details Modal** opens with a **10-minute countdown timer** (`09:59`).
4. Enter passenger details:
   - Passenger 1: `Pooja Patel`, Age: `28`, Gender: `Female`.
   - Contact phone: `9876543216`.
5. Click **Confirm & Reserve**.
6. A verified electronic ticket opens with a unique PNR (e.g., `BG4A7D9E2F`) and passenger manifest. Click **Print Ticket** to preview printable styling.

### 4.3 Scenario C: Customer Dashboard & Isolation
1. While logged in as `pooja.patel@example.com`, navigate to `/customer/dashboard`.
2. Notice your newly confirmed reservation appears under **My Reservations & Travel History**.
3. Log out and sign in as `priya.sharma@example.com` (`BusGo@Demo2026`).
4. In Priya's dashboard, verify that PNR `BGDELAMR01` (Seats `1A, 1B`) is listed, and Pooja Patel's bookings are completely invisible (isolated).
5. Click **View Ticket** to inspect Priya's printable e-ticket.

### 4.4 Scenario D: Operator Fleet & Trips
1. Sign in as operator: `rajesh@travels.com` / `BusGo@Demo2026`.
2. Navigate to `/operator/dashboard` to view Rajesh Royal Express's live metrics:
   - Fleet Size: `3 buses`
   - Active scheduled trips: `7 trips`
3. Navigate to `/operator/trips` to view scheduled trips and passenger manifests.

### 4.5 Scenario E: Administrator Platform Controls
1. Sign in as admin: `admin@busgo.com` / `BusGo@Demo2026`.
2. Navigate to `/admin/dashboard`:
   - Inspect global platform metrics: Total Registered Customers (`10`), Approved Operators (`4`), Fleet Vehicles (`10`), Scheduled Trips (`20`), Bookings (`6`).
3. Navigate to `/admin/operators` to inspect operator profiles and compliance status.
4. Navigate to `/admin/stops-routes` to inspect master stops and route configurations.
5. Navigate to `/admin/audit-logs` to inspect the tamper-evident chronological audit trail.

---

## 5. Re-running the Seed Script

The seed script is safe to run multiple times:

```bash
npm run seed:demo --prefix backend
```

Output:
```text
====================================================================
                 DATABASE SEEDING COMPLETED                         
====================================================================
Users (Admin/Op/Cust)  : 0 created | 15 existing
Operators              : 0 created | 4 existing
Master Stops           : 0 created | 15 existing
Master Routes          : 0 created | 8 existing
Route Stops            : 0 created | 21 existing
Buses & Seat Layouts   : 0 created | 10 existing
Trips                  : 0 created | 20 existing
Trip Stops             : 0 created | 58 existing
Seat Inventories       : 0 created | 738 existing
Sample Bookings        : 0 created | 6 existing
====================================================================
```

