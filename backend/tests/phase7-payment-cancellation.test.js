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
  Cancellation,
  CancellationItem,
  Refund,
  Notification,
  AuditLog
} = require('../models');
const { generateToken } = require('../utils/jwt');
const {
  calculateSeatCancellation,
  getCancellationPolicy,
  updateCancellationPolicy
} = require('../services/policyService');

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

async function runPhase7Tests() {
  console.log('\n====================================================================');
  console.log('  BUSGO PHASE 7: PAYMENT, CONFIRMATION, CANCELLATION & REFUNDS     ');
  console.log('====================================================================\n');

  // Test User Accounts
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
      name: 'Aarav Customer',
      email: 'aarav@example.com',
      phone: '9876543210',
      role: 'customer',
      accountStatus: 'active'
    },
    {
      _id: customerId2,
      name: 'Diya Customer',
      email: 'diya@example.com',
      phone: '9123456789',
      role: 'customer',
      accountStatus: 'active'
    },
    {
      _id: adminId,
      name: 'Super Admin',
      email: 'admin@busgo.com',
      phone: '9000000000',
      role: 'admin',
      accountStatus: 'active'
    }
  ];

  const mockOperator = {
    _id: operatorProfileId,
    userId: operatorUserId,
    companyName: 'Northern Super Express',
    registrationNumber: 'GSTIN07AABCN8888G1Z2',
    contactPerson: 'Harish Verma',
    approvalStatus: 'approved'
  };

  const stopDelhi = {
    _id: new mongoose.Types.ObjectId(),
    stopName: 'Kashmere Gate ISBT',
    city: 'Delhi',
    state: 'Delhi'
  };

  const stopChandigarh = {
    _id: new mongoose.Types.ObjectId(),
    stopName: 'Sector 43 Bus Stand',
    city: 'Chandigarh',
    state: 'Punjab'
  };

  const mockBus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: 'DL-01-EXP-9999',
    registrationNumber: 'DL01EX9999',
    busType: 'AC Sleeper',
    totalSeats: 30,
    amenities: ['AC', 'Blanket', 'Reading Light']
  };

  const mockRoute = {
    _id: new mongoose.Types.ObjectId(),
    routeName: 'Delhi to Chandigarh Express',
    sourceStopId: stopDelhi,
    destinationStopId: stopChandigarh
  };

  // Scheduled departure 30 hours in future (consistently strictly > 24 hours for top tier cancellation)
  const tomorrow = new Date(Date.now() + 30 * 3600 * 1000);

  const mockTrip = {
    _id: new mongoose.Types.ObjectId(),
    operatorId: mockOperator,
    busId: mockBus,
    routeId: mockRoute,
    travelDate: tomorrow,
    departureTime: tomorrow,
    arrivalTime: new Date(tomorrow.getTime() + 5 * 3600 * 1000),
    baseFare: 1000,
    tripStatus: 'scheduled'
  };

  const mockTripStops = [
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      stopId: stopDelhi,
      stopSequence: 1,
      departureTime: tomorrow
    },
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      stopId: stopChandigarh,
      stopSequence: 2,
      arrivalTime: new Date(tomorrow.getTime() + 5 * 3600 * 1000)
    }
  ];

  // In-memory collections
  const mockSeatInventories = [];
  const mockBookings = [];
  const mockPassengers = [];
  const mockBookingSeats = [];
  const mockPayments = [];
  const mockCancellations = [];
  const mockCancellationItems = [];
  const mockRefunds = [];
  const mockNotifications = [];
  const mockAuditLogs = [];

  // Initialize SeatInventories for test seats 1A, 1B, 1C, 2A
  ['1A', '1B', '1C', '2A'].forEach((seatNumber) => {
    mockSeatInventories.push({
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrip._id,
      seatNumber,
      deck: 1,
      seatType: 'sleeper',
      isActive: true,
      activeSegments: [],
      save: async function () {
        return this;
      }
    });
  });

  // Query helper
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
    const rawId = id && id._id ? id._id.toString() : id ? id.toString() : null;
    const u = mockUsers.find((x) => x._id.toString() === rawId);
    return makeChainableQuery(u || null);
  };

  Trip.findById = function (id) {
    const rawId = id && id._id ? id._id.toString() : id ? id.toString() : null;
    if (rawId === mockTrip._id.toString()) {
      return makeChainableQuery(mockTrip);
    }
    return makeChainableQuery(null);
  };

  TripStop.find = function (q = {}) {
    let list = [...mockTripStops];
    if (q.tripId) list = list.filter((ts) => ts.tripId.toString() === q.tripId.toString());
    return makeChainableQuery(list);
  };

  TripStop.findOne = function (q = {}) {
    let item = mockTripStops.find(
      (ts) =>
        (!q.tripId || ts.tripId.toString() === q.tripId.toString()) &&
        (!q.stopId || ts.stopId._id.toString() === q.stopId.toString())
    );
    return makeChainableQuery(item || null);
  };

  SeatInventory.findById = function (id) {
    const si = mockSeatInventories.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(si || null);
  };

  SeatInventory.find = function (q = {}) {
    let list = [...mockSeatInventories];
    if (q['activeSegments.status']) {
      list = list.filter((si) =>
        si.activeSegments.some((seg) => seg.status === q['activeSegments.status'])
      );
    }
    return makeChainableQuery(list);
  };

  Booking.findById = function (id) {
    const b = mockBookings.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(b || null);
  };

  Booking.findOne = function (q = {}) {
    let b = null;
    if (q.pnr) b = mockBookings.find((x) => x.pnr === q.pnr);
    return makeChainableQuery(b || null);
  };

  Booking.find = function (q = {}) {
    let list = [...mockBookings];
    if (q.userId) list = list.filter((x) => x.userId.toString() === q.userId.toString());
    if (q.bookingStatus) {
      if (typeof q.bookingStatus === 'string') {
        list = list.filter((x) => x.bookingStatus === q.bookingStatus);
      }
    }
    if (q.holdExpiresAt?.$lt) {
      list = list.filter((x) => x.holdExpiresAt && new Date(x.holdExpiresAt) < q.holdExpiresAt.$lt);
    }
    return makeChainableQuery(list);
  };

  Booking.countDocuments = function (q = {}) {
    let list = [...mockBookings];
    if (q.userId) list = list.filter((x) => x.userId.toString() === q.userId.toString());
    if (q.bookingStatus) list = list.filter((x) => x.bookingStatus === q.bookingStatus);
    return Promise.resolve(list.length);
  };

  Booking.findOneAndUpdate = function (filter = {}, update = {}, options = {}) {
    const b = mockBookings.find((x) => {
      let matches = true;
      if (filter._id && x._id.toString() !== filter._id.toString()) matches = false;
      if (filter.bookingStatus && x.bookingStatus !== filter.bookingStatus) matches = false;
      return matches;
    });
    if (!b) return makeChainableQuery(null);
    if (update.$set) {
      Object.assign(b, update.$set);
    }
    return makeChainableQuery(b);
  };

  Booking.create = async function (data) {
    const b = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      createdAt: new Date(),
      save: async function () {
        return this;
      }
    };
    mockBookings.push(b);
    return b;
  };

  Passenger.find = function (q = {}) {
    let list = [...mockPassengers];
    if (q.bookingId) list = list.filter((p) => p.bookingId.toString() === q.bookingId.toString());
    return makeChainableQuery(list);
  };

  Passenger.create = async function (data) {
    const p = { _id: new mongoose.Types.ObjectId(), ...data };
    mockPassengers.push(p);
    return p;
  };

  BookingSeat.find = function (q = {}) {
    let list = [...mockBookingSeats];
    if (q.bookingId) list = list.filter((s) => s.bookingId.toString() === q.bookingId.toString());
    if (q._id?.$in) {
      const ids = q._id.$in.map((id) => id.toString());
      list = list.filter((s) => ids.includes(s._id.toString()));
    }
    return makeChainableQuery(list);
  };

  BookingSeat.countDocuments = function (q = {}) {
    let list = [...mockBookingSeats];
    if (q.bookingId) list = list.filter((s) => s.bookingId.toString() === q.bookingId.toString());
    if (q.allocationStatus) list = list.filter((s) => s.allocationStatus === q.allocationStatus);
    return Promise.resolve(list.length);
  };

  BookingSeat.findOneAndUpdate = function (filter = {}, update = {}, options = {}) {
    const s = mockBookingSeats.find((x) => {
      let matches = true;
      if (filter._id && x._id.toString() !== filter._id.toString()) matches = false;
      if (filter.allocationStatus && x.allocationStatus !== filter.allocationStatus) matches = false;
      return matches;
    });
    if (!s) return makeChainableQuery(null);
    if (update.$set) {
      Object.assign(s, update.$set);
    }
    return makeChainableQuery(s);
  };

  BookingSeat.updateMany = function (filter = {}, update = {}) {
    let count = 0;
    mockBookingSeats.forEach((s) => {
      if (filter._id?.$in) {
        const ids = filter._id.$in.map((id) => id.toString());
        if (ids.includes(s._id.toString())) {
          if (update.$set) Object.assign(s, update.$set);
          count++;
        }
      }
    });
    return Promise.resolve({ modifiedCount: count });
  };

  BookingSeat.create = async function (data) {
    const bs = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      save: async function () {
        return this;
      }
    };
    mockBookingSeats.push(bs);
    return bs;
  };

  Payment.findOne = function (q = {}) {
    let list = [...mockPayments];
    if (q.idempotencyKey) list = list.filter((p) => p.idempotencyKey === q.idempotencyKey);
    if (q.bookingId) list = list.filter((p) => p.bookingId.toString() === q.bookingId.toString());
    if (q.paymentStatus) list = list.filter((p) => p.paymentStatus === q.paymentStatus);
    return makeChainableQuery(list[list.length - 1] || null);
  };

  Payment.findById = function (id) {
    const p = mockPayments.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(p || null);
  };

  Payment.find = function (q = {}) {
    let list = [...mockPayments];
    if (q.paymentStatus) list = list.filter((p) => p.paymentStatus === q.paymentStatus);
    return makeChainableQuery(list);
  };

  Payment.countDocuments = function (q = {}) {
    let list = [...mockPayments];
    if (q.paymentStatus) list = list.filter((p) => p.paymentStatus === q.paymentStatus);
    return Promise.resolve(list.length);
  };

  Payment.create = async function (data) {
    const p = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      createdAt: new Date(),
      save: async function () {
        return this;
      }
    };
    mockPayments.push(p);
    return p;
  };

  Cancellation.findById = function (id) {
    const c = mockCancellations.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(c || null);
  };

  Cancellation.findByIdAndDelete = function (id) {
    const idx = mockCancellations.findIndex((x) => x._id.toString() === id.toString());
    if (idx !== -1) mockCancellations.splice(idx, 1);
    return makeChainableQuery(null);
  };

  Cancellation.find = function (q = {}) {
    let list = [...mockCancellations];
    if (q.bookingId) list = list.filter((c) => c.bookingId.toString() === q.bookingId.toString());
    if (q.cancellationStatus) list = list.filter((c) => c.cancellationStatus === q.cancellationStatus);
    return makeChainableQuery(list);
  };

  Cancellation.countDocuments = function (q = {}) {
    return Promise.resolve(mockCancellations.length);
  };

  Cancellation.create = async function (data) {
    const c = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      createdAt: new Date(),
      toObject: function () {
        return { ...this };
      },
      save: async function () {
        return this;
      }
    };
    mockCancellations.push(c);
    return c;
  };

  CancellationItem.find = function (q = {}) {
    let list = [...mockCancellationItems];
    if (q.cancellationId) list = list.filter((ci) => ci.cancellationId.toString() === q.cancellationId.toString());
    return makeChainableQuery(list);
  };

  CancellationItem.create = async function (data) {
    const ci = { _id: new mongoose.Types.ObjectId(), ...data };
    mockCancellationItems.push(ci);
    return ci;
  };

  CancellationItem.deleteMany = function (filter = {}) {
    if (filter.cancellationId) {
      const remaining = mockCancellationItems.filter(
        (ci) => ci.cancellationId.toString() !== filter.cancellationId.toString()
      );
      mockCancellationItems.length = 0;
      mockCancellationItems.push(...remaining);
    }
    return Promise.resolve({ deletedCount: 1 });
  };

  Refund.findById = function (id) {
    const r = mockRefunds.find((x) => x._id.toString() === id.toString());
    return makeChainableQuery(r || null);
  };

  Refund.findOne = function (q = {}) {
    let list = [...mockRefunds];
    if (q.cancellationId) list = list.filter((r) => r.cancellationId.toString() === q.cancellationId.toString());
    return makeChainableQuery(list[0] || null);
  };

  Refund.find = function (q = {}) {
    let list = [...mockRefunds];
    if (q.refundStatus) list = list.filter((r) => r.refundStatus === q.refundStatus);
    if (q.cancellationId?.$in) {
      const ids = q.cancellationId.$in.map((id) => id.toString());
      list = list.filter((r) => ids.includes(r.cancellationId.toString()));
    }
    return makeChainableQuery(list);
  };

  Refund.countDocuments = function (q = {}) {
    let list = [...mockRefunds];
    if (q.refundStatus) list = list.filter((r) => r.refundStatus === q.refundStatus);
    return Promise.resolve(list.length);
  };

  Refund.create = async function (data) {
    const r = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      createdAt: new Date(),
      save: async function () {
        return this;
      }
    };
    mockRefunds.push(r);
    return r;
  };

  Notification.create = async function (data) {
    mockNotifications.push(data);
    return data;
  };

  AuditLog.create = async function (data) {
    mockAuditLogs.push(data);
    return data;
  };

  // Setup Initial Booking for Customer 1 with Seats 1A and 1B
  const si1A = mockSeatInventories.find((s) => s.seatNumber === '1A');
  const si1B = mockSeatInventories.find((s) => s.seatNumber === '1B');

  const booking1 = await Booking.create({
    userId: customerId1,
    tripId: mockTrip._id,
    pnr: 'BG77AA1122',
    bookingStatus: 'pending_payment',
    totalAmount: 2000,
    journeyDate: tomorrow,
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const p1 = await Passenger.create({
    bookingId: booking1._id,
    fullName: 'Aarav Kumar',
    age: 28,
    gender: 'male',
    seatNumber: '1A'
  });

  const p2 = await Passenger.create({
    bookingId: booking1._id,
    fullName: 'Pooja Kumar',
    age: 26,
    gender: 'female',
    seatNumber: '1B'
  });

  const bs1 = await BookingSeat.create({
    bookingId: booking1._id,
    passengerId: p1,
    seatInventoryId: si1A._id,
    seatNumber: '1A',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'held',
    holdExpiresAt: booking1.holdExpiresAt
  });

  const bs2 = await BookingSeat.create({
    bookingId: booking1._id,
    passengerId: p2,
    seatInventoryId: si1B._id,
    seatNumber: '1B',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'held',
    holdExpiresAt: booking1.holdExpiresAt
  });

  si1A.activeSegments.push({
    bookingSeatId: bs1._id,
    fromSequence: 1,
    toSequence: 2,
    status: 'held',
    holdExpiresAt: booking1.holdExpiresAt
  });

  si1B.activeSegments.push({
    bookingSeatId: bs2._id,
    fromSequence: 1,
    toSequence: 2,
    status: 'held',
    holdExpiresAt: booking1.holdExpiresAt
  });

  // ===================================================================
  // STEP 1: SIMULATED PAYMENT LIFECYCLE & IDEMPOTENCY
  // ===================================================================
  console.log('--- STEP 1: Simulated Payment Lifecycle & Idempotency ---');

  // 1. Missing fields validation
  const missingFieldRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    { bookingId: booking1._id.toString() },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(missingFieldRes.statusCode === 400, 'Rejects payment with 400 when idempotencyKey is missing');

  // 2. Invalid simulation action
  const invalidActionRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    { bookingId: booking1._id.toString(), idempotencyKey: 'IDEM_1', simulationAction: 'explode' },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(invalidActionRes.statusCode === 400, "Rejects payment with 400 when simulationAction is invalid");

  // 3. Customer 2 trying to pay for Customer 1's booking (Security Isolation)
  const unauthorizedPayRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    { bookingId: booking1._id.toString(), idempotencyKey: 'IDEM_1', simulationAction: 'success' },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(unauthorizedPayRes.statusCode === 403, "Customer 2 is blocked with 403 when attempting to pay for Customer 1's booking");

  // 4. Payment Success Simulation
  const successPayRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: booking1._id.toString(),
      idempotencyKey: 'IDEM_KEY_CUST1_001',
      simulationAction: 'success',
      paymentMethod: 'simulated_card'
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(successPayRes.statusCode === 200, 'Payment success simulation returns 200 OK');
  assert(booking1.bookingStatus === 'confirmed', "Booking status transitioned to 'confirmed'");
  assert(bs1.allocationStatus === 'confirmed' && bs2.allocationStatus === 'confirmed', "BookingSeat allocations transitioned to 'confirmed'");
  assert(
    si1A.activeSegments[0]?.status === 'confirmed' && si1B.activeSegments[0]?.status === 'confirmed',
    "SeatInventory activeSegments updated to 'confirmed'"
  );
  assert(
    successPayRes.body.data?.payment?.paymentReference?.startsWith('SIM_TXN_'),
    'Payment generated valid simulated transaction reference (SIM_TXN_...)'
  );

  // 5. Idempotent Replay (Same idempotencyKey)
  const replayPayRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: booking1._id.toString(),
      idempotencyKey: 'IDEM_KEY_CUST1_001',
      simulationAction: 'success'
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(replayPayRes.statusCode === 200, 'Replaying payment with same idempotency key succeeds idempotently (200 OK)');
  assert(replayPayRes.body.data?.isDuplicate === true, 'Response explicitly flags idempotent duplicate replay');

  // 6. Payment Failure Simulation: Setup a second booking for failure test
  const si1C = mockSeatInventories.find((s) => s.seatNumber === '1C');
  const booking2 = await Booking.create({
    userId: customerId2,
    tripId: mockTrip._id,
    pnr: 'BG88BB2233',
    bookingStatus: 'pending_payment',
    totalAmount: 1000,
    journeyDate: tomorrow,
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  const bs3 = await BookingSeat.create({
    bookingId: booking2._id,
    passengerId: customerId2,
    seatInventoryId: si1C._id,
    seatNumber: '1C',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'held',
    holdExpiresAt: booking2.holdExpiresAt
  });
  si1C.activeSegments.push({
    bookingSeatId: bs3._id,
    fromSequence: 1,
    toSequence: 2,
    status: 'held',
    holdExpiresAt: booking2.holdExpiresAt
  });

  const failPayRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: booking2._id.toString(),
      idempotencyKey: 'IDEM_KEY_CUST2_FAIL',
      simulationAction: 'failure'
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(failPayRes.statusCode === 200, 'Payment failure simulation returns 200 with fail status payload');
  assert(booking2.bookingStatus === 'failed', "Booking transitioned to 'failed'");
  assert(bs3.allocationStatus === 'released', "Seat allocation released ('released')");
  assert(
    !si1C.activeSegments.some((seg) => seg.bookingSeatId?.toString() === bs3._id.toString()),
    'Held segment was removed from SeatInventory.activeSegments'
  );

  // 7. Attempting payment on an already failed/cancelled booking
  const retryFailedRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: booking2._id.toString(),
      idempotencyKey: 'IDEM_KEY_CUST2_RETRY',
      simulationAction: 'success'
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(retryFailedRes.statusCode === 400, "Rejects payment with 400 for booking in 'failed' status");

  // ===================================================================
  // STEP 2: HOLD EXPIRATION & STALE RESERVATION REJECTION
  // ===================================================================
  console.log('\n--- STEP 2: Hold Expiration & Stale Payment Rejection ---');

  const si2A = mockSeatInventories.find((s) => s.seatNumber === '2A');
  const staleBooking = await Booking.create({
    userId: customerId1,
    tripId: mockTrip._id,
    pnr: 'BG99CC3344',
    bookingStatus: 'pending_payment',
    totalAmount: 1000,
    journeyDate: tomorrow,
    holdExpiresAt: new Date(Date.now() - 5000) // 5 seconds in the past!
  });
  const staleSeat = await BookingSeat.create({
    bookingId: staleBooking._id,
    passengerId: p1,
    seatInventoryId: si2A._id,
    seatNumber: '2A',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'held',
    holdExpiresAt: staleBooking.holdExpiresAt
  });
  si2A.activeSegments.push({
    bookingSeatId: staleSeat._id,
    fromSequence: 1,
    toSequence: 2,
    status: 'held',
    holdExpiresAt: staleBooking.holdExpiresAt
  });

  const stalePayRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: staleBooking._id.toString(),
      idempotencyKey: 'IDEM_STALE_001',
      simulationAction: 'success'
    },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(stalePayRes.statusCode === 400, 'Rejects payment with 400 when 10-minute hold window has expired');
  assert(staleBooking.bookingStatus === 'expired', "Stale booking automatically transitioned to 'expired'");
  assert(
    !si2A.activeSegments.some((seg) => seg.bookingSeatId?.toString() === staleSeat._id.toString()),
    'Stale held segment automatically cleaned from SeatInventory'
  );

  // ===================================================================
  // STEP 3: CONFIRMED TICKET GENERATION & PNR VERIFICATION
  // ===================================================================
  console.log('\n--- STEP 3: Confirmed Ticket Generation & PNR Verification ---');

  // 1. Customer 1 fetches their confirmed ticket
  const ticketRes = await simulateRequest(
    'GET',
    `/api/bookings/${booking1._id}/ticket`,
    null,
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(ticketRes.statusCode === 200, 'Customer fetches ticket successfully with 200 OK');
  assert(ticketRes.body.data?.pnr === 'BG77AA1122', 'Ticket data contains correct PNR');
  assert(ticketRes.body.data?.qrPayload?.includes('BG77AA1122'), 'Ticket contains QR payload string with PNR');
  assert(ticketRes.body.data?.policySummary?.cutoffHours === 2, 'Ticket includes cancellation policy cutoff summary');

  // 2. Customer 2 blocked from viewing Customer 1's ticket
  const unauthTicketRes = await simulateRequest(
    'GET',
    `/api/bookings/${booking1._id}/ticket`,
    null,
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(unauthTicketRes.statusCode === 403, "Customer 2 receives 403 Forbidden when attempting to view Customer 1's ticket");

  // 3. Admin can view ticket
  const adminTicketRes = await simulateRequest(
    'GET',
    `/api/bookings/${booking1._id}/ticket`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(adminTicketRes.statusCode === 200, 'Administrator can access any customer ticket for verification (200 OK)');

  // 4. Public PNR verification (Masked privacy check)
  const verifyRes = await simulateRequest('GET', '/api/bookings/verify/BG77AA1122');
  assert(verifyRes.statusCode === 200, 'Public PNR verification succeeds with 200 OK');
  assert(verifyRes.body.data?.pnr === 'BG77AA1122', 'Public verification returns correct booking details');
  assert(
    verifyRes.body.data?.customer?.phone?.includes('***'),
    'Public verification masks phone number to protect customer privacy'
  );
  assert(
    verifyRes.body.data?.customer?.email?.includes('***'),
    'Public verification masks email to protect customer privacy'
  );

  // 5. Invalid PNR returns 404
  const invalidPnrRes = await simulateRequest('GET', '/api/bookings/verify/NONEXIST99');
  assert(invalidPnrRes.statusCode === 404, 'Public verification with non-existent PNR returns 404');

  // ===================================================================
  // STEP 4: EXPIRATION CLEANUP ROUTINE
  // ===================================================================
  console.log('\n--- STEP 4: Expired Hold Cleanup Routine ---');

  const cleanupRes = await simulateRequest(
    'POST',
    '/api/bookings/cleanup-expired',
    {},
    { authorization: `Bearer ${adminToken}` }
  );
  assert(cleanupRes.statusCode === 200, 'POST /api/bookings/cleanup-expired executes successfully with 200 OK');
  assert(typeof cleanupRes.body.data?.cleanedCount === 'number', 'Cleanup routine reports cleaned count metric');
  assert(typeof cleanupRes.body.data?.releasedSeats === 'number', 'Cleanup routine reports released seats metric');

  // Re-running cleanup is idempotent
  const repeatCleanupRes = await simulateRequest(
    'POST',
    '/api/bookings/cleanup-expired',
    {},
    { authorization: `Bearer ${adminToken}` }
  );
  assert(repeatCleanupRes.statusCode === 200, 'Repeat cleanup executes idempotently without errors');

  // ===================================================================
  // STEP 5: TIERED CANCELLATION POLICY ENGINE
  // ===================================================================
  console.log('\n--- STEP 5: Tiered Cancellation Policy Engine ---');

  const fare = 1000;
  const now = new Date('2026-05-10T10:00:00Z');

  // Tier 1: > 24 hours (10% charge, 90% refund)
  const dep30h = new Date('2026-05-11T16:00:00Z'); // 30 hours ahead
  const calc30h = calculateSeatCancellation(dep30h, fare, now);
  assert(calc30h.isEligible === true, 'Calculates >24h cancellation as eligible');
  assert(calc30h.cancellationChargePercent === 10, 'Applies 10% cancellation charge for >24 hours');
  assert(calc30h.cancellationCharge === 100 && calc30h.refundAmount === 900, 'Deduction is ₹100, refund is ₹900');

  // Tier 2: 12 to 24 hours (25% charge, 75% refund)
  const dep18h = new Date('2026-05-11T04:00:00Z'); // 18 hours ahead
  const calc18h = calculateSeatCancellation(dep18h, fare, now);
  assert(calc18h.cancellationChargePercent === 25, 'Applies 25% cancellation charge for 12-24 hours');
  assert(calc18h.cancellationCharge === 250 && calc18h.refundAmount === 750, 'Deduction is ₹250, refund is ₹750');

  // Tier 3: 2 to 12 hours (50% charge, 50% refund)
  const dep5h = new Date('2026-05-10T15:00:00Z'); // 5 hours ahead
  const calc5h = calculateSeatCancellation(dep5h, fare, now);
  assert(calc5h.cancellationChargePercent === 50, 'Applies 50% cancellation charge for 2-12 hours');
  assert(calc5h.cancellationCharge === 500 && calc5h.refundAmount === 500, 'Deduction is ₹500, refund is ₹500');

  // Tier 4: < 2 hours (Cutoff window: non-cancellable, 0% refund)
  const dep1h = new Date('2026-05-10T11:00:00Z'); // 1 hour ahead
  const calc1h = calculateSeatCancellation(dep1h, fare, now);
  assert(calc1h.isEligible === false, 'Cancellation within 2-hour cutoff is ineligible');
  assert(calc1h.refundAmount === 0, 'Refund amount within cutoff is ₹0');

  // Admin policy inspection & configuration
  const policyGetRes = await simulateRequest(
    'GET',
    '/api/admin/cancellation-policy',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(policyGetRes.statusCode === 200, 'Admin fetches cancellation policy with 200 OK');
  assert(policyGetRes.body.data?.policy?.cutoffHours === 2, 'Default cutoff window is 2 hours');

  // Non-admin cannot update policy
  const unauthPolicyPut = await simulateRequest(
    'PUT',
    '/api/admin/cancellation-policy',
    { cutoffHours: 3 },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(unauthPolicyPut.statusCode === 403, 'Customer is blocked with 403 from updating policy');

  // Admin updates policy
  const adminPolicyPut = await simulateRequest(
    'PUT',
    '/api/admin/cancellation-policy',
    { cutoffHours: 3 },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(adminPolicyPut.statusCode === 200, 'Admin updates cutoff hours with 200 OK');
  assert(adminPolicyPut.body.data?.policy?.cutoffHours === 3, 'Updated policy reflects cutoffHours = 3');

  // Restore cutoff to 2 hours for subsequent tests
  updateCancellationPolicy({ cutoffHours: 2 });

  // ===================================================================
  // STEP 6: PARTIAL & FULL CANCELLATION WORKFLOW
  // ===================================================================
  console.log('\n--- STEP 6: Partial & Full Cancellation Workflow ---');

  // 1. Missing bookingSeatIds
  const missingSeatsCancelRes = await simulateRequest(
    'POST',
    `/api/bookings/${booking1._id}/cancel`,
    { bookingSeatIds: [] },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(missingSeatsCancelRes.statusCode === 400, 'Rejects cancellation with 400 when seat IDs array is empty');

  // 2. Duplicate seat IDs in cancellation request
  const dupSeatCancelRes = await simulateRequest(
    'POST',
    `/api/bookings/${booking1._id}/cancel`,
    { bookingSeatIds: [bs1._id.toString(), bs1._id.toString()] },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(dupSeatCancelRes.statusCode === 400, 'Rejects cancellation with 400 when duplicate seat IDs provided');

  // 3. Customer 2 trying to cancel Customer 1's seats
  const unauthCancelRes = await simulateRequest(
    'POST',
    `/api/bookings/${booking1._id}/cancel`,
    { bookingSeatIds: [bs1._id.toString()] },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(unauthCancelRes.statusCode === 403, "Customer 2 receives 403 when trying to cancel Customer 1's seats");

  // 4. Partial Cancellation: Customer 1 cancels Seat 1A (leaves Seat 1B confirmed)
  const partialCancelRes = await simulateRequest(
    'POST',
    `/api/bookings/${booking1._id}/cancel`,
    { bookingSeatIds: [bs1._id.toString()], reason: 'Friend could not make it' },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(partialCancelRes.statusCode === 200, 'Partial cancellation succeeds with 200 OK');
  assert(bs1.allocationStatus === 'cancelled', "Seat 1A allocation updated to 'cancelled'");
  assert(bs2.allocationStatus === 'confirmed', "Seat 1B allocation remains 'confirmed'");
  assert(booking1.bookingStatus === 'partially_cancelled', "Booking status transitioned to 'partially_cancelled'");
  assert(
    !si1A.activeSegments.some((seg) => seg.bookingSeatId?.toString() === bs1._id.toString()),
    'Cancelled Seat 1A segment released from SeatInventory'
  );
  assert(
    si1B.activeSegments.some((seg) => seg.bookingSeatId?.toString() === bs2._id.toString()),
    'Remaining Seat 1B segment remains active in SeatInventory'
  );
  assert(
    partialCancelRes.body.data?.refund?.refundAmount === 900,
    'Estimated refund of ₹900 generated according to 10% charge tier'
  );

  // 5. Attempting to re-cancel the already cancelled seat 1A
  const reCancelRes = await simulateRequest(
    'POST',
    `/api/bookings/${booking1._id}/cancel`,
    { bookingSeatIds: [bs1._id.toString()] },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(reCancelRes.statusCode === 400, "Rejects re-cancellation with 400 for already cancelled seat");

  // 6. Complete Cancellation: Cancel remaining Seat 1B
  const completeCancelRes = await simulateRequest(
    'POST',
    `/api/bookings/${booking1._id}/cancel`,
    { bookingSeatIds: [bs2._id.toString()], reason: 'Need to cancel full trip' },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(completeCancelRes.statusCode === 200, 'Final seat cancellation succeeds with 200 OK');
  assert(bs2.allocationStatus === 'cancelled', "Seat 1B allocation updated to 'cancelled'");
  assert(booking1.bookingStatus === 'cancelled', "Booking status transitioned to 'cancelled' once all seats cancelled");
  assert(
    !si1B.activeSegments.some((seg) => seg.bookingSeatId?.toString() === bs2._id.toString()),
    'Seat 1B segment released from SeatInventory'
  );

  // 7. View Cancellation History for Booking
  const cancelHistoryRes = await simulateRequest(
    'GET',
    `/api/bookings/${booking1._id}/cancellations`,
    null,
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(cancelHistoryRes.statusCode === 200, 'Fetches cancellation history for booking with 200 OK');
  assert(cancelHistoryRes.body.data?.cancellations?.length === 2, 'History contains 2 cancellation records');

  // ===================================================================
  // STEP 7: SIMULATED REFUND MANAGEMENT & ADMIN WORKFLOWS
  // ===================================================================
  console.log('\n--- STEP 7: Simulated Refund Management & Admin Workflows ---');

  const generatedRefund = mockRefunds[0];
  assert(generatedRefund !== undefined, 'Refund record exists in database');
  assert(generatedRefund.refundReference.startsWith('SIM_REF_'), 'Refund reference formatted as SIM_REF_...');

  // 1. Customer views refunds for their booking
  const custRefundsRes = await simulateRequest(
    'GET',
    `/api/bookings/${booking1._id}/refunds`,
    null,
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(custRefundsRes.statusCode === 200, 'Customer fetches booking refunds with 200 OK');
  assert(custRefundsRes.body.data?.refunds?.length === 2, 'Returns both refund records generated for the cancellations');

  // 2. Customer 2 blocked from viewing Customer 1's refunds
  const unauthRefundsRes = await simulateRequest(
    'GET',
    `/api/bookings/${booking1._id}/refunds`,
    null,
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(unauthRefundsRes.statusCode === 403, "Customer 2 receives 403 when trying to access Customer 1's refunds");

  // 3. Admin lists all system refunds
  const adminRefundsList = await simulateRequest(
    'GET',
    '/api/admin/refunds',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(adminRefundsList.statusCode === 200, 'Admin lists refunds with 200 OK');
  assert(adminRefundsList.body.data?.refunds?.length >= 2, 'Admin receives all registered refunds');

  // 4. Admin simulates refund status update (e.g. mark 'failed' or 'completed')
  const refundSimRes = await simulateRequest(
    'POST',
    `/api/admin/refunds/${generatedRefund._id}/simulate`,
    { status: 'processing', reason: 'Gateway processing simulated' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(refundSimRes.statusCode === 200, 'Admin simulates refund status update with 200 OK');
  assert(generatedRefund.refundStatus === 'processing', "Refund status successfully updated to 'processing'");

  // 5. Non-admin blocked from admin refund simulation
  const unauthRefundSim = await simulateRequest(
    'POST',
    `/api/admin/refunds/${generatedRefund._id}/simulate`,
    { status: 'completed' },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(unauthRefundSim.statusCode === 403, 'Customer blocked with 403 from admin refund simulation');

  // ===================================================================
  // STEP 8: ADMIN REPORTING & AUDIT TRAIL
  // ===================================================================
  console.log('\n--- STEP 8: Admin Financial Reporting & Audit Trail ---');

  // 1. Admin lists all payments
  const adminPaymentsRes = await simulateRequest(
    'GET',
    '/api/admin/payments',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(adminPaymentsRes.statusCode === 200, 'Admin lists all payments with 200 OK');
  assert(adminPaymentsRes.body.data?.payments?.length >= 2, 'Admin receives list of all payments');

  // 2. Admin lists all cancellations
  const adminCancellationsRes = await simulateRequest(
    'GET',
    '/api/admin/cancellations',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(adminCancellationsRes.statusCode === 200, 'Admin lists all cancellations with 200 OK');
  assert(adminCancellationsRes.body.data?.cancellations?.length === 2, 'Admin receives list of all cancellations');

  // 3. Notifications verification
  const paymentNotification = mockNotifications.find((n) => n.notificationType === 'BOOKING_CONFIRMED');
  assert(paymentNotification !== undefined, "Notification dispatched for 'BOOKING_CONFIRMED'");

  const cancelNotification = mockNotifications.find(
    (n) => n.notificationType === 'BOOKING_CANCELLED' || n.notificationType === 'BOOKING_PARTIALLY_CANCELLED'
  );
  assert(cancelNotification !== undefined, 'Notification dispatched for booking cancellation');

  // 4. Audit Log verification
  const paymentAudit = mockAuditLogs.find((a) => a.action === 'PAYMENT_SUCCESS');
  assert(paymentAudit !== undefined, "AuditLog recorded for 'PAYMENT_SUCCESS'");

  const cancelAudit = mockAuditLogs.find(
    (a) => a.action === 'BOOKING_CANCELLED' || a.action === 'PARTIAL_CANCELLATION'
  );
  assert(cancelAudit !== undefined, 'AuditLog recorded for seat cancellation');

  // ===================================================================
  // STEP 9: CONCURRENCY, IDEMPOTENCY REUSE, BOUNDARY & LIFECYCLE AUDIT
  // ===================================================================
  console.log('\n--- STEP 9: Concurrency, Idempotency Reuse, Boundary & Lifecycle Audit ---');

  // 1. Idempotency Key Reused Across Different Bookings
  const newPendingBooking = await Booking.create({
    userId: customerId2,
    tripId: mockTrip._id,
    pnr: 'BGKEYREUSE1',
    bookingStatus: 'pending_payment',
    totalAmount: 1000,
    journeyDate: tomorrow,
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const stolenKeyRes = await simulateRequest(
    'POST',
    '/api/payments/simulate',
    {
      bookingId: newPendingBooking._id.toString(),
      idempotencyKey: 'IDEM_KEY_CUST1_001', // Already used for booking1!
      simulationAction: 'success'
    },
    { authorization: `Bearer ${customerToken2}` }
  );
  assert(stolenKeyRes.statusCode === 409, 'Rejects payment with 409 when idempotency key was previously used for another booking');

  // 2. Concurrent Payment Requests Race Test
  const raceBooking = await Booking.create({
    userId: customerId1,
    tripId: mockTrip._id,
    pnr: 'BGRACEPAY1',
    bookingStatus: 'pending_payment',
    totalAmount: 1000,
    journeyDate: tomorrow,
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  const siRace = mockSeatInventories.find((s) => s.seatNumber === '2A');
  const bsRace = await BookingSeat.create({
    bookingId: raceBooking._id,
    passengerId: p1,
    seatInventoryId: siRace._id,
    seatNumber: '2A',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'held',
    holdExpiresAt: raceBooking.holdExpiresAt
  });
  siRace.activeSegments.push({
    bookingSeatId: bsRace._id,
    fromSequence: 1,
    toSequence: 2,
    status: 'held',
    holdExpiresAt: raceBooking.holdExpiresAt
  });

  const [racePay1, racePay2] = await Promise.all([
    simulateRequest(
      'POST',
      '/api/payments/simulate',
      {
        bookingId: raceBooking._id.toString(),
        idempotencyKey: 'IDEM_RACE_KEY_A',
        simulationAction: 'success'
      },
      { authorization: `Bearer ${customerToken1}` }
    ),
    simulateRequest(
      'POST',
      '/api/payments/simulate',
      {
        bookingId: raceBooking._id.toString(),
        idempotencyKey: 'IDEM_RACE_KEY_B',
        simulationAction: 'success'
      },
      { authorization: `Bearer ${customerToken1}` }
    )
  ]);

  // One of the racing calls confirms the booking, the other either safely replays or detects state transition
  const hasConfirmedCall = racePay1.statusCode === 200 || racePay2.statusCode === 200;
  assert(hasConfirmedCall, 'Concurrent payment requests successfully process booking without crashes');
  assert(raceBooking.bookingStatus === 'confirmed', 'Booking cleanly transitioned to confirmed under concurrent execution');

  // 3. Concurrent Cancellation of the Exact Same Seat
  const cancelRaceBooking = await Booking.create({
    userId: customerId1,
    tripId: mockTrip._id,
    pnr: 'BGCANCRACE',
    bookingStatus: 'confirmed',
    totalAmount: 1000,
    journeyDate: tomorrow
  });

  const bsCancelRace = await BookingSeat.create({
    bookingId: cancelRaceBooking._id,
    passengerId: p1,
    seatInventoryId: siRace._id,
    seatNumber: '2A',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'confirmed'
  });

  const [cancelRace1, cancelRace2] = await Promise.all([
    simulateRequest(
      'POST',
      `/api/bookings/${cancelRaceBooking._id}/cancel`,
      { bookingSeatIds: [bsCancelRace._id.toString()], reason: 'Race cancellation A' },
      { authorization: `Bearer ${customerToken1}` }
    ),
    simulateRequest(
      'POST',
      `/api/bookings/${cancelRaceBooking._id}/cancel`,
      { bookingSeatIds: [bsCancelRace._id.toString()], reason: 'Race cancellation B' },
      { authorization: `Bearer ${customerToken1}` }
    )
  ]);

  const cancelStatuses = [cancelRace1.statusCode, cancelRace2.statusCode].sort();
  // One succeeds (200), one is rejected (400 or 409)
  assert(
    cancelStatuses[0] === 200 && (cancelStatuses[1] === 400 || cancelStatuses[1] === 409),
    'Concurrent cancellation of the same seat allows only one cancellation and rejects the competing attempt'
  );
  assert(bsCancelRace.allocationStatus === 'cancelled', 'Seat allocation cleanly cancelled exactly once');

  // 4. Multiple Partial Refunds Exceeding Original Payment Cap
  const capBooking = await Booking.create({
    userId: customerId1,
    tripId: mockTrip._id,
    pnr: 'BGCAPTEST1',
    bookingStatus: 'confirmed',
    totalAmount: 1000,
    journeyDate: tomorrow
  });

  const bsCap = await BookingSeat.create({
    bookingId: capBooking._id,
    passengerId: p1,
    seatInventoryId: siRace._id,
    seatNumber: '2A',
    fromSequence: 1,
    toSequence: 2,
    boardingStopId: stopDelhi,
    droppingStopId: stopChandigarh,
    segmentFare: 1000,
    allocationStatus: 'confirmed'
  });

  // Artificially record an existing cancellation on capBooking with ₹950 refund
  await Cancellation.create({
    bookingId: capBooking._id,
    requestedBy: customerId1,
    cancellationStatus: 'processed',
    policySnapshot: { cutoffHours: 2 },
    totalCancellationCharge: 50,
    totalRefundAmount: 950
  });

  // Attempt second cancellation that would refund ₹900 (950 + 900 = 1850 > 1000 totalAmount)
  const refundCapRes = await simulateRequest(
    'POST',
    `/api/bookings/${capBooking._id}/cancel`,
    { bookingSeatIds: [bsCap._id.toString()], reason: 'Exceeding refund test' },
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(refundCapRes.statusCode === 400, 'Rejects cancellation with 400 when cumulative refunds would exceed original payment');
  assert(
    refundCapRes.body?.message?.includes('cannot exceed original eligible payment'),
    'Error message clearly explains refund cap violation'
  );

  // 5. Refund Lifecycle State Machine Transitions
  const testLifecycleRefund = await Refund.create({
    cancellationId: new mongoose.Types.ObjectId(),
    paymentId: new mongoose.Types.ObjectId(),
    refundReference: 'SIM_REF_LIFECYCLE',
    refundAmount: 500,
    refundStatus: 'pending'
  });

  // pending -> processing
  const stepToProcessing = await simulateRequest(
    'POST',
    `/api/admin/refunds/${testLifecycleRefund._id}/simulate`,
    { status: 'processing', reason: 'Transition to processing' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(stepToProcessing.statusCode === 200, 'Refund transitions from pending -> processing (200 OK)');
  assert(testLifecycleRefund.refundStatus === 'processing', "Refund status updated to 'processing'");

  // processing -> completed
  const stepToCompleted = await simulateRequest(
    'POST',
    `/api/admin/refunds/${testLifecycleRefund._id}/simulate`,
    { status: 'completed', reason: 'Settlement completed' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(stepToCompleted.statusCode === 200, 'Refund transitions from processing -> completed (200 OK)');
  assert(testLifecycleRefund.refundStatus === 'completed', "Refund status updated to 'completed'");

  // Duplicate update: completed -> completed (Rejected)
  const dupCompletedRes = await simulateRequest(
    'POST',
    `/api/admin/refunds/${testLifecycleRefund._id}/simulate`,
    { status: 'completed' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(dupCompletedRes.statusCode === 400, 'Duplicate refund status request rejected with 400');

  // Terminal state check: completed -> failed (Rejected)
  const terminalTransitionRes = await simulateRequest(
    'POST',
    `/api/admin/refunds/${testLifecycleRefund._id}/simulate`,
    { status: 'failed' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(terminalTransitionRes.statusCode === 400, "Transition from terminal status 'completed' rejected with 400");

  // Failed state retry: setup failed refund -> processing
  const failedRefund = await Refund.create({
    cancellationId: new mongoose.Types.ObjectId(),
    paymentId: new mongoose.Types.ObjectId(),
    refundReference: 'SIM_REF_FAILED_RETRY',
    refundAmount: 500,
    refundStatus: 'failed'
  });
  const retryFailedRefund = await simulateRequest(
    'POST',
    `/api/admin/refunds/${failedRefund._id}/simulate`,
    { status: 'processing', reason: 'Retry failed refund' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(retryFailedRefund.statusCode === 200, "Failed refund can be retried to 'processing' (200 OK)");

  // 6. Cancellation Policy Exact Boundary Tests
  const refTime = new Date('2026-06-01T12:00:00.000Z');
  const baseTicketFare = 1000;

  // Exact 24.00 hours
  const exact24h = new Date('2026-06-02T12:00:00.000Z');
  const calcExact24 = calculateSeatCancellation(exact24h, baseTicketFare, refTime);
  assert(calcExact24.isEligible === true && calcExact24.cancellationChargePercent === 10, 'Boundary: Exactly 24.00 hours -> 10% charge tier');

  // Just below 24.00 hours (23.99 hours)
  const below24h = new Date('2026-06-02T11:59:24.000Z'); // 23h 59m 24s
  const calcBelow24 = calculateSeatCancellation(below24h, baseTicketFare, refTime);
  assert(calcBelow24.isEligible === true && calcBelow24.cancellationChargePercent === 25, 'Boundary: 23.99 hours -> 25% charge tier');

  // Exact 12.00 hours
  const exact12h = new Date('2026-06-02T00:00:00.000Z');
  const calcExact12 = calculateSeatCancellation(exact12h, baseTicketFare, refTime);
  assert(calcExact12.isEligible === true && calcExact12.cancellationChargePercent === 25, 'Boundary: Exactly 12.00 hours -> 25% charge tier');

  // Just below 12.00 hours (11.99 hours)
  const below12h = new Date('2026-06-01T23:59:24.000Z');
  const calcBelow12 = calculateSeatCancellation(below12h, baseTicketFare, refTime);
  assert(calcBelow12.isEligible === true && calcBelow12.cancellationChargePercent === 50, 'Boundary: 11.99 hours -> 50% charge tier');

  // Exact 2.00 hours
  const exact2h = new Date('2026-06-01T14:00:00.000Z');
  const calcExact2 = calculateSeatCancellation(exact2h, baseTicketFare, refTime);
  assert(calcExact2.isEligible === true && calcExact2.cancellationChargePercent === 50, 'Boundary: Exactly 2.00 hours -> 50% charge tier (eligible)');

  // Just below 2.00 hours (1.99 hours)
  const below2h = new Date('2026-06-01T13:59:24.000Z');
  const calcBelow2 = calculateSeatCancellation(below2h, baseTicketFare, refTime);
  assert(calcBelow2.isEligible === false && calcBelow2.refundAmount === 0, 'Boundary: 1.99 hours -> Cutoff window (ineligible / 0% refund)');

  // After departure (-1.00 hour)
  const pastDeparture = new Date('2026-06-01T11:00:00.000Z');
  const calcPast = calculateSeatCancellation(pastDeparture, baseTicketFare, refTime);
  assert(calcPast.isEligible === false && calcPast.refundAmount === 0, 'Boundary: After scheduled departure -> Non-cancellable (0% refund)');

  // 7. Transaction Rollback & Seat Inventory Consistency
  // Verify that an invalid cancellation request leaves seat allocations and inventory untouched
  const segmentCountBefore = siRace.activeSegments.length;
  const invalidCancelAttempt = await simulateRequest(
    'POST',
    `/api/bookings/${capBooking._id}/cancel`,
    { bookingSeatIds: ['666666666666666666666666'] }, // Non-existent seat ID
    { authorization: `Bearer ${customerToken1}` }
  );
  assert(invalidCancelAttempt.statusCode === 404, 'Invalid cancellation returns 404 error');
  assert(siRace.activeSegments.length === segmentCountBefore, 'SeatInventory segments remain untouched and consistent after failed cancellation');

  // ===================================================================
  // FINAL SUMMARY
  // ===================================================================
  console.log('\n====================================================================');
  console.log(`TOTAL PHASE 7 TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch((err) => {
  console.error('Test execution failed with unhandled exception:', err);
  process.exit(1);
});
