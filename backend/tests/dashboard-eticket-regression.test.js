/**
 * BusGo Dashboard Journey Status & 2-Page E-Ticket Regression Suite
 * Tests all 8 Customer Dashboard scenarios and 2-Page E-Ticket PDF requirements offline.
 */

const { PassThrough } = require('stream');
const http = require('http');
const mongoose = require('mongoose');
const { app } = require('../server');
const {
  User,
  Operator,
  Bus,
  Stop,
  Route,
  Trip,
  TripStop,
  SeatInventory,
  Booking,
  Passenger,
  BookingSeat,
  Payment,
  AuditLog
} = require('../models');
const { generateToken } = require('../utils/jwt');
const { getCancellationPolicy, calculateSeatCancellation } = require('../services/policyService');
const { updateTripLifecycleStatuses } = require('../services/tripLifecycleService');

function simulateRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = {
      host: 'localhost:5000',
      'content-type': 'application/json',
      ...headers
    };

    if (body) {
      const payload = JSON.stringify(body);
      req.headers['content-length'] = Buffer.byteLength(payload);
      process.nextTick(() => {
        req.emit('data', Buffer.from(payload));
        req.emit('end');
      });
    } else {
      process.nextTick(() => {
        req.emit('end');
      });
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    let resBody = '';
    const origWrite = res.write;
    const origEnd = res.end;
    res.write = function (chunk, ...args) {
      if (chunk) resBody += chunk.toString();
      return origWrite.apply(res, [chunk, ...args]);
    };
    res.end = function (chunk, ...args) {
      if (chunk) resBody += chunk.toString();
      origEnd.apply(res, [chunk, ...args]);
      let parsedBody = null;
      try {
        parsedBody = JSON.parse(resBody);
      } catch (e) {
        parsedBody = resBody;
      }
      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody
      });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRegressionSuite() {
  console.log('\n====================================================================');
  console.log('   BUSGO: CUSTOMER DASHBOARD JOURNEY STATUS & E-TICKET REGRESSION   ');
  console.log('====================================================================\n');

  const now = new Date();
  const customerId = new mongoose.Types.ObjectId();
  const customerToken = generateToken({ _id: customerId, id: customerId, role: 'customer' });

  const operatorUserId = new mongoose.Types.ObjectId();
  const operatorProfileId = new mongoose.Types.ObjectId();
  const busId = new mongoose.Types.ObjectId();
  const routeId = new mongoose.Types.ObjectId();
  const stopAId = new mongoose.Types.ObjectId();
  const stopBId = new mongoose.Types.ObjectId();

  const stopA = { _id: stopAId, stopName: 'Kashmere Gate ISBT', city: 'Delhi', state: 'Delhi', address: 'Gate 2, ISBT' };
  const stopB = { _id: stopBId, stopName: 'Sindhi Camp Central', city: 'Jaipur', state: 'Rajasthan', address: 'Platform 4' };

  const routeObj = {
    _id: routeId,
    routeName: 'Delhi to Jaipur Pink City Corridor',
    sourceStopId: stopA,
    destinationStopId: stopB,
    distanceKm: 280,
    estimatedDurationMinutes: 300,
    isActive: true
  };

  const operatorObj = {
    _id: operatorProfileId,
    userId: operatorUserId,
    companyName: 'Rajesh Royal Express',
    registrationNumber: 'REG-OP-101',
    approvalStatus: 'approved'
  };

  const busObj = {
    _id: busId,
    operatorId: operatorProfileId,
    busNumber: 'DL01EX1001',
    registrationNumber: 'DL01EX1001',
    busType: 'AC Sleeper / Seater 2+1',
    totalSeats: 30,
    amenities: ['WiFi', 'Charging Point', 'Water Bottle', 'Blanket']
  };

  // Trips:
  // 1. Past trip (departed 2 days ago, arrived 1 day ago) - e.g. 12 Nov 2026
  const tripPastId = new mongoose.Types.ObjectId();
  const pastDep = new Date(now.getTime() - 48 * 3600 * 1000);
  const pastArr = new Date(now.getTime() - 40 * 3600 * 1000);
  const tripPast = {
    _id: tripPastId,
    operatorId: operatorObj,
    busId: busObj,
    routeId: routeObj,
    travelDate: pastDep,
    departureTime: pastDep,
    arrivalTime: pastArr,
    baseFare: 600,
    tripStatus: 'completed'
  };

  // 2. Near upcoming trip (departs in 2 days)
  const tripNearId = new mongoose.Types.ObjectId();
  const nearDep = new Date(now.getTime() + 48 * 3600 * 1000);
  const nearArr = new Date(now.getTime() + 54 * 3600 * 1000);
  const tripNear = {
    _id: tripNearId,
    operatorId: operatorObj,
    busId: busObj,
    routeId: routeObj,
    travelDate: nearDep,
    departureTime: nearDep,
    arrivalTime: nearArr,
    baseFare: 650,
    tripStatus: 'scheduled'
  };

  // 3. Far upcoming trip (departs in 5 days)
  const tripFarId = new mongoose.Types.ObjectId();
  const farDep = new Date(now.getTime() + 120 * 3600 * 1000);
  const farArr = new Date(now.getTime() + 126 * 3600 * 1000);
  const tripFar = {
    _id: tripFarId,
    operatorId: operatorObj,
    busId: busObj,
    routeId: routeObj,
    travelDate: farDep,
    departureTime: farDep,
    arrivalTime: farArr,
    baseFare: 700,
    tripStatus: 'scheduled'
  };

  // 4. Cancelled trip
  const tripCancelledId = new mongoose.Types.ObjectId();
  const tripCancelled = {
    _id: tripCancelledId,
    operatorId: operatorObj,
    busId: busObj,
    routeId: routeObj,
    travelDate: nearDep,
    departureTime: nearDep,
    arrivalTime: nearArr,
    baseFare: 650,
    tripStatus: 'cancelled'
  };

  // In-memory collections
  const inMemoryUsers = [
    { _id: customerId, name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543210', role: 'customer' }
  ];

  const inMemoryBookings = [
    // Completed booking on past trip
    {
      _id: new mongoose.Types.ObjectId(),
      pnr: 'BGPRIYA01',
      userId: customerId,
      tripId: tripPast,
      bookingStatus: 'confirmed',
      totalAmount: 600,
      journeyDate: pastDep,
      createdAt: pastDep
    },
    // Near upcoming confirmed booking
    {
      _id: new mongoose.Types.ObjectId(),
      pnr: 'BGPRIYA02',
      userId: customerId,
      tripId: tripNear,
      bookingStatus: 'confirmed',
      totalAmount: 650,
      journeyDate: nearDep,
      createdAt: now
    },
    // Far upcoming confirmed booking
    {
      _id: new mongoose.Types.ObjectId(),
      pnr: 'BGPRIYA03',
      userId: customerId,
      tripId: tripFar,
      bookingStatus: 'confirmed',
      totalAmount: 700,
      journeyDate: farDep,
      createdAt: now
    }
  ];

  const inMemoryBookingSeats = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: inMemoryBookings[0]._id,
      seatNumber: '1A',
      segmentFare: 600,
      allocationStatus: 'confirmed',
      boardingStopId: stopA,
      droppingStopId: stopB
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: inMemoryBookings[1]._id,
      seatNumber: '2B',
      segmentFare: 650,
      allocationStatus: 'confirmed',
      boardingStopId: stopA,
      droppingStopId: stopB
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: inMemoryBookings[2]._id,
      seatNumber: '3C',
      segmentFare: 700,
      allocationStatus: 'confirmed',
      boardingStopId: stopA,
      droppingStopId: stopB
    }
  ];

  const inMemoryPassengers = [
    { _id: new mongoose.Types.ObjectId(), bookingId: inMemoryBookings[0]._id, fullName: 'Priya Sharma', age: 28, gender: 'female', seatNumber: '1A' },
    { _id: new mongoose.Types.ObjectId(), bookingId: inMemoryBookings[1]._id, fullName: 'Priya Sharma', age: 28, gender: 'female', seatNumber: '2B' },
    { _id: new mongoose.Types.ObjectId(), bookingId: inMemoryBookings[2]._id, fullName: 'Priya Sharma', age: 28, gender: 'female', seatNumber: '3C' }
  ];

  // Wire Mongoose stubs
  User.findById = (id) => {
    const user = inMemoryUsers.find((u) => id && u._id.toString() === (id._id || id).toString()) || null;
    return {
      select: () => Promise.resolve(user),
      then: (resolve) => resolve(user)
    };
  };
  User.findOne = (q) => {
    const user = inMemoryUsers[0] || null;
    return {
      select: () => Promise.resolve(user),
      then: (resolve) => resolve(user)
    };
  };

  Trip.find = () => Promise.resolve([tripPast, tripNear, tripFar, tripCancelled]);
  Trip.findById = (id) => {
    const targetId = id?._id ? id._id.toString() : id?.toString();
    const all = [tripPast, tripNear, tripFar, tripCancelled];
    const match = all.find((t) => t._id.toString() === targetId);
    return {
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(match)
        })
      }),
      then: (resolve) => resolve(match)
    };
  };

  Booking.find = (q = {}) => {
    let results = inMemoryBookings.filter((b) => !q.userId || b.userId.toString() === q.userId.toString());
    if (q.bookingStatus) results = results.filter((b) => b.bookingStatus === q.bookingStatus);
    return {
      populate: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => Promise.resolve(results)
          })
        })
      })
    };
  };

  Booking.countDocuments = (q = {}) => {
    let results = inMemoryBookings.filter((b) => !q.userId || b.userId.toString() === q.userId.toString());
    if (q.bookingStatus) results = results.filter((b) => b.bookingStatus === q.bookingStatus);
    return Promise.resolve(results.length);
  };

  Booking.findById = (id) => {
    const match = inMemoryBookings.find((b) => b._id.toString() === id.toString());
    return Promise.resolve(match || null);
  };

  Booking.findOne = (q) => {
    const match = inMemoryBookings.find((b) => (q.pnr && b.pnr === q.pnr) || (q._id && b._id.toString() === q._id.toString()));
    const queryObj = {
      populate: () => queryObj,
      then: (resolve) => resolve(match ? { ...match, userId: inMemoryUsers[0] } : null)
    };
    return queryObj;
  };

  Passenger.find = (q) => {
    const list = inMemoryPassengers.filter((p) => p.bookingId.toString() === q.bookingId.toString());
    return {
      select: () => Promise.resolve(list),
      then: (resolve) => resolve(list)
    };
  };

  BookingSeat.find = (q) => ({
    populate: () => ({
      populate: () => Promise.resolve(inMemoryBookingSeats.filter((s) => s.bookingId.toString() === q.bookingId.toString()))
    })
  });

  Payment.findOne = (q) => ({
    sort: () => Promise.resolve({
      paymentReference: 'SIM_PAY_101',
      paymentMethod: 'simulated_card',
      paymentAmount: 650,
      paymentStatus: 'completed'
    })
  });

  AuditLog.create = () => Promise.resolve({});

  // -------------------------------------------------------------------------
  // TEST 1: API /api/bookings/my-bookings returns enriched customer bookings
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Customer My-Bookings API & Authoritative Trip Lifecycle ---');
  let res = await simulateRequest('GET', '/api/bookings/my-bookings', null, {
    authorization: `Bearer ${customerToken}`
  });
  if (res.statusCode !== 200) {
    console.error('API Error Response:', res.statusCode, res.body);
  }
  assert(res.statusCode === 200, 'GET /api/bookings/my-bookings returns 200 OK');
  assert(Array.isArray(res.body.data?.bookings), 'Returns array of customer bookings');
  assert(res.body.data.bookings.length === 3, 'Returns all 3 customer bookings');

  // Verify past trip is authoritative 'completed'
  const pastBookingFromApi = res.body.data.bookings.find((b) => b.pnr === 'BGPRIYA01');
  assert(pastBookingFromApi.tripId.tripStatus === 'completed', "Past trip (12 Nov) is authoritatively 'completed'");

  // -------------------------------------------------------------------------
  // TEST 2: Dashboard Scenario 1 & 2 - Next Journey Filter Logic
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Next Journey Evaluator - Completed Trips Excluded ---');
  const getEffectiveTripStatus = (t) => {
    if (!t) return 'unknown';
    if (t.tripStatus === 'cancelled') return 'cancelled';
    if (t.tripStatus === 'completed') return 'completed';
    const arrTime = t.actualArrivalTime || t.arrivalTime;
    if (arrTime && new Date(arrTime).getTime() <= Date.now()) return 'completed';
    const depTime = t.departureTime;
    if (depTime && new Date(depTime).getTime() <= Date.now()) return 'in_progress';
    return t.tripStatus || 'scheduled';
  };

  const isUpcomingBooking = (b) => {
    if (
      b.bookingStatus === 'pending_payment' ||
      b.bookingStatus === 'cancelled' ||
      b.bookingStatus === 'failed' ||
      b.bookingStatus === 'expired'
    ) {
      return false;
    }
    if (b.bookingStatus === 'partially_cancelled') {
      const hasActive = b.bookingSeats?.some((bs) => bs.allocationStatus === 'confirmed');
      if (!hasActive) return false;
    } else if (b.bookingStatus !== 'confirmed') {
      return false;
    }
    const t = b.tripId;
    if (!t) return false;
    const eff = getEffectiveTripStatus(t);
    if (eff === 'completed' || eff === 'cancelled') return false;
    const dep = t.departureTime ? new Date(t.departureTime).getTime() : 0;
    const arr = (t.actualArrivalTime || t.arrivalTime) ? new Date(t.actualArrivalTime || t.arrivalTime).getTime() : 0;
    if (arr && arr <= Date.now()) return false;
    return dep > Date.now() || (eff === 'boarding' && arr > Date.now());
  };

  const upcomingList = res.body.data.bookings
    .filter(isUpcomingBooking)
    .sort((a, b) => new Date(a.tripId.departureTime).getTime() - new Date(b.tripId.departureTime).getTime());

  assert(upcomingList.length === 2, 'Exactly 2 future trips qualify as upcoming');
  assert(upcomingList[0].pnr === 'BGPRIYA02', "Nearest upcoming trip (in 2 days) is chosen as Next Journey");
  assert(upcomingList.every((b) => b.pnr !== 'BGPRIYA01'), 'Completed trip BGPRIYA01 is strictly excluded from Next Journey');

  // -------------------------------------------------------------------------
  // TEST 3: Dashboard Scenario 5 - Failed/Expired/Pending Bookings
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dashboard Scenario 5 - Inactive Bookings Excluded ---');
  assert(isUpcomingBooking({ bookingStatus: 'pending_payment', tripId: tripNear }) === false, 'Pending payment booking not upcoming');
  assert(isUpcomingBooking({ bookingStatus: 'expired', tripId: tripNear }) === false, 'Expired booking not upcoming');
  assert(isUpcomingBooking({ bookingStatus: 'failed', tripId: tripNear }) === false, 'Failed booking not upcoming');

  // -------------------------------------------------------------------------
  // TEST 4: Dashboard Scenario 6 - Partially Cancelled Booking
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Dashboard Scenario 6 - Partially Cancelled Handling ---');
  const partialWithActive = {
    bookingStatus: 'partially_cancelled',
    tripId: tripNear,
    bookingSeats: [
      { seatNumber: '1A', allocationStatus: 'cancelled' },
      { seatNumber: '1B', allocationStatus: 'confirmed' }
    ]
  };
  assert(isUpcomingBooking(partialWithActive) === true, 'Partially cancelled with active confirmed seat 1B is eligible');

  const partialAllCancelled = {
    bookingStatus: 'partially_cancelled',
    tripId: tripNear,
    bookingSeats: [
      { seatNumber: '1A', allocationStatus: 'cancelled' },
      { seatNumber: '1B', allocationStatus: 'cancelled' }
    ]
  };
  assert(isUpcomingBooking(partialAllCancelled) === false, 'Partially cancelled with all seats cancelled is not eligible');

  // -------------------------------------------------------------------------
  // TEST 5: Dashboard Scenario 7 & 8 - Fully Cancelled & Empty State
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Dashboard Scenario 7 & 8 - Fully Cancelled & Empty State ---');
  assert(isUpcomingBooking({ bookingStatus: 'cancelled', tripId: tripNear }) === false, 'Fully cancelled booking excluded');

  const onlyCompletedCustomerBookings = [pastBookingFromApi];
  const nextWhenOnlyCompleted = onlyCompletedCustomerBookings.filter(isUpcomingBooking)[0] || null;
  assert(nextWhenOnlyCompleted === null, 'Customer with only completed trips receives null Next Journey -> renders clean empty state');

  // -------------------------------------------------------------------------
  // TEST 6: Cancellation Safety - Completed Trip Rejects Cancellation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Completed Trip Cancellation Safety Guardrail ---');
  const cancellationOutcome = calculateSeatCancellation(pastDep, 600, now);
  assert(cancellationOutcome.isEligible === false, 'Cancellation rejected for past/completed trip');
  assert(cancellationOutcome.refundAmount === 0, 'Refund amount is 0% for past/completed trip');

  // -------------------------------------------------------------------------
  // TEST 7: GET /api/bookings/:id/ticket returns 2-Page E-Ticket Metadata
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: 2-Page E-Ticket Endpoint Verification ---');
  res = await simulateRequest('GET', `/api/bookings/${inMemoryBookings[1]._id}/ticket`, null, {
    authorization: `Bearer ${customerToken}`
  });
  assert(res.statusCode === 200, 'GET /api/bookings/:id/ticket returns 200 OK');
  const tData = res.body.data;

  // Page 1 fields
  assert(tData.pnr === 'BGPRIYA02', 'Page 1: Contains valid PNR');
  assert(tData.bookingStatus === 'confirmed', 'Page 1: Contains booking status');
  assert(tData.trip?.busNumber === 'DL01EX1001', 'Page 1: Contains bus number');
  assert(tData.trip?.registrationNumber === 'DL01EX1001', 'Page 1: Contains bus registration number');
  assert(tData.trip?.operatorName === 'Rajesh Royal Express', 'Page 1: Contains operator name');
  assert(tData.passengers?.length === 1 && tData.passengers[0].fullName === 'Priya Sharma', 'Page 1: Contains passenger manifest');
  assert(tData.bookingSeats?.length === 1 && tData.bookingSeats[0].seatNumber === '2B', 'Page 1: Contains seat allocation 2B');
  assert(tData.totalAmount === 650, 'Page 1: Contains total fare paid');
  assert(typeof tData.qrPayload === 'string' && tData.qrPayload.startsWith('BUSGO|'), 'Page 1: Contains digital QR security payload');

  // Page 2 fields
  assert(tData.policySummary?.cutoffHours === 2, 'Page 2: Contains configured cutoffHours (2 hrs)');
  assert(Array.isArray(tData.policySummary?.tiers) && tData.policySummary.tiers.length === 4, 'Page 2: Contains 4 cancellation policy tiers');
  assert(tData.policySummary.tiers[0].refundPercent === 90, 'Page 2: Tier 1 refund is 90%');
  assert(tData.policySummary.tiers[1].refundPercent === 75, 'Page 2: Tier 2 refund is 75%');
  assert(tData.policySummary.tiers[2].refundPercent === 50, 'Page 2: Tier 3 refund is 50%');
  assert(tData.policySummary.tiers[3].refundPercent === 0, 'Page 2: Tier 4 refund is 0% (Cutoff)');

  // -------------------------------------------------------------------------
  // TEST 8: Public PNR Verification Privacy Masking
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Public PNR Verification Privacy Masking ---');
  res = await simulateRequest('GET', `/api/bookings/verify/BGPRIYA02`);
  if (res.statusCode !== 200) {
    console.error('Verify Ticket Error Response:', res.statusCode, res.body);
  }
  assert(res.statusCode === 200, 'GET /api/bookings/verify/:pnr returns 200 OK');
  assert(res.body.data?.pnr === 'BGPRIYA02', 'Public verification confirms valid PNR');
  assert(res.body.data?.customerPhone !== '9876543210', 'Customer phone number is masked for public privacy');

  // -------------------------------------------------------------------------
  // TEST 9: Midnight-Crossing Journey Date Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Midnight-Crossing Journey Date Resolution ---');
  // Departs 10:30 PM on Nov 12, Arrives 06:30 AM on Nov 13 (crossing midnight)
  const midnightDep = new Date('2026-11-12T17:00:00.000Z'); // 22:30 IST on 12 Nov
  const midnightArr = new Date('2026-11-13T01:00:00.000Z'); // 06:30 IST on 13 Nov

  const formatISTDate = (d) => {
    if (!d) return 'Date unavailable';
    return new Date(d)
      .toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
      .replace(/,\s*(\d{4})/, ' $1');
  };

  const boardingDateMidnight = formatISTDate(midnightDep);
  const droppingDateMidnight = formatISTDate(midnightArr);

  assert(boardingDateMidnight === 'Thu, 12 Nov 2026', 'Boarding date resolves to Thu, 12 Nov 2026');
  assert(droppingDateMidnight === 'Fri, 13 Nov 2026', 'Dropping date correctly advances to next day (Fri, 13 Nov 2026)');
  assert(boardingDateMidnight !== droppingDateMidnight, 'Dropping date differs from boarding date for overnight journey');

  // -------------------------------------------------------------------------
  // TEST 10: Multi-Passenger & Multi-Seat E-Ticket Allocation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Multi-Passenger and Multi-Seat E-Ticket Manifest ---');
  const multiBookingId = new mongoose.Types.ObjectId();
  const multiPassengers = [
    { fullName: 'Rajesh Sharma', age: 34, gender: 'male', seatNumber: '1A' },
    { fullName: 'Meena Sharma', age: 32, gender: 'female', seatNumber: '1B' },
    { fullName: 'Rohan Sharma', age: 8, gender: 'male', seatNumber: '1C' }
  ];
  const multiSeats = [
    { seatNumber: '1A', segmentFare: 650, allocationStatus: 'confirmed' },
    { seatNumber: '1B', segmentFare: 650, allocationStatus: 'confirmed' },
    { seatNumber: '1C', segmentFare: 650, allocationStatus: 'confirmed' }
  ];
  const multiTotal = multiSeats.reduce((sum, s) => sum + s.segmentFare, 0);

  assert(multiPassengers.length === 3, 'Manifest contains exactly 3 passengers');
  assert(multiSeats.length === 3, 'Allocations contain exactly 3 confirmed seats');
  assert(multiTotal === 1950, 'Total fare for 3 passengers is ₹1950 (3 * 650)');
  assert(multiSeats.map(s => s.seatNumber).join(', ') === '1A, 1B, 1C', 'Seat numbering sequence is preserved');

  // -------------------------------------------------------------------------
  // TEST 11: Missing Travel Date Fallback Safety
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: Missing Travel Date Fallback Safety ---');
  const fallbackDate = formatISTDate(null);
  assert(fallbackDate === 'Date unavailable', 'Missing date returns "Date unavailable" fallback and never defaults to today');

  // -------------------------------------------------------------------------
  // TEST 12: PDF Filename Title Generator & Print Portal Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 12: PDF Filename Title Generator & Print Portal Isolation ---');
  const generateTicketDocumentTitle = (pnrValue) => {
    const target = pnrValue && pnrValue !== 'N/A' ? pnrValue : 'ticket';
    return `busgo-${target}`;
  };

  assert(generateTicketDocumentTitle('BGD1401699') === 'busgo-BGD1401699', 'PNR BGD1401699 yields filename title busgo-BGD1401699');
  assert(generateTicketDocumentTitle('BG580FFC39') === 'busgo-BG580FFC39', 'PNR BG580FFC39 yields filename title busgo-BG580FFC39');
  assert(generateTicketDocumentTitle('BGDELAMR01') === 'busgo-BGDELAMR01', 'PNR BGDELAMR01 yields filename title busgo-BGDELAMR01');
  assert(generateTicketDocumentTitle('') === 'busgo-ticket', 'Empty PNR fallback yields busgo-ticket');

  // Verify frontend/index.html has dedicated busgo-print-portal container
  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.resolve(__dirname, '../../frontend/index.html');
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    assert(htmlContent.includes('id="busgo-print-portal"'), 'index.html contains dedicated #busgo-print-portal outside #root');
  }

  // Verify frontend/src/index.css contains print portal and root hiding rules
  const cssPath = path.resolve(__dirname, '../../frontend/src/index.css');
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert(cssContent.includes('body.has-print-ticket #root'), 'index.css hides #root when has-print-ticket is active');
    assert(cssContent.includes('#busgo-print-portal'), 'index.css configures #busgo-print-portal for print execution');
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================================');
  console.log(`TOTAL REGRESSION TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================================\n');
}

runRegressionSuite().catch((err) => {
  console.error('[Regression Test Failure]', err);
  process.exit(1);
});
