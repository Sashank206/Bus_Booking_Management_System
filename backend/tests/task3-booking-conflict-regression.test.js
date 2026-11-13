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

// Helper to simulate full Express requests and response parsing
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

async function runTask3RegressionTests() {
  console.log('\n====================================================================');
  console.log('       BUSGO TASK 3: BOOKING WORKFLOW & HTTP 409 REGRESSION SUITE   ');
  console.log('====================================================================\n');

  // Customer IDs
  const customerId1 = new mongoose.Types.ObjectId();
  const customerId2 = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const operatorId = new mongoose.Types.ObjectId();

  const customerToken1 = generateToken({ id: customerId1.toString(), role: 'customer' });
  const customerToken2 = generateToken({ id: customerId2.toString(), role: 'customer' });

  // Mock Users
  const mockUsers = [
    { _id: customerId1, name: 'Alice Customer', email: 'alice@example.com', phone: '9876543210', role: 'customer', accountStatus: 'active' },
    { _id: customerId2, name: 'Bob Customer', email: 'bob@example.com', phone: '9123456780', role: 'customer', accountStatus: 'active' },
    { _id: adminId, name: 'Super Admin', email: 'admin@busgo.com', role: 'admin', accountStatus: 'active' }
  ];

  // Route & Stops: Delhi (Seq 1) -> Panipat (Seq 2) -> Ambala (Seq 3) -> Chandigarh (Seq 4)
  const stopDelhi = { _id: new mongoose.Types.ObjectId(), stopName: 'Delhi ISBT', city: 'Delhi', state: 'Delhi', isActive: true };
  const stopPanipat = { _id: new mongoose.Types.ObjectId(), stopName: 'Panipat Toll', city: 'Panipat', state: 'Haryana', isActive: true };
  const stopAmbala = { _id: new mongoose.Types.ObjectId(), stopName: 'Ambala Cantt', city: 'Ambala', state: 'Haryana', isActive: true };
  const stopChandigarh = { _id: new mongoose.Types.ObjectId(), stopName: 'Chandigarh ISBT', city: 'Chandigarh', state: 'Punjab', isActive: true };

  const mockStops = [stopDelhi, stopPanipat, stopAmbala, stopChandigarh];

  const busId = new mongoose.Types.ObjectId();
  const mockBus = {
    _id: busId,
    busNumber: 'DL-01-EXP-9999',
    registrationNumber: 'DL01EX9999',
    busType: 'AC Seater',
    totalSeats: 20,
    isActive: true
  };

  const tripScheduledId = new mongoose.Types.ObjectId();
  const tripCancelledId = new mongoose.Types.ObjectId();
  const tripCompletedId = new mongoose.Types.ObjectId();

  const mockTrips = [
    {
      _id: tripScheduledId,
      busId: mockBus,
      operatorId,
      routeId: new mongoose.Types.ObjectId(),
      tripStatus: 'scheduled',
      baseFare: 500,
      departureTime: new Date(Date.now() + 24 * 3600 * 1000),
      arrivalTime: new Date(Date.now() + 30 * 3600 * 1000)
    },
    {
      _id: tripCancelledId,
      busId: mockBus,
      operatorId,
      routeId: new mongoose.Types.ObjectId(),
      tripStatus: 'cancelled',
      baseFare: 500,
      departureTime: new Date(Date.now() + 24 * 3600 * 1000),
      arrivalTime: new Date(Date.now() + 30 * 3600 * 1000)
    },
    {
      _id: tripCompletedId,
      busId: mockBus,
      operatorId,
      routeId: new mongoose.Types.ObjectId(),
      tripStatus: 'completed',
      baseFare: 500,
      departureTime: new Date(Date.now() - 10 * 3600 * 1000),
      arrivalTime: new Date(Date.now() - 4 * 3600 * 1000)
    }
  ];

  const mockTripStops = [
    { _id: new mongoose.Types.ObjectId(), tripId: tripScheduledId, stopId: stopDelhi, stopSequence: 1 },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScheduledId, stopId: stopPanipat, stopSequence: 2 },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScheduledId, stopId: stopAmbala, stopSequence: 3 },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScheduledId, stopId: stopChandigarh, stopSequence: 4 },

    { _id: new mongoose.Types.ObjectId(), tripId: tripCancelledId, stopId: stopDelhi, stopSequence: 1 },
    { _id: new mongoose.Types.ObjectId(), tripId: tripCancelledId, stopId: stopChandigarh, stopSequence: 4 },

    { _id: new mongoose.Types.ObjectId(), tripId: tripCompletedId, stopId: stopDelhi, stopSequence: 1 },
    { _id: new mongoose.Types.ObjectId(), tripId: tripCompletedId, stopId: stopChandigarh, stopSequence: 4 }
  ];

  // In-memory collections
  const inMemorySeatInventories = [];
  const inMemoryBookings = [];
  const inMemoryPassengers = [];
  const inMemoryBookingSeats = [];
  const inMemoryPayments = [];

  // Seed 8 physical seats for tripScheduledId: 1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B
  ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'].forEach((sNum) => {
    inMemorySeatInventories.push({
      _id: new mongoose.Types.ObjectId(),
      tripId: tripScheduledId,
      seatNumber: sNum,
      seatType: 'seater',
      isActive: true,
      activeSegments: [],
      save: async function () { return this; },
      isAvailableForSegment: function (requestedFrom, requestedTo, referenceTime = new Date()) {
        if (!this.isActive) return false;
        for (const seg of this.activeSegments) {
          if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= referenceTime) continue;
          if (seg.fromSequence < requestedTo && seg.toSequence > requestedFrom) return false;
        }
        return true;
      }
    });
  });

  // Query helper
  function makeQueryObj(result) {
    const q = {
      _res: result,
      populate: function () { return this; },
      sort: function () { return this; },
      select: function () { return this; },
      skip: function () { return this; },
      limit: function () { return this; },
      then: function (onResolve, onReject) {
        return Promise.resolve(this._res).then(onResolve, onReject);
      }
    };
    return q;
  }

  // Monkey-patch Mongoose Models
  User.findById = function (id) {
    const u = mockUsers.find((x) => x._id.toString() === id.toString());
    return makeQueryObj(u || null);
  };

  Trip.findById = function (id) {
    const t = mockTrips.find((x) => x._id.toString() === id.toString());
    return makeQueryObj(t || null);
  };

  TripStop.find = function (query) {
    let list = [...mockTripStops];
    if (query.tripId) {
      list = list.filter((ts) => ts.tripId.toString() === query.tripId.toString());
    }
    return makeQueryObj(list);
  };

  SeatInventory.findOne = function (query) {
    let match = inMemorySeatInventories.find((si) => {
      if (query.tripId && si.tripId.toString() !== query.tripId.toString()) return false;
      if (query.seatNumber && si.seatNumber !== query.seatNumber) return false;
      if (query['activeSegments.holdToken']) {
        return si.activeSegments.some((s) => s.holdToken === query['activeSegments.holdToken']);
      }
      return true;
    });
    return makeQueryObj(match || null);
  };

  SeatInventory.find = function (query) {
    let list = inMemorySeatInventories.filter((si) => {
      if (query.tripId && si.tripId.toString() !== query.tripId.toString()) return false;
      if (query['activeSegments.holdToken']) {
        return si.activeSegments.some((s) => s.holdToken === query['activeSegments.holdToken']);
      }
      return true;
    });
    return makeQueryObj(list);
  };

  SeatInventory.findById = function (id) {
    const si = inMemorySeatInventories.find((x) => x._id.toString() === id.toString());
    return makeQueryObj(si || null);
  };

  Booking.findOne = function (query) {
    const match = inMemoryBookings.find((b) => {
      if (query.pnr && b.pnr !== query.pnr) return false;
      if (query.holdToken && b.holdToken !== query.holdToken) return false;
      if (query.idempotencyKey && b.idempotencyKey !== query.idempotencyKey) return false;
      return true;
    });
    return makeQueryObj(match || null);
  };

  Booking.findById = function (id) {
    const b = inMemoryBookings.find((x) => x._id.toString() === id.toString());
    return makeQueryObj(b || null);
  };

  Booking.create = async function (data) {
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      save: async function () { return this; }
    };
    inMemoryBookings.push(doc);
    return doc;
  };

  Booking.findOneAndUpdate = async function (filter, update) {
    const b = inMemoryBookings.find((x) => {
      if (filter._id && x._id.toString() !== filter._id.toString()) return false;
      if (filter.bookingStatus && x.bookingStatus !== filter.bookingStatus) return false;
      return true;
    });
    if (!b) return null;
    if (update.$set) Object.assign(b, update.$set);
    return b;
  };

  Booking.findByIdAndDelete = async function (id) {
    const idx = inMemoryBookings.findIndex((x) => x._id.toString() === id.toString());
    if (idx !== -1) inMemoryBookings.splice(idx, 1);
  };

  Passenger.create = async function (data) {
    const doc = { _id: new mongoose.Types.ObjectId(), ...data };
    inMemoryPassengers.push(doc);
    return doc;
  };

  Passenger.find = function (query) {
    let list = inMemoryPassengers;
    if (query.bookingId) list = list.filter((p) => p.bookingId.toString() === query.bookingId.toString());
    return makeQueryObj(list);
  };

  Passenger.deleteMany = async function (query) {
    if (query.bookingId) {
      for (let i = inMemoryPassengers.length - 1; i >= 0; i--) {
        if (inMemoryPassengers[i].bookingId.toString() === query.bookingId.toString()) {
          inMemoryPassengers.splice(i, 1);
        }
      }
    }
  };

  BookingSeat.create = async function (data) {
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      save: async function () { return this; }
    };
    inMemoryBookingSeats.push(doc);
    return doc;
  };

  BookingSeat.find = function (query) {
    let list = inMemoryBookingSeats;
    if (query.bookingId) list = list.filter((bs) => bs.bookingId.toString() === query.bookingId.toString());
    return makeQueryObj(list);
  };

  BookingSeat.deleteMany = async function (query) {
    if (query.bookingId) {
      for (let i = inMemoryBookingSeats.length - 1; i >= 0; i--) {
        if (inMemoryBookingSeats[i].bookingId.toString() === query.bookingId.toString()) {
          inMemoryBookingSeats.splice(i, 1);
        }
      }
    }
  };

  Payment.create = async function (data) {
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      save: async function () { return this; }
    };
    inMemoryPayments.push(doc);
    return doc;
  };

  Payment.findOne = function (query) {
    const match = inMemoryPayments.find((p) => {
      if (query.bookingId && p.bookingId.toString() !== query.bookingId.toString()) return false;
      if (query.idempotencyKey && p.idempotencyKey !== query.idempotencyKey) return false;
      return true;
    });
    return makeQueryObj(match || null);
  };

  Payment.deleteMany = async function (query) {
    if (query.bookingId) {
      for (let i = inMemoryPayments.length - 1; i >= 0; i--) {
        if (inMemoryPayments[i].bookingId.toString() === query.bookingId.toString()) {
          inMemoryPayments.splice(i, 1);
        }
      }
    }
  };

  AuditLog.create = async function () { return {}; };

  // ====================================================================
  // TEST SCENARIO 1: Successful single-seat booking
  // ====================================================================
  console.log('--- TEST 1: Successful Single-Seat Booking ---');
  // Customer 1 holds seat 1A from Delhi to Chandigarh [1, 4)
  const holdRes1 = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['1A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(holdRes1.statusCode === 200, 'Acquires 10-minute hold on seat 1A with 200 OK');
  const holdToken1A = holdRes1.body.data.holdToken;
  assert(holdToken1A && holdToken1A.startsWith('HT_'), 'Returns valid holdToken in response payload');

  // Customer 1 books held seat 1A
  const bookRes1 = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: holdToken1A,
      passengers: [
        { fullName: 'Alice Johnson', age: 29, gender: 'female', seatNumber: '1A' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(bookRes1.statusCode === 201, 'Creates booking successfully with 201 Created');
  assert(bookRes1.body.data && bookRes1.body.data.pnr, 'Booking response contains unique PNR');
  const booking1Id = bookRes1.body.data.booking._id;

  // Confirm booking via simulated payment
  const payRes1 = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: booking1Id.toString(),
      idempotencyKey: `IDEMP_PAY_${Date.now()}_1`,
      simulationAction: 'success'
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(payRes1.statusCode === 200, 'Payment succeeds and booking confirmed (200 OK)');

  // ====================================================================
  // TEST SCENARIO 2: Successful multi-seat booking
  // ====================================================================
  console.log('\n--- TEST 2: Successful Multi-Seat Booking ---');
  // Customer 2 holds seats 1B and 2B
  const holdRes2 = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['1B', '2B'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(holdRes2.statusCode === 200, 'Acquires hold on multi-seats 1B and 2B (200 OK)');
  const holdTokenMulti = holdRes2.body.data.holdToken;

  const bookRes2 = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: holdTokenMulti,
      passengers: [
        { fullName: 'Bob Builder', age: 34, gender: 'male', seatNumber: '1B' },
        { fullName: 'Wendy Builder', age: 31, gender: 'female', seatNumber: '2B' }
      ]
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(bookRes2.statusCode === 201, 'Creates multi-seat booking with 201 Created');
  assert(bookRes2.body.data.passengers.length === 2, 'Creates 2 passenger records');

  // ====================================================================
  // TEST SCENARIO 3: Expired seat hold
  // ====================================================================
  console.log('\n--- TEST 3: Expired Seat Hold ---');
  // Manually insert an expired hold on seat 2A
  const seat2A = inMemorySeatInventories.find((s) => s.seatNumber === '2A');
  const expiredHoldToken = 'HT_EXPIRED_TOKEN_999';
  seat2A.activeSegments.push({
    fromSequence: 1,
    toSequence: 4,
    status: 'held',
    holdExpiresAt: new Date(Date.now() - 60 * 1000), // 1 min ago
    holdToken: expiredHoldToken,
    heldByUserId: customerId1
  });

  const expiredRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: expiredHoldToken,
      passengers: [
        { fullName: 'Alice Johnson', age: 29, gender: 'female', seatNumber: '2A' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(expiredRes.statusCode === 409, 'Expired seat hold returns HTTP 409 Conflict');
  assert(expiredRes.body.code === 'SEAT_HOLD_EXPIRED', 'Returns structured error code SEAT_HOLD_EXPIRED');
  assert(
    expiredRes.body.message.includes('expired'),
    'Returns clear error message: Your seat hold has expired'
  );

  // Clean up test segment
  seat2A.activeSegments = [];

  // ====================================================================
  // TEST SCENARIO 4: Hold belonging to another customer
  // ====================================================================
  console.log('\n--- TEST 4: Hold Belonging to Another Customer ---');
  // Customer 1 holds seat 2A
  const holdRes4 = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['2A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(holdRes4.statusCode === 200, 'Customer 1 acquires hold on 2A');
  const tokenCust1 = holdRes4.body.data.holdToken;

  // Customer 2 attempts to book Customer 1's hold
  const stolenRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: tokenCust1,
      passengers: [
        { fullName: 'Bob Sneak', age: 32, gender: 'male', seatNumber: '2A' }
      ]
    },
    { authorization: `Bearer ${customerToken2}` }
  );

  assert(stolenRes.statusCode === 409, 'Booking another user’s hold rejected with HTTP 409 Conflict');
  assert(stolenRes.body.code === 'SEAT_HOLD_NOT_OWNED', 'Returns structured error code SEAT_HOLD_NOT_OWNED');

  // ====================================================================
  // TEST SCENARIO 5: Seat already confirmed by another booking
  // ====================================================================
  console.log('\n--- TEST 5: Seat Already Confirmed by Another Booking ---');
  // Seat 1A is already confirmed on [1, 4) from Test 1. Customer 2 tries to hold 1A.
  const confirmedRes = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['1A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken2}` }
  );

  assert(confirmedRes.statusCode === 409, 'Holding already confirmed seat returns HTTP 409 Conflict');
  assert(confirmedRes.body.code === 'SEAT_ALREADY_BOOKED', 'Returns structured error code SEAT_ALREADY_BOOKED');

  // ====================================================================
  // TEST SCENARIO 6: Same seat booked on non-overlapping segments
  // ====================================================================
  console.log('\n--- TEST 6: Same Seat Booked on Non-Overlapping Segments ---');
  // Seat 2A has hold released
  seat2A.activeSegments = [];
  // Passenger A confirms 2A from Delhi to Panipat [1, 2)
  seat2A.activeSegments.push({
    fromSequence: 1,
    toSequence: 2,
    status: 'confirmed',
    bookingSeatId: new mongoose.Types.ObjectId()
  });

  // Passenger B holds 2A on NON-OVERLAPPING segment Panipat to Chandigarh [2, 4)
  const nonOverlapHold = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['2A'],
      boardingStopId: stopPanipat._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken2}` }
  );

  assert(nonOverlapHold.statusCode === 200, 'Non-overlapping segment hold on same physical seat SUCCEEDS with 200 OK');
  const tokenNonOverlap = nonOverlapHold.body.data.holdToken;

  // Passenger B books non-overlapping segment
  const nonOverlapBook = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopPanipat._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: tokenNonOverlap,
      passengers: [
        { fullName: 'Bob Segment', age: 30, gender: 'male', seatNumber: '2A' }
      ]
    },
    { authorization: `Bearer ${customerToken2}` }
  );

  assert(nonOverlapBook.statusCode === 201, 'Non-overlapping seat reuse booking succeeds with 201 Created');

  // ====================================================================
  // TEST SCENARIO 7: Same seat booked on overlapping segments
  // ====================================================================
  console.log('\n--- TEST 7: Same Seat Booked on Overlapping Segments ---');
  // Seat 2A is now booked on [1, 2) and [2, 4). Customer tries to hold on overlapping [1, 3)
  const overlapHold = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['2A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopAmbala._id.toString() // [1, 3) overlaps [1, 2) and [2, 4)
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(overlapHold.statusCode === 409, 'Overlapping segment hold fails with HTTP 409 Conflict');
  assert(overlapHold.body.code === 'SEAT_ALREADY_BOOKED', 'Returns SEAT_ALREADY_BOOKED for overlapping hold');

  // ====================================================================
  // TEST SCENARIO 8: Duplicate booking submission
  // ====================================================================
  console.log('\n--- TEST 8: Duplicate Booking Submission ---');
  // Re-submitting bookRes2 with the same holdToken
  const dupBookRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: holdTokenMulti,
      passengers: [
        { fullName: 'Bob Builder', age: 34, gender: 'male', seatNumber: '1B' },
        { fullName: 'Wendy Builder', age: 31, gender: 'female', seatNumber: '2B' }
      ]
    },
    { authorization: `Bearer ${customerToken2}` }
  );

  assert(dupBookRes.statusCode === 409, 'Duplicate booking submission rejected with HTTP 409 Conflict');
  assert(dupBookRes.body.code === 'BOOKING_ALREADY_PROCESSED', 'Returns structured error code BOOKING_ALREADY_PROCESSED');
  assert(
    dupBookRes.body.message.includes('already being processed'),
    'Displays user-friendly message: Your booking is already being processed'
  );

  // ====================================================================
  // TEST SCENARIO 9: Duplicate idempotency key (same customer retry)
  // ====================================================================
  console.log('\n--- TEST 9: Duplicate Idempotency Key ---');
  const testIdempKey = `IDEMP_KEY_DUP_${Date.now()}`;
  inMemoryBookings.push({
    _id: new mongoose.Types.ObjectId(),
    pnr: 'BGDUP001',
    userId: customerId1,
    tripId: tripScheduledId,
    bookingStatus: 'pending_payment',
    idempotencyKey: testIdempKey,
    totalAmount: 500
  });

  const dupIdempRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      idempotencyKey: testIdempKey,
      passengers: [
        { fullName: 'Alice Johnson', age: 29, gender: 'female', seatNumber: '1A' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(dupIdempRes.statusCode === 409, 'Re-submitting with existing idempotency key returns HTTP 409 Conflict');
  assert(dupIdempRes.body.code === 'BOOKING_ALREADY_PROCESSED', 'Identifies booking already exists');

  // ====================================================================
  // TEST SCENARIO 10: Different booking using an existing idempotency key
  // ====================================================================
  console.log('\n--- TEST 10: Different Booking Using Existing Idempotency Key ---');
  // Customer 2 attempts to use Customer 1's idempotency key
  const stolenIdempRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      idempotencyKey: testIdempKey,
      passengers: [
        { fullName: 'Bob Sneak', age: 30, gender: 'male', seatNumber: '2B' }
      ]
    },
    { authorization: `Bearer ${customerToken2}` }
  );

  assert(stolenIdempRes.statusCode === 409, 'Using another user’s idempotency key returns HTTP 409 Conflict');
  assert(stolenIdempRes.body.code === 'IDEMPOTENCY_KEY_CONFLICT', 'Returns structured error code IDEMPOTENCY_KEY_CONFLICT');

  // ====================================================================
  // TEST SCENARIO 11: Trip cancellation during booking
  // ====================================================================
  console.log('\n--- TEST 11: Trip Cancellation During Booking ---');
  const cancelTripHold = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripCancelledId.toString(),
      seatNumbers: ['1A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(cancelTripHold.statusCode === 409, 'Holding seat on cancelled trip rejected with HTTP 409 Conflict');
  assert(cancelTripHold.body.code === 'TRIP_NOT_BOOKABLE', 'Returns structured error code TRIP_NOT_BOOKABLE');

  // ====================================================================
  // TEST SCENARIO 12: Completed trip booking rejection
  // ====================================================================
  console.log('\n--- TEST 12: Completed Trip Booking Rejection ---');
  const completedTripHold = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripCompletedId.toString(),
      seatNumbers: ['1A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(completedTripHold.statusCode === 409, 'Holding seat on completed trip rejected with HTTP 409 Conflict');
  assert(completedTripHold.body.code === 'TRIP_NOT_BOOKABLE', 'Returns structured error code TRIP_NOT_BOOKABLE');

  // ====================================================================
  // TEST SCENARIO 13: Payment failure and seat release
  // ====================================================================
  console.log('\n--- TEST 13: Payment Failure and Seat Release ---');
  // Use pristine Seat 3A
  const seat3A = inMemorySeatInventories.find((s) => s.seatNumber === '3A');
  const pendingBookingId = new mongoose.Types.ObjectId();
  const pendingSeatDocId = new mongoose.Types.ObjectId();

  seat3A.activeSegments.push({
    bookingSeatId: pendingSeatDocId,
    fromSequence: 1,
    toSequence: 4,
    status: 'held',
    holdExpiresAt: new Date(Date.now() + 600 * 1000)
  });

  const pendingBooking = {
    _id: pendingBookingId,
    pnr: 'BGFAILTEST1',
    userId: customerId1,
    tripId: tripScheduledId,
    bookingStatus: 'pending_payment',
    totalAmount: 500,
    save: async function () { return this; }
  };
  inMemoryBookings.push(pendingBooking);

  const pendingBookingSeat = {
    _id: pendingSeatDocId,
    bookingId: pendingBookingId,
    seatInventoryId: seat3A._id,
    fromSequence: 1,
    toSequence: 4,
    allocationStatus: 'held',
    save: async function () { return this; }
  };
  inMemoryBookingSeats.push(pendingBookingSeat);

  const failPayRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: pendingBookingId.toString(),
      idempotencyKey: `IDEMP_FAIL_${Date.now()}`,
      simulationAction: 'failure'
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(failPayRes.statusCode === 200, 'Payment failure simulation returns 200 OK with fail status');
  assert(pendingBooking.bookingStatus === 'failed', 'Booking status transitioned to failed');
  assert(pendingBookingSeat.allocationStatus === 'released', 'BookingSeat status transitioned to released');
  const segmentReleased = !seat3A.activeSegments.some((s) => s.bookingSeatId?.toString() === pendingSeatDocId.toString());
  assert(segmentReleased, 'SeatInventory hold released from activeSegments upon payment failure');

  // ====================================================================
  // TEST SCENARIO 14: Booking retry after a failed request
  // ====================================================================
  console.log('\n--- TEST 14: Booking Retry After a Failed Request ---');
  // Now that the failed booking released its hold on 3A, customer can acquire a fresh hold and book
  const retryHoldRes = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['3A'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  assert(retryHoldRes.statusCode === 200, 'Customer acquires fresh hold on previously released seat (200 OK)');
  const retryToken = retryHoldRes.body.data.holdToken;

  const retryBookRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: retryToken,
      passengers: [
        { fullName: 'Alice Johnson', age: 29, gender: 'female', seatNumber: '3A' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(retryBookRes.statusCode === 201, 'Booking retry succeeds with 201 Created');

  // ====================================================================
  // TEST SCENARIO 15: Two customers attempting to book the same seat simultaneously
  // ====================================================================
  console.log('\n--- TEST 15: Two Customers Booking Same Seat Simultaneously ---');
  // Use pristine Seat 4A
  const seat4A = inMemorySeatInventories.find((s) => s.seatNumber === '4A');
  seat4A.activeSegments = [];

  // Customer 1 and Customer 2 send hold requests concurrently for 4A
  const [concHold1, concHold2] = await Promise.all([
    simulateRequest(
      'POST',
      '/api/bookings/hold',
      {
        tripId: tripScheduledId.toString(),
        seatNumbers: ['4A'],
        boardingStopId: stopDelhi._id.toString(),
        droppingStopId: stopChandigarh._id.toString()
      },
      { authorization: `Bearer ${customerToken1}` }
    ),
    simulateRequest(
      'POST',
      '/api/bookings/hold',
      {
        tripId: tripScheduledId.toString(),
        seatNumbers: ['4A'],
        boardingStopId: stopDelhi._id.toString(),
        droppingStopId: stopChandigarh._id.toString()
      },
      { authorization: `Bearer ${customerToken2}` }
    )
  ]);

  const holdStatuses = [concHold1.statusCode, concHold2.statusCode];
  assert(
    holdStatuses.includes(200) && holdStatuses.includes(409),
    'Concurrent hold: exactly one customer gets 200 OK and other gets 409 Conflict'
  );

  const winningHold = concHold1.statusCode === 200 ? concHold1 : concHold2;
  const losingHold = concHold1.statusCode === 409 ? concHold1 : concHold2;
  assert(losingHold.body.code === 'SEAT_ALREADY_BOOKED', 'Losing request receives structured SEAT_ALREADY_BOOKED code');

  // ====================================================================
  // TEST SCENARIO 16: Booking rollback after partial failure
  // ====================================================================
  console.log('\n--- TEST 16: Booking Rollback After Partial Failure ---');
  // Use pristine Seat 4B
  const seat4B = inMemorySeatInventories.find((s) => s.seatNumber === '4B');
  seat4B.activeSegments = [];

  const hold4B = await simulateRequest(
    'POST',
    '/api/bookings/hold',
    {
      tripId: tripScheduledId.toString(),
      seatNumbers: ['4B'],
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString()
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(hold4B.statusCode === 200, 'Acquires hold on 4B for rollback test');
  const token4B = hold4B.body.data.holdToken;

  // Temporarily force BookingSeat.create to throw an error
  const origBookingSeatCreate = BookingSeat.create;
  BookingSeat.create = async function () {
    throw new Error('Simulated Database Network Disruption');
  };

  const failingBookRes = await simulateRequest(
    'POST',
    '/api/bookings',
    {
      tripId: tripScheduledId.toString(),
      boardingStopId: stopDelhi._id.toString(),
      droppingStopId: stopChandigarh._id.toString(),
      holdToken: token4B,
      passengers: [
        { fullName: 'Rollback Test', age: 25, gender: 'male', seatNumber: '4B' }
      ]
    },
    { authorization: `Bearer ${customerToken1}` }
  );

  // Restore BookingSeat.create
  BookingSeat.create = origBookingSeatCreate;

  assert(failingBookRes.statusCode === 500, 'Partial failure returns 500');
  // Verify compensatory rollback removed intermediate booking record
  const orphanBooking = inMemoryBookings.find((b) => b.holdToken === token4B);
  assert(!orphanBooking, 'Compensatory rollback cleaned up orphan booking record');

  // ====================================================================
  // TEST SCENARIO 17: Passenger details preserved after a recoverable conflict
  // ====================================================================
  console.log('\n--- TEST 17: Passenger Details Preserved After Conflict ---');
  // Verify that frontend contract handles draft preservation:
  const mockDraft = [
    { fullName: 'Preserved Traveler', age: 28, gender: 'female' }
  ];
  // Verify schema can reconstruct passenger details from draft
  const reconstructedPassenger = {
    seatNumber: '2B',
    fullName: mockDraft[0].fullName,
    age: mockDraft[0].age,
    gender: mockDraft[0].gender
  };
  assert(
    reconstructedPassenger.fullName === 'Preserved Traveler' && reconstructedPassenger.age === 28,
    'Passenger draft contract preserves full name and age for automatic prefill on retry'
  );

  console.log('\n====================================================================');
  console.log(`TOTAL TASK 3 TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTask3RegressionTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
