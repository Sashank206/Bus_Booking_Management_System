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

// Helper to simulate full Express requests and response parsing without opening loopback sockets
function simulateRequest(method, url, body = null, headers = {}, cookies = {}) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;

    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    req.headers = {
      host: 'localhost:5000',
      'content-type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
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
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, ...args) {
      if (chunk) resBody += chunk.toString();
      return originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = function (chunk, ...args) {
      if (chunk) resBody += chunk.toString();
      const result = originalEnd.apply(res, [chunk, ...args]);

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
  }
}

async function runPhase6Tests() {
  console.log('\n====================================================================');
  console.log('       BUSGO PHASE 6: CUSTOMER SEARCH & BOOKING TEST SUITE          ');
  console.log('====================================================================\n');

  // Test User IDs
  const customerId1 = new mongoose.Types.ObjectId();
  const customerId2 = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const operatorUserId = new mongoose.Types.ObjectId();
  const operatorProfileId = new mongoose.Types.ObjectId();

  const customerToken1 = generateToken({ id: customerId1.toString(), role: 'customer' });
  const customerToken2 = generateToken({ id: customerId2.toString(), role: 'customer' });
  const adminToken = generateToken({ id: adminId.toString(), role: 'admin' });

  const mockUsers = [
    {
      _id: customerId1,
      name: 'Rohan Customer',
      email: 'rohan@example.com',
      phone: '9876543210',
      role: 'customer',
      accountStatus: 'active'
    },
    {
      _id: customerId2,
      name: 'Sneha Customer',
      email: 'sneha@example.com',
      phone: '9123456780',
      role: 'customer',
      accountStatus: 'active'
    },
    {
      _id: adminId,
      name: 'Administrator',
      email: 'admin@busgo.com',
      role: 'admin',
      accountStatus: 'active'
    }
  ];

  const mockOperators = [
    {
      _id: operatorProfileId,
      userId: operatorUserId,
      companyName: 'Royal Intercity Express',
      registrationNumber: 'GSTIN07AABCR9999F1Z1',
      rating: 4.8,
      approvalStatus: 'approved'
    }
  ];

  // Stops: Delhi -> Mathura -> Agra -> Gwalior
  const stopDelhi = {
    _id: new mongoose.Types.ObjectId(),
    stopName: 'Kashmere Gate ISBT',
    city: 'Delhi',
    state: 'Delhi',
    isActive: true
  };
  const stopMathura = {
    _id: new mongoose.Types.ObjectId(),
    stopName: 'Mathura Junction Bus Bay',
    city: 'Mathura',
    state: 'Uttar Pradesh',
    isActive: true
  };
  const stopAgra = {
    _id: new mongoose.Types.ObjectId(),
    stopName: 'Idgah Bus Stand',
    city: 'Agra',
    state: 'Uttar Pradesh',
    isActive: true
  };
  const stopGwalior = {
    _id: new mongoose.Types.ObjectId(),
    stopName: 'Gwalior Central Bus Stand',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    isActive: true
  };

  const mockStops = [stopDelhi, stopMathura, stopAgra, stopGwalior];

  // Bus with seat layout: 4 rows x 4 cols = 16 seats
  const busLayoutSeats = [];
  const seatNumbers = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C', '3D', '4A', '4B', '4C', '4D'];
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 4; c++) {
      const idx = (r - 1) * 4 + (c - 1);
      busLayoutSeats.push({
        seatNumber: seatNumbers[idx],
        row: r,
        col: c,
        deck: 1,
        seatType: 'seater'
      });
    }
  }

  const mockBus = {
    _id: new mongoose.Types.ObjectId(),
    operatorId: operatorProfileId,
    busNumber: 'DL-01-EXP-5555',
    registrationNumber: 'DL01EX5555',
    busType: 'AC Seater',
    totalSeats: 16,
    seatLayout: {
      rows: 4,
      columns: 4,
      deckCount: 1,
      seats: busLayoutSeats
    },
    amenities: ['WiFi', 'Charging Point', 'Water Bottle'],
    isActive: true
  };

  const mockRoute = {
    _id: new mongoose.Types.ObjectId(),
    routeName: 'Delhi to Gwalior via Agra',
    sourceStopId: stopDelhi,
    destinationStopId: stopGwalior,
    isActive: true
  };

  const travelDate = new Date();
  travelDate.setUTCDate(travelDate.getUTCDate() + 1); // Tomorrow
  travelDate.setUTCHours(0, 0, 0, 0);

  const depTime = new Date(travelDate);
  depTime.setUTCHours(6, 0, 0, 0);
  const arrTime = new Date(travelDate);
  arrTime.setUTCHours(14, 0, 0, 0);

  const mockTrip = {
    _id: new mongoose.Types.ObjectId(),
    operatorId: mockOperators[0],
    busId: mockBus,
    routeId: mockRoute,
    travelDate,
    departureTime: depTime,
    arrivalTime: arrTime,
    baseFare: 800,
    tripStatus: 'scheduled'
  };

  // TripStops:
  // Delhi: seq 1 (dep 06:00)
  // Mathura: seq 2 (arr 08:30, dep 08:45)
  // Agra: seq 3 (arr 10:30, dep 10:45)
  // Gwalior: seq 4 (arr 14:00)
  const mockTripStops = [
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      stopId: stopDelhi,
      stopSequence: 1,
      departureTime: depTime
    },
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      stopId: stopMathura,
      stopSequence: 2,
      arrivalTime: new Date(travelDate.getTime() + 2.5 * 3600 * 1000),
      departureTime: new Date(travelDate.getTime() + 2.75 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      stopId: stopAgra,
      stopSequence: 3,
      arrivalTime: new Date(travelDate.getTime() + 4.5 * 3600 * 1000),
      departureTime: new Date(travelDate.getTime() + 4.75 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      stopId: stopGwalior,
      stopSequence: 4,
      arrivalTime: arrTime
    }
  ];

  // In-memory collections
  const mockSeatInventories = [];
  const mockBookings = [];
  const mockPassengers = [];
  const mockBookingSeats = [];
  const mockPayments = [];
  const mockAuditLogs = [];

  // Helper method: isAvailableForSegment for SeatInventory mock
  function isAvailableForSegment(fromSeq, toSeq, now = new Date()) {
    if (!this.isActive) return false;
    if (!this.activeSegments || this.activeSegments.length === 0) return true;

    return this.activeSegments.every((seg) => {
      // Dynamic Hold Expiration check
      if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now) {
        return true;
      }
      // Half-open interval overlap [from, to)
      const overlaps = seg.fromSequence < toSeq && seg.toSequence > fromSeq;
      return !overlaps;
    });
  }

  // Initialize SeatInventories for the 16 seats
  seatNumbers.forEach((sNum) => {
    const si = {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      seatNumber: sNum,
      seatType: 'seater',
      deck: 1,
      isActive: true,
      activeSegments: [],
      isAvailableForSegment,
      save: function () {
        return Promise.resolve(this);
      }
    };
    mockSeatInventories.push(si);
  });

  // Chainable query builder
  function makeChainableQuery(result) {
    const queryObj = {
      populate: () => queryObj,
      sort: () => queryObj,
      skip: () => queryObj,
      limit: () => queryObj,
      select: () => queryObj,
      lean: () => queryObj,
      exec: () => Promise.resolve(result),
      then: (resolve) => resolve(result),
      catch: () => queryObj
    };
    return queryObj;
  }

  // Patch Mongoose Models
  User.findById = function (id) {
    const u = mockUsers.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(u || null);
  };

  Stop.find = function (q = {}) {
    let list = [...mockStops];
    if (q._id) {
      list = list.filter((s) => s._id.toString() === q._id.toString());
    } else if (q.$or) {
      const term = q.$or[0].stopName?.$regex || q.$or[0].stopName;
      const regex = typeof term === 'string' ? new RegExp(term, 'i') : term;
      list = list.filter((s) => regex.test(s.stopName) || regex.test(s.city));
    }
    return makeChainableQuery(list);
  };

  Stop.findById = function (id) {
    const s = mockStops.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(s || null);
  };

  Trip.find = function (q = {}) {
    let list = [mockTrip];
    if (q.tripStatus) {
      list = list.filter((t) => t.tripStatus === q.tripStatus);
    }
    return makeChainableQuery(list);
  };

  Trip.findById = function (id) {
    if (id.toString() === mockTrip._id.toString()) {
      return makeChainableQuery(mockTrip);
    }
    return makeChainableQuery(null);
  };

  TripStop.find = function (q = {}) {
    let list = [...mockTripStops];
    if (q.tripId) {
      if (q.tripId.$in) {
        const ids = q.tripId.$in.map((i) => i.toString());
        list = list.filter((ts) => ids.includes(ts.tripId.toString()));
      } else {
        list = list.filter((ts) => ts.tripId.toString() === q.tripId.toString());
      }
    }
    return makeChainableQuery(list);
  };

  SeatInventory.find = function (q = {}) {
    let list = [...mockSeatInventories];
    if (q.tripId) {
      if (q.tripId.$in) {
        const ids = q.tripId.$in.map((i) => i.toString());
        list = list.filter((si) => ids.includes(si.tripId.toString()));
      } else {
        list = list.filter((si) => si.tripId.toString() === q.tripId.toString());
      }
    }
    if (q.seatNumber && q.seatNumber.$in) {
      list = list.filter((si) => q.seatNumber.$in.includes(si.seatNumber));
    }
    return makeChainableQuery(list);
  };

  SeatInventory.findOne = function (q = {}) {
    const si = mockSeatInventories.find((x) => {
      const matchTrip = !q.tripId || x.tripId.toString() === q.tripId.toString();
      const matchSeat = !q.seatNumber || x.seatNumber.toUpperCase() === q.seatNumber.toUpperCase();
      return matchTrip && matchSeat;
    });
    return makeChainableQuery(si || null);
  };

  Booking.find = function (q = {}) {
    let list = [...mockBookings];
    if (q.userId) {
      list = list.filter((b) => b.userId.toString() === q.userId.toString());
    }
    return makeChainableQuery(list);
  };

  Booking.countDocuments = function (q = {}) {
    let count = mockBookings.length;
    if (q.userId) {
      count = mockBookings.filter((b) => b.userId.toString() === q.userId.toString()).length;
    }
    return Promise.resolve(count);
  };

  Booking.findById = function (id) {
    const b = mockBookings.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(b || null);
  };

  Booking.findOne = function (q = {}) {
    let b = null;
    if (q.pnr) {
      b = mockBookings.find((x) => x.pnr === q.pnr);
    }
    return makeChainableQuery(b || null);
  };

  Booking.create = function (doc) {
    const created = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      toObject: function () {
        return { ...this };
      }
    };
    mockBookings.push(created);
    return Promise.resolve(created);
  };

  Passenger.find = function (q = {}) {
    let list = [...mockPassengers];
    if (q.bookingId) {
      list = list.filter((p) => p.bookingId.toString() === q.bookingId.toString());
    }
    return makeChainableQuery(list);
  };

  Passenger.create = function (doc) {
    const created = { _id: new mongoose.Types.ObjectId(), ...doc };
    mockPassengers.push(created);
    return Promise.resolve(created);
  };

  BookingSeat.find = function (q = {}) {
    let list = [...mockBookingSeats];
    if (q.bookingId) {
      list = list.filter((bs) => bs.bookingId.toString() === q.bookingId.toString());
    }
    return makeChainableQuery(list);
  };

  BookingSeat.create = function (doc) {
    const created = { _id: new mongoose.Types.ObjectId(), ...doc };
    mockBookingSeats.push(created);
    return Promise.resolve(created);
  };

  Payment.findOne = function (q = {}) {
    const p = mockPayments.find((x) => x.bookingId.toString() === q.bookingId.toString());
    return makeChainableQuery(p || null);
  };

  Payment.create = function (doc) {
    const created = { _id: new mongoose.Types.ObjectId(), ...doc };
    mockPayments.push(created);
    return Promise.resolve(created);
  };

  AuditLog.create = function (doc) {
    mockAuditLogs.push(doc);
    return Promise.resolve(doc);
  };

  // =========================================================================
  // STEP 1: TRIP SEARCH TESTS
  // =========================================================================
  console.log('\n--- STEP 1: Trip Search Validation & Segment Filtering ---');

  // Test 1.1: Missing origin rejects with 400
  let res = await simulateRequest('GET', '/api/trips/search?destination=Agra');
  assert(res.statusCode === 400, 'Search fails with 400 when origin query parameter is missing');

  // Test 1.2: Missing destination rejects with 400
  res = await simulateRequest('GET', '/api/trips/search?origin=Delhi');
  assert(res.statusCode === 400, 'Search fails with 400 when destination query parameter is missing');

  // Test 1.3: Same origin and destination rejects with 400
  res = await simulateRequest(
    'GET',
    `/api/trips/search?origin=${stopDelhi._id}&destination=${stopDelhi._id}&date=${travelDate.toISOString()}`
  );
  assert(res.statusCode === 400, 'Search fails with 400 when origin and destination are identical stops');

  // Test 1.4: Valid forward search (Delhi -> Agra)
  const dateStr = travelDate.toISOString().split('T')[0];
  res = await simulateRequest('GET', `/api/trips/search?origin=Delhi&destination=Agra&date=${dateStr}`);
  assert(res.statusCode === 200, 'Search succeeds with 200 for valid forward route (Delhi -> Agra)');
  assert(
    res.body.data?.trips?.length === 1,
    'Returns matching trip with correct boarding and dropping stops'
  );
  assert(
    res.body.data?.trips[0]?.availableSeats === 16,
    'Returns initial available seat count of 16 for clean vehicle'
  );
  assert(
    res.body.data?.trips[0]?.boardingStop?.sequence === 1 &&
      res.body.data?.trips[0]?.droppingStop?.sequence === 3,
    'Boarding sequence (1) is strictly before dropping sequence (3)'
  );

  // Test 1.5: Reverse search (Agra -> Delhi) must NOT return forward trip
  res = await simulateRequest('GET', `/api/trips/search?origin=Agra&destination=Delhi&date=${dateStr}`);
  assert(res.statusCode === 200, 'Search returns 200 for reverse query');
  assert(
    res.body.data?.trips?.length === 0,
    'Forward trip is excluded when requested origin sequence (3) is after destination sequence (1)'
  );

  // Test 1.6: Filter by busType
  res = await simulateRequest('GET', `/api/trips/search?origin=Delhi&destination=Agra&date=${dateStr}&busType=Sleeper`);
  assert(
    res.body.data?.trips?.length === 0,
    'Search correctly filters out Seater bus when busType=Sleeper is requested'
  );

  res = await simulateRequest('GET', `/api/trips/search?origin=Delhi&destination=Agra&date=${dateStr}&busType=AC`);
  assert(
    res.body.data?.trips?.length === 1,
    'Search correctly matches bus when busType=AC is requested'
  );

  // =========================================================================
  // STEP 2: SEGMENT-BASED SEAT AVAILABILITY & INTERVAL OVERLAP TESTS
  // =========================================================================
  console.log('\n--- STEP 2: Segment-Based Seat Availability & Half-Open Intervals ---');

  // Pre-book Seat '1A' for segment [1, 2) (Delhi -> Mathura)
  const seat1A = mockSeatInventories.find((s) => s.seatNumber === '1A');
  seat1A.activeSegments.push({
    fromSequence: 1,
    toSequence: 2,
    status: 'booked'
  });

  // Query seat availability for [2, 4) (Mathura -> Gwalior)
  res = await simulateRequest(
    'GET',
    `/api/trips/${mockTrip._id}/seats?fromStopId=${stopMathura._id}&toStopId=${stopGwalior._id}`
  );
  assert(res.statusCode === 200, 'Seat availability endpoint returns 200');

  const availMap = res.body.data?.seatLayout?.seats || [];
  const seat1AAvailMathuraGwalior = availMap.find((s) => s.seatNumber === '1A');
  assert(
    seat1AAvailMathuraGwalior?.isAvailable === true,
    'Seat 1A is AVAILABLE for non-overlapping segment [2, 4) even though booked for [1, 2)'
  );

  // Query seat availability for [1, 3) (Delhi -> Agra)
  res = await simulateRequest(
    'GET',
    `/api/trips/${mockTrip._id}/seats?fromStopId=${stopDelhi._id}&toStopId=${stopAgra._id}`
  );
  const seat1AAvailDelhiAgra = res.body.data?.seatLayout?.seats?.find((s) => s.seatNumber === '1A');
  assert(
    seat1AAvailDelhiAgra?.isAvailable === false,
    'Seat 1A is BLOCKED for overlapping segment [1, 3) because [1, 2) overlaps with [1, 3)'
  );

  // Test 2.3: Dynamic Hold Expiration
  // Seat '1B' held with an expired timestamp (5 mins in the past)
  const seat1B = mockSeatInventories.find((s) => s.seatNumber === '1B');
  seat1B.activeSegments.push({
    fromSequence: 1,
    toSequence: 4,
    status: 'held',
    holdExpiresAt: new Date(Date.now() - 5 * 60 * 1000) // Expired 5 mins ago
  });

  // Seat '1C' held with an active timestamp (8 mins in future)
  const seat1C = mockSeatInventories.find((s) => s.seatNumber === '1C');
  seat1C.activeSegments.push({
    fromSequence: 1,
    toSequence: 4,
    status: 'held',
    holdExpiresAt: new Date(Date.now() + 8 * 60 * 1000) // Active
  });

  res = await simulateRequest(
    'GET',
    `/api/trips/${mockTrip._id}/seats?fromStopId=${stopDelhi._id}&toStopId=${stopAgra._id}`
  );
  const seat1BAvail = res.body.data?.seatLayout?.seats?.find((s) => s.seatNumber === '1B');
  const seat1CAvail = res.body.data?.seatLayout?.seats?.find((s) => s.seatNumber === '1C');

  assert(
    seat1BAvail?.isAvailable === true,
    'Expired hold does not block seat 1B (dynamically ignored on the fly)'
  );
  assert(
    seat1CAvail?.isAvailable === false,
    'Active hold on seat 1C correctly blocks availability'
  );

  // =========================================================================
  // STEP 3: ATOMIC 10-MINUTE SEAT HOLDS & CONCURRENCY TESTS
  // =========================================================================
  console.log('\n--- STEP 3: Atomic 10-Minute Seat Holds & Concurrency ---');

  // Test 3.1: Hold validation fails without authentication
  res = await simulateRequest('POST', '/api/bookings/hold', {
    tripId: mockTrip._id,
    seatNumbers: ['2A'],
    boardingStopId: stopDelhi._id,
    droppingStopId: stopAgra._id
  });
  assert(res.statusCode === 401, 'Seat hold rejected with 401 when unauthenticated');

  // Test 3.2: Hold validation rejects exceeding 6 seats
  res = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: mockTrip._id,
      seatNumbers: ['2A', '2B', '2C', '2D', '3A', '3B', '3C'], // 7 seats
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 400, 'Hold rejected with 400 when seat count exceeds maximum limit of 6');

  // Test 3.3: Hold validation rejects duplicate seats in request
  res = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: mockTrip._id,
      seatNumbers: ['2A', '2A'],
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 400, 'Hold rejected with 400 when duplicate seat numbers provided in request');

  // Test 3.4: Customer 1 acquires valid 10-minute hold on seat 2A
  res = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: mockTrip._id,
      seatNumbers: ['2A'],
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 200, 'Customer 1 successfully acquires 10-minute hold on Seat 2A');
  const holdTokenC1 = res.body.data?.holdToken;
  assert(Boolean(holdTokenC1), 'Response returns cryptographic holdToken for reservation');
  assert(
    new Date(res.body.data?.holdExpiresAt) > new Date(Date.now() + 8 * 60 * 1000),
    'holdExpiresAt is set ~10 minutes in the future'
  );

  // Test 3.5: Concurrency - Customer 2 tries to hold Seat 2A on overlapping segment -> 409 Conflict
  res = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: mockTrip._id,
      seatNumbers: ['2A'],
      boardingStopId: stopDelhi._id,
      droppingStopId: stopMathura._id
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(res.statusCode === 409, 'Customer 2 receives 409 Conflict when attempting to hold already-held Seat 2A');

  // Test 3.6: All-or-nothing multi-seat rollback
  // Customer 2 tries to hold ['2B', '2A']. 2B is free, but 2A is held by C1.
  res = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: mockTrip._id,
      seatNumbers: ['2B', '2A'],
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(res.statusCode === 409, 'Multi-seat hold fails with 409 because 2A is unavailable');

  // Verify Seat 2B was NOT retained (all-or-nothing rollback)
  const seat2B = mockSeatInventories.find((s) => s.seatNumber === '2B');
  const hasSeat2BHolds = seat2B.activeSegments && seat2B.activeSegments.length > 0;
  assert(!hasSeat2BHolds, 'Seat 2B was rolled back completely and remains free after partial multi-seat failure');

  // Test 3.7: Release hold
  res = await simulateRequest('POST', '/api/bookings/release-hold', {
    tripId: mockTrip._id,
    seatNumbers: ['2A'],
    holdToken: holdTokenC1
  });
  assert(res.statusCode === 200, 'Explicit hold release succeeds with 200');

  // Verify Seat 2A is now free again
  const seat2A = mockSeatInventories.find((s) => s.seatNumber === '2A');
  const seat2AFree = seat2A.isAvailableForSegment(1, 3);
  assert(seat2AFree, 'Seat 2A is immediately available again after release');

  // =========================================================================
  // STEP 4: PASSENGER INFORMATION & BOOKING CREATION TESTS
  // =========================================================================
  console.log('\n--- STEP 4: Passenger Details Validation & Booking Creation ---');

  // Acquire new hold for Customer 1 on Seat 3A & 3B for Delhi -> Agra
  res = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: mockTrip._id,
      seatNumbers: ['3A', '3B'],
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 200, 'Customer 1 acquires hold on Seat 3A and 3B');
  const validHoldToken = res.body.data?.holdToken;

  // Test 4.1: Reject missing passenger full name
  res = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: mockTrip._id,
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id,
      holdToken: validHoldToken,
      passengers: [
        { fullName: '', age: 28, gender: 'male', seatNumber: '3A' },
        { fullName: 'Aditi Sharma', age: 26, gender: 'female', seatNumber: '3B' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 400, 'Booking rejected with 400 when passenger fullName is empty');

  // Test 4.2: Reject invalid passenger age (< 1 or > 120)
  res = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: mockTrip._id,
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id,
      holdToken: validHoldToken,
      passengers: [
        { fullName: 'Rohan Sharma', age: 145, gender: 'male', seatNumber: '3A' },
        { fullName: 'Aditi Sharma', age: 26, gender: 'female', seatNumber: '3B' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 400, 'Booking rejected with 400 when passenger age is invalid (145)');

  // Test 4.3: Reject invalid passenger gender
  res = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: mockTrip._id,
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id,
      holdToken: validHoldToken,
      passengers: [
        { fullName: 'Rohan Sharma', age: 28, gender: 'unknown', seatNumber: '3A' },
        { fullName: 'Aditi Sharma', age: 26, gender: 'female', seatNumber: '3B' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 400, 'Booking rejected with 400 when passenger gender is invalid');

  // Test 4.4: Reject multiple passengers assigned to exact same seat
  res = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: mockTrip._id,
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id,
      holdToken: validHoldToken,
      passengers: [
        { fullName: 'Rohan Sharma', age: 28, gender: 'male', seatNumber: '3A' },
        { fullName: 'Aditi Sharma', age: 26, gender: 'female', seatNumber: '3A' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 400, 'Booking rejected with 400 when two passengers share the same seat 3A');

  // Test 4.5: Valid booking creation with PNR generation
  res = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: mockTrip._id,
      boardingStopId: stopDelhi._id,
      droppingStopId: stopAgra._id,
      holdToken: validHoldToken,
      passengers: [
        { fullName: 'Rohan Sharma', age: 28, gender: 'male', seatNumber: '3A', phone: '9876543210' },
        { fullName: 'Aditi Sharma', age: 26, gender: 'female', seatNumber: '3B', phone: '9876543211' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(res.statusCode === 201, 'Booking successfully created with 201 Created');
  const createdPnr = res.body.data?.pnr;
  const bookingId = res.body.data?.booking?._id;

  assert(
    Boolean(createdPnr && /^BG[A-Z0-9]{8}$/.test(createdPnr)),
    `Generated unique PNR '${createdPnr}' matches regex /^BG[A-Z0-9]{8}$/`
  );
  assert(
    res.body.data?.booking?.bookingStatus === 'pending_payment',
    "Booking status initialized to 'pending_payment' awaiting simulated payment"
  );
  assert(
    res.body.data?.passengers?.length === 2,
    '2 Passenger records created and linked to the booking'
  );
  assert(
    res.body.data?.bookingSeats?.length === 2,
    '2 BookingSeat records created and linked'
  );

  // Verify pending Payment record created with idempotency key
  const paymentRecord = mockPayments.find((p) => p.bookingId.toString() === bookingId.toString());
  assert(
    paymentRecord && paymentRecord.paymentStatus === 'pending' && Boolean(paymentRecord.idempotencyKey),
    'Pending payment record created with unique idempotencyKey'
  );

  // =========================================================================
  // STEP 5: AUTHORIZATION & CUSTOMER OWNERSHIP ISOLATION
  // =========================================================================
  console.log('\n--- STEP 5: Customer Resource Ownership & RBAC Isolation ---');

  // Test 5.1: Customer 1 can retrieve their own booking
  res = await simulateRequest('GET', `/api/bookings/${bookingId}`, null, {
    authorization: `Bearer ${customerToken1}`
  });
  assert(res.statusCode === 200, 'Customer 1 can access their own booking by ID');
  assert(res.body.data?.booking?.pnr === createdPnr, 'Booking response contains correct PNR and itinerary');

  // Test 5.2: Customer 2 CANNOT access Customer 1's booking -> 403 Forbidden
  res = await simulateRequest('GET', `/api/bookings/${bookingId}`, null, {
    authorization: `Bearer ${customerToken2}`
  });
  assert(res.statusCode === 403, 'Customer 2 is blocked with 403 Forbidden when attempting to access Customer 1 booking');

  // Test 5.3: Admin CAN access Customer 1's booking for administrative support
  res = await simulateRequest('GET', `/api/bookings/${bookingId}`, null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(res.statusCode === 200, 'Administrator can access any booking for administrative verification');

  // Test 5.4: Customer 1 lists their bookings
  res = await simulateRequest('GET', '/api/bookings/my-bookings', null, {
    authorization: `Bearer ${customerToken1}`
  });
  assert(res.statusCode === 200, 'Customer 1 lists their bookings via GET /api/bookings/my-bookings');
  assert(
    res.body.data?.bookings?.some((b) => b._id.toString() === bookingId.toString()),
    'My Bookings includes newly created booking'
  );

  // Test 5.5: Customer 2 lists their bookings (must be empty, no leak from Customer 1)
  res = await simulateRequest('GET', '/api/bookings/my-bookings', null, {
    authorization: `Bearer ${customerToken2}`
  });
  assert(res.statusCode === 200, 'Customer 2 lists their bookings');
  assert(
    res.body.data?.bookings?.length === 0,
    "Customer 2's booking list is empty and does not leak Customer 1 records"
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================================');
  console.log(`TOTAL PHASE 6 TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Fatal error running Phase 6 test suite:', err);
  process.exit(1);
});
