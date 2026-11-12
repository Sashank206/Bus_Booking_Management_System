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

async function runPhase8Tests() {
  console.log('\n====================================================================');
  console.log('       BUSGO PHASE 8: REPORTS, ANALYTICS & DASHBOARD TESTS          ');
  console.log('====================================================================\n');

  // Test User Accounts & Roles
  const adminId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const operatorUserId1 = new mongoose.Types.ObjectId();
  const operatorProfileId1 = new mongoose.Types.ObjectId();
  const operatorUserId2 = new mongoose.Types.ObjectId();
  const operatorProfileId2 = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminId.toString(), role: 'admin' });
  const customerToken = generateToken({ id: customerId.toString(), role: 'customer' });
  const operatorToken1 = generateToken({ id: operatorUserId1.toString(), role: 'operator' });
  const operatorToken2 = generateToken({ id: operatorUserId2.toString(), role: 'operator' });

  const mockUsers = [
    {
      _id: adminId,
      name: 'Super Admin',
      email: 'admin@busgo.com',
      phone: '9000000000',
      role: 'admin',
      accountStatus: 'active'
    },
    {
      _id: customerId,
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      phone: '9876543210',
      role: 'customer',
      accountStatus: 'active'
    },
    {
      _id: operatorUserId1,
      name: 'Operator Verma',
      email: 'verma@express.com',
      phone: '9811122233',
      role: 'operator',
      accountStatus: 'active'
    },
    {
      _id: operatorUserId2,
      name: 'Operator Singh',
      email: 'singh@travels.com',
      phone: '9822233344',
      role: 'operator',
      accountStatus: 'active'
    }
  ];

  const mockOperators = [
    {
      _id: operatorProfileId1,
      userId: operatorUserId1,
      companyName: 'Verma Travels Express',
      registrationNumber: 'GSTIN07VERMA1111G',
      approvalStatus: 'approved'
    },
    {
      _id: operatorProfileId2,
      userId: operatorUserId2,
      companyName: 'Singh Royal Coaches',
      registrationNumber: 'GSTIN07SINGH2222G',
      approvalStatus: 'approved'
    }
  ];

  const mockBuses = [
    {
      _id: new mongoose.Types.ObjectId(),
      operatorId: operatorProfileId1,
      busNumber: 'DL-01-V-1001',
      busType: 'AC Sleeper',
      totalSeats: 30,
      isActive: true
    },
    {
      _id: new mongoose.Types.ObjectId(),
      operatorId: operatorProfileId2,
      busNumber: 'HR-26-S-2002',
      busType: 'Volvo Multi-Axle',
      totalSeats: 40,
      isActive: true
    }
  ];

  const mockRoutes = [
    {
      _id: new mongoose.Types.ObjectId(),
      routeName: 'Delhi to Chandigarh Hyper',
      origin: 'Delhi',
      destination: 'Chandigarh'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      routeName: 'Delhi to Jaipur Superfast',
      origin: 'Delhi',
      destination: 'Jaipur'
    }
  ];

  const now = new Date();
  const departure1 = new Date(now.getTime() + 24 * 3600 * 1000);
  const departure2 = new Date(now.getTime() + 48 * 3600 * 1000);

  const mockTrips = [
    {
      _id: new mongoose.Types.ObjectId(),
      operatorId: mockOperators[0],
      busId: mockBuses[0],
      routeId: mockRoutes[0],
      travelDate: departure1,
      departureTime: departure1,
      arrivalTime: new Date(departure1.getTime() + 5 * 3600 * 1000),
      baseFare: 1000,
      tripStatus: 'scheduled'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      operatorId: mockOperators[1],
      busId: mockBuses[1],
      routeId: mockRoutes[1],
      travelDate: departure2,
      departureTime: departure2,
      arrivalTime: new Date(departure2.getTime() + 6 * 3600 * 1000),
      baseFare: 800,
      tripStatus: 'scheduled'
    }
  ];

  const mockBookings = [
    {
      _id: new mongoose.Types.ObjectId(),
      pnr: 'BG-ADM-101',
      userId: mockUsers[1],
      tripId: mockTrips[0],
      bookingStatus: 'confirmed',
      totalAmount: 2000,
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      pnr: 'BG-ADM-102',
      userId: mockUsers[1],
      tripId: mockTrips[0],
      bookingStatus: 'cancelled',
      totalAmount: 1000,
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      pnr: 'BG-ADM-103',
      userId: mockUsers[1],
      tripId: mockTrips[1],
      bookingStatus: 'confirmed',
      totalAmount: 1600,
      createdAt: new Date(now.getTime() - 1 * 3600 * 1000)
    }
  ];

  const mockPassengers = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[0]._id,
      fullName: 'Rohan Sharma',
      age: 28,
      gender: 'male',
      phone: '9876543210',
      email: 'rohan@example.com'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[0]._id,
      fullName: 'Pooja Sharma',
      age: 26,
      gender: 'female',
      phone: '9876543211',
      email: 'pooja@example.com'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[1]._id,
      fullName: 'Amit Kumar',
      age: 32,
      gender: 'male',
      phone: '9876543212',
      email: 'amit@example.com'
    }
  ];

  const mockBookingSeats = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[0]._id,
      passengerId: mockPassengers[0],
      seatNumber: '1A',
      fromSequence: 1,
      toSequence: 2,
      segmentFare: 1000,
      allocationStatus: 'confirmed'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[0]._id,
      passengerId: mockPassengers[1],
      seatNumber: '1B',
      fromSequence: 1,
      toSequence: 2,
      segmentFare: 1000,
      allocationStatus: 'confirmed'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[1]._id,
      passengerId: mockPassengers[2],
      seatNumber: '2A',
      fromSequence: 1,
      toSequence: 2,
      segmentFare: 1000,
      allocationStatus: 'cancelled'
    }
  ];

  const mockPayments = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[0],
      paymentReference: 'PAY_SIM_101',
      paymentMethod: 'simulated_card',
      paymentAmount: 2000,
      paymentStatus: 'successful',
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[1],
      paymentReference: 'PAY_SIM_102',
      paymentMethod: 'simulated_upi',
      paymentAmount: 1000,
      paymentStatus: 'successful',
      createdAt: new Date(now.getTime() - 4 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[2],
      paymentReference: 'PAY_SIM_103',
      paymentMethod: 'simulated_netbanking',
      paymentAmount: 1600,
      paymentStatus: 'successful',
      createdAt: new Date(now.getTime() - 1 * 3600 * 1000)
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[0],
      paymentReference: 'PAY_SIM_FAIL',
      paymentMethod: 'simulated_card',
      paymentAmount: 500,
      paymentStatus: 'failed',
      createdAt: new Date(now.getTime() - 5 * 3600 * 1000)
    }
  ];

  const mockCancellations = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingId: mockBookings[1],
      requestedBy: mockUsers[1],
      cancellationStatus: 'processed',
      totalCancellationCharge: 100,
      totalRefundAmount: 900,
      createdAt: new Date(now.getTime() - 3 * 3600 * 1000)
    }
  ];

  const mockRefunds = [
    {
      _id: new mongoose.Types.ObjectId(),
      cancellationId: mockCancellations[0],
      refundReference: 'SIM_REF_101',
      refundAmount: 900,
      refundStatus: 'completed',
      createdAt: new Date(now.getTime() - 3 * 3600 * 1000)
    }
  ];

  const mockTripStops = [
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrips[0]._id,
      stopSequence: 1,
      stopId: { stopName: 'Delhi ISBT' }
    },
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrips[0]._id,
      stopSequence: 2,
      stopId: { stopName: 'Chandigarh Stand' }
    }
  ];

  const mockSeatInventories = [
    {
      _id: new mongoose.Types.ObjectId(),
      tripId: mockTrips[0]._id,
      seatNumber: '3A',
      activeSegments: [
        {
          status: 'held',
          holdExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          fromSequence: 1,
          toSequence: 2
        }
      ]
    }
  ];

  // Configure Mongoose Mocks
  User.findById = function (id) {
    const u = mockUsers.find((x) => x._id.toString() === id.toString());
    return {
      select: () => Promise.resolve(u),
      then: (fn) => Promise.resolve(u).then(fn)
    };
  };

  User.countDocuments = function (q = {}) {
    if (q.role === 'customer') {
      return Promise.resolve(mockUsers.filter((u) => u.role === 'customer').length);
    }
    return Promise.resolve(mockUsers.length);
  };

  Operator.findOne = function (q = {}) {
    let op = null;
    if (q.userId) {
      op = mockOperators.find((o) => o.userId.toString() === q.userId.toString());
    } else if (q._id) {
      op = mockOperators.find((o) => o._id.toString() === q._id.toString());
    }
    return {
      populate: () => Promise.resolve(op),
      then: (fn) => Promise.resolve(op).then(fn)
    };
  };

  Operator.countDocuments = function (q = {}) {
    let list = mockOperators;
    if (q.approvalStatus) list = list.filter((o) => o.approvalStatus === q.approvalStatus);
    return Promise.resolve(list.length);
  };

  Operator.find = function () {
    return {
      populate: () => ({
        sort: () => Promise.resolve(mockOperators)
      }),
      sort: () => Promise.resolve(mockOperators),
      then: (fn) => Promise.resolve(mockOperators).then(fn)
    };
  };

  Bus.countDocuments = function (q = {}) {
    let list = mockBuses;
    if (q.operatorId) list = list.filter((b) => b.operatorId.toString() === q.operatorId.toString());
    if (q.isActive !== undefined) list = list.filter((b) => b.isActive === q.isActive);
    return Promise.resolve(list.length);
  };

  Route.countDocuments = function () {
    return Promise.resolve(mockRoutes.length);
  };

  Trip.countDocuments = function (q = {}) {
    let list = mockTrips;
    if (q.operatorId) {
      list = list.filter(
        (t) => (t.operatorId._id || t.operatorId).toString() === q.operatorId.toString()
      );
    }
    if (q.tripStatus === 'cancelled') {
      list = list.filter((t) => t.tripStatus === 'cancelled');
    }
    return Promise.resolve(list.length);
  };

  Trip.find = function (q = {}) {
    let list = [...mockTrips];
    if (q.operatorId) {
      list = list.filter(
        (t) => (t.operatorId._id || t.operatorId).toString() === q.operatorId.toString()
      );
    }
    if (q._id) {
      list = list.filter((t) => t._id.toString() === q._id.toString());
    }

    const queryObj = {
      populate: () => queryObj,
      select: () => queryObj,
      sort: () => queryObj,
      skip: () => queryObj,
      limit: (n) => Promise.resolve(list.slice(0, n || 100)),
      then: (fn) => Promise.resolve(list).then(fn)
    };
    return queryObj;
  };

  Trip.findById = function (id) {
    const t = mockTrips.find((x) => x._id.toString() === (id._id || id).toString());
    const queryObj = {
      populate: () => queryObj,
      then: (fn) => Promise.resolve(t).then(fn)
    };
    return queryObj;
  };

  Booking.countDocuments = function (q = {}) {
    let list = mockBookings;
    if (q.bookingStatus) {
      if (typeof q.bookingStatus === 'string') {
        list = list.filter((b) => b.bookingStatus === q.bookingStatus);
      } else if (q.bookingStatus.$in) {
        list = list.filter((b) => q.bookingStatus.$in.includes(b.bookingStatus));
      }
    }
    return Promise.resolve(list.length);
  };

  Booking.find = function (q = {}) {
    let list = [...mockBookings];
    if (q.tripId) {
      if (q.tripId.$in) {
        const idStrs = q.tripId.$in.map((x) => x.toString());
        list = list.filter((b) => idStrs.includes((b.tripId._id || b.tripId).toString()));
      } else {
        list = list.filter(
          (b) => (b.tripId._id || b.tripId).toString() === q.tripId.toString()
        );
      }
    }
    const queryObj = {
      populate: () => queryObj,
      select: () => queryObj,
      sort: () => queryObj,
      limit: (n) => Promise.resolve(list.slice(0, n || 100)),
      then: (fn) => Promise.resolve(list).then(fn)
    };
    return queryObj;
  };

  Booking.aggregate = function (pipeline = []) {
    return Promise.resolve([
      {
        _id: 'confirmed',
        count: 2,
        amount: 3600
      },
      {
        _id: 'cancelled',
        count: 1,
        amount: 1000
      }
    ]);
  };

  BookingSeat.countDocuments = function (q = {}) {
    let list = mockBookingSeats;
    if (q.allocationStatus) list = list.filter((s) => s.allocationStatus === q.allocationStatus);
    if (q.bookingId && q.bookingId.$in) {
      const bIds = q.bookingId.$in.map((x) => x.toString());
      list = list.filter((s) => bIds.includes(s.bookingId.toString()));
    }
    return Promise.resolve(list.length);
  };

  BookingSeat.find = function (q = {}) {
    let list = [...mockBookingSeats];
    if (q.bookingId) {
      if (q.bookingId.$in) {
        const idStrs = q.bookingId.$in.map((x) => x.toString());
        list = list.filter((s) => idStrs.includes(s.bookingId.toString()));
      } else {
        list = list.filter((s) => s.bookingId.toString() === q.bookingId.toString());
      }
    }
    if (q.allocationStatus) {
      if (typeof q.allocationStatus === 'string') {
        list = list.filter((s) => s.allocationStatus === q.allocationStatus);
      } else if (q.allocationStatus.$in) {
        list = list.filter((s) => q.allocationStatus.$in.includes(s.allocationStatus));
      }
    }
    if (q.seatNumber) {
      list = list.filter((s) => s.seatNumber === q.seatNumber);
    }
    const queryObj = {
      populate: () => queryObj,
      sort: () => queryObj,
      then: (fn) => Promise.resolve(list).then(fn)
    };
    return queryObj;
  };

  Payment.aggregate = function () {
    return Promise.resolve([
      { _id: 'successful', totalAmount: 4600, count: 3 },
      { _id: 'failed', totalAmount: 500, count: 1 }
    ]);
  };

  const makeQueryObj = (list) => {
    const q = {
      populate: () => q,
      select: () => q,
      sort: () => q,
      skip: () => q,
      limit: (n) => Promise.resolve(typeof n === 'number' ? list.slice(0, n) : list),
      then: (fn) => Promise.resolve(list).then(fn)
    };
    return q;
  };

  Payment.find = function () {
    return makeQueryObj(mockPayments);
  };

  Refund.aggregate = function () {
    return Promise.resolve([{ _id: 'completed', totalAmount: 900, count: 1 }]);
  };

  Refund.find = function () {
    return makeQueryObj(mockRefunds);
  };

  Cancellation.find = function () {
    return makeQueryObj(mockCancellations);
  };

  SeatInventory.aggregate = function () {
    return Promise.resolve([{ heldCount: 1 }]);
  };

  TripStop.find = function (q = {}) {
    let list = [...mockTripStops];
    if (q.tripId) {
      list = list.filter((ts) => ts.tripId.toString() === (q.tripId._id || q.tripId).toString());
    }
    const queryObj = {
      populate: () => queryObj,
      sort: () => {
        list.sort((a, b) => a.stopSequence - b.stopSequence);
        return queryObj;
      },
      then: (fn) => Promise.resolve(list).then(fn)
    };
    return queryObj;
  };

  SeatInventory.find = function (q = {}) {
    let list = [...mockSeatInventories];
    if (q.tripId) {
      list = list.filter((si) => si.tripId.toString() === (q.tripId._id || q.tripId).toString());
    }
    const queryObj = {
      populate: () => queryObj,
      sort: () => queryObj,
      then: (fn) => Promise.resolve(list).then(fn)
    };
    return queryObj;
  };

  // --- STEP 1: Admin Analytics Overview Tests ---
  console.log('--- STEP 1: Admin Analytics Overview ---');

  const adminOverviewRes = await simulateRequest('GET', '/api/admin/analytics/overview', null, {
    authorization: `Bearer ${adminToken}`
  });

  assert(adminOverviewRes.statusCode === 200, 'Admin fetches analytics overview with 200 OK');
  assert(
    adminOverviewRes.body.data.summary.totalCustomers === 1,
    'Calculates total registered customers correctly'
  );
  assert(
    adminOverviewRes.body.data.summary.totalOperators === 2,
    'Calculates total registered operators correctly'
  );
  assert(
    adminOverviewRes.body.data.summary.totalBuses === 2,
    'Calculates total buses correctly'
  );
  assert(
    adminOverviewRes.body.data.summary.grossBookingRevenue === 4600,
    'Calculates gross booking revenue from successful payments (₹4600)'
  );
  assert(
    adminOverviewRes.body.data.summary.totalRefunds === 900,
    'Calculates total refunds correctly (₹900)'
  );
  assert(
    adminOverviewRes.body.data.summary.netRevenue === 3700,
    'Calculates net revenue strictly as grossRevenue - totalRefunds (₹3700)'
  );
  assert(
    adminOverviewRes.body.data.summary.failedPaymentsAmount === 500,
    'Failed payments are segregated and excluded from net revenue'
  );
  assert(
    Array.isArray(adminOverviewRes.body.data.charts.bookingTrends),
    'Returns booking trends time series array'
  );
  assert(
    Array.isArray(adminOverviewRes.body.data.charts.bookingStatusDistribution),
    'Returns booking status distribution array'
  );

  // --- STEP 2: Date Range Filtering & Validation ---
  console.log('\n--- STEP 2: Date-Range Filtering & Validation ---');

  const todayRes = await simulateRequest('GET', '/api/admin/analytics/overview?range=today', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(todayRes.statusCode === 200, 'Processes range=today filter with 200 OK');
  assert(todayRes.body.data.dateRange.label === 'today', 'Applies today date label');

  const sevenDaysRes = await simulateRequest('GET', '/api/admin/analytics/overview?range=7days', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(sevenDaysRes.statusCode === 200, 'Processes range=7days filter with 200 OK');

  const customValidRes = await simulateRequest(
    'GET',
    '/api/admin/analytics/overview?startDate=2026-01-01&endDate=2026-12-31',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(customValidRes.statusCode === 200, 'Processes valid custom date range with 200 OK');

  const invalidDateRes = await simulateRequest(
    'GET',
    '/api/admin/analytics/overview?startDate=not-a-valid-date',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(invalidDateRes.statusCode === 400, 'Rejects invalid date format with 400 Bad Request');

  const invertedRangeRes = await simulateRequest(
    'GET',
    '/api/admin/analytics/overview?startDate=2026-12-31&endDate=2026-01-01',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    invertedRangeRes.statusCode === 400,
    'Rejects startDate > endDate with 400 Bad Request'
  );

  // --- STEP 3: Operator Analytics Overview & Strict Ownership ---
  console.log('\n--- STEP 3: Operator Analytics Overview & Isolation ---');

  const opOverviewRes = await simulateRequest('GET', '/api/operator/analytics/overview', null, {
    authorization: `Bearer ${operatorToken1}`
  });

  if (opOverviewRes.statusCode !== 200) {
    console.error('Operator overview error:', opOverviewRes.statusCode, opOverviewRes.body);
  }

  assert(opOverviewRes.statusCode === 200, 'Operator 1 fetches own analytics overview with 200 OK');
  assert(
    opOverviewRes.body.data.metrics.totalBuses === 1,
    'Calculates operator-owned fleet count (1 bus)'
  );
  assert(
    opOverviewRes.body.data.metrics.grossRevenue > 0,
    'Calculates gross revenue for operator-owned trips'
  );
  assert(
    opOverviewRes.body.data.metrics.averageOccupancyPercentage >= 0,
    'Calculates valid average occupancy percentage for operator trips'
  );
  assert(
    Array.isArray(opOverviewRes.body.data.recentActivity.recentBookings),
    'Provides recent bookings activity list'
  );

  // Customer attempting operator endpoint
  const customerBlockedRes = await simulateRequest('GET', '/api/operator/analytics/overview', null, {
    authorization: `Bearer ${customerToken}`
  });
  assert(
    customerBlockedRes.statusCode === 403,
    'Blocks customer from accessing operator analytics with 403 Forbidden'
  );

  // --- STEP 4: Trip Occupancy Report & Formula Verification ---
  console.log('\n--- STEP 4: Trip Occupancy Report ---');

  const occupancyRes = await simulateRequest('GET', '/api/reports/occupancy', null, {
    authorization: `Bearer ${adminToken}`
  });

  assert(occupancyRes.statusCode === 200, 'Admin fetches trip occupancy report with 200 OK');
  assert(
    occupancyRes.body.data.occupancy.length > 0,
    'Occupancy report returns trip rows'
  );

  const row = occupancyRes.body.data.occupancy[0];
  assert(row.totalSeats === 30, 'Displays accurate total seats capacity (30)');
  assert(row.confirmedSeats === 2, 'Displays accurate confirmed seats (2)');
  assert(row.heldSeats === 1, 'Held seats counted separately from confirmed seats (1)');
  assert(
    row.availableSeats === 27,
    'Calculates available seats as Total - Confirmed - Held (30 - 2 - 1 = 27)'
  );
  assert(
    row.occupancyPercentage === 6.7,
    'Calculates occupancy percentage correctly ((2 / 30) * 100 = 6.7%)'
  );

  // Operator-scoped occupancy report
  const opOccupancyRes = await simulateRequest('GET', '/api/operator/reports/occupancy', null, {
    authorization: `Bearer ${operatorToken1}`
  });
  assert(opOccupancyRes.statusCode === 200, 'Operator fetches own occupancy report with 200 OK');
  assert(
    opOccupancyRes.body.data.occupancy.every(
      (r) => r.operatorName.includes('Verma') || r.busNumber.includes('DL-01-V-1001')
    ),
    'Operator occupancy report contains strictly own trips'
  );

  // --- STEP 5: Passenger Manifest & Cross-Operator Authorization ---
  console.log('\n--- STEP 5: Passenger Manifest & Cross-Operator Authorization ---');

  const tripId1 = mockTrips[0]._id;

  // Admin access
  const adminManifestRes = await simulateRequest(
    'GET',
    `/api/reports/trips/${tripId1}/manifest`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(adminManifestRes.statusCode === 200, 'Admin fetches passenger manifest with 200 OK');
  assert(
    adminManifestRes.body.data.passengers.length === 3,
    'Manifest returns all booked and cancelled passengers'
  );

  // Owning Operator access
  const ownerManifestRes = await simulateRequest(
    'GET',
    `/api/operator/reports/trips/${tripId1}/manifest`,
    null,
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    ownerManifestRes.statusCode === 200,
    'Owning Operator 1 accesses own trip passenger manifest with 200 OK'
  );

  // Non-owning Operator access (Forbidden)
  const crossOpManifestRes = await simulateRequest(
    'GET',
    `/api/reports/trips/${tripId1}/manifest`,
    null,
    { authorization: `Bearer ${operatorToken2}` }
  );
  assert(
    crossOpManifestRes.statusCode === 403,
    'Non-owning Operator 2 is blocked from Operator 1 manifest with 403 Forbidden'
  );

  // Filter manifest by status 'confirmed'
  const confirmedManifestRes = await simulateRequest(
    'GET',
    `/api/reports/trips/${tripId1}/manifest?status=confirmed`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    confirmedManifestRes.body.data.passengers.every((p) => p.status === 'confirmed'),
    'Filtering by status=confirmed returns only confirmed passengers'
  );

  // Search manifest by passenger name
  const searchManifestRes = await simulateRequest(
    'GET',
    `/api/reports/trips/${tripId1}/manifest?search=Pooja`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    searchManifestRes.body.data.passengers.length === 1 &&
      searchManifestRes.body.data.passengers[0].passengerName === 'Pooja Sharma',
    'Searches passenger manifest by name successfully'
  );

  // Filter manifest by seat number
  const seatManifestRes = await simulateRequest(
    'GET',
    `/api/reports/trips/${tripId1}/manifest?seat=1A`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    seatManifestRes.body.data.passengers.length === 1 &&
      seatManifestRes.body.data.passengers[0].seatNumber === '1A',
    'Filters manifest by seatNumber successfully'
  );

  // --- STEP 6: Cancellation & Refund Reports ---
  console.log('\n--- STEP 6: Cancellation & Refund Reports ---');

  const cancelReportRes = await simulateRequest('GET', '/api/admin/reports/cancellations', null, {
    authorization: `Bearer ${adminToken}`
  });

  assert(cancelReportRes.statusCode === 200, 'Admin fetches cancellations & refund report with 200 OK');
  assert(
    cancelReportRes.body.data.summary.totalCancellations === 1,
    'Calculates total cancellations count correctly'
  );
  assert(
    cancelReportRes.body.data.summary.totalCancellationCharges === 100,
    'Calculates total cancellation fee deduction correctly (₹100)'
  );
  assert(
    cancelReportRes.body.data.summary.totalRefundAmount === 900,
    'Calculates total refund amount correctly (₹900)'
  );
  assert(
    cancelReportRes.body.data.summary.statusBreakdown.completedCount === 1,
    'Tracks completed refunds in status breakdown'
  );

  // Search refund report by PNR
  const searchRefundRes = await simulateRequest(
    'GET',
    '/api/admin/reports/refunds?search=BG-ADM-102',
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    searchRefundRes.statusCode === 200 && searchRefundRes.body.data.refunds.length === 1,
    'Searches refund report by PNR successfully'
  );

  // --- STEP 7: CSV Export Endpoints & Format Validation ---
  console.log('\n--- STEP 7: CSV Export Validation ---');

  // 1. Occupancy CSV Export
  const occupancyCSV = await simulateRequest('GET', '/api/reports/occupancy?format=csv', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(occupancyCSV.statusCode === 200, 'Occupancy CSV export returns 200 OK');
  assert(
    occupancyCSV.headers['content-type'].includes('text/csv'),
    'Occupancy CSV response header has Content-Type text/csv'
  );
  assert(
    occupancyCSV.headers['content-disposition'].includes('attachment; filename='),
    'Occupancy CSV has attachment Content-Disposition header'
  );
  assert(
    occupancyCSV.body.includes('Trip ID,Bus Number,Operator,Route') ||
      occupancyCSV.body.includes('"Trip ID"'),
    'Occupancy CSV includes valid CSV header line'
  );

  // 2. Passenger Manifest CSV Export
  const manifestCSV = await simulateRequest(
    'GET',
    `/api/reports/trips/${tripId1}/manifest?format=csv`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(manifestCSV.statusCode === 200, 'Passenger Manifest CSV export returns 200 OK');
  assert(
    manifestCSV.headers['content-type'].includes('text/csv'),
    'Passenger Manifest CSV response header has Content-Type text/csv'
  );
  assert(
    manifestCSV.body.includes('Seat,PNR,Passenger Name') || manifestCSV.body.includes('"Seat"'),
    'Passenger Manifest CSV includes valid CSV header line'
  );

  // 3. Admin Bookings CSV Export
  const bookingsCSV = await simulateRequest('GET', '/api/admin/analytics/bookings?format=csv', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(bookingsCSV.statusCode === 200, 'Admin Bookings CSV export returns 200 OK');
  assert(
    bookingsCSV.headers['content-type'].includes('text/csv'),
    'Bookings CSV response header has Content-Type text/csv'
  );

  // 4. Admin Revenue CSV Export
  const revenueCSV = await simulateRequest('GET', '/api/admin/analytics/revenue?format=csv', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(revenueCSV.statusCode === 200, 'Admin Revenue CSV export returns 200 OK');
  assert(
    revenueCSV.headers['content-type'].includes('text/csv'),
    'Revenue CSV response header has Content-Type text/csv'
  );

  // 5. Operator Revenue CSV Export
  const opRevenueCSV = await simulateRequest('GET', '/api/operator/analytics/revenue?format=csv', null, {
    authorization: `Bearer ${operatorToken1}`
  });
  assert(opRevenueCSV.statusCode === 200, 'Operator Revenue CSV export returns 200 OK');
  assert(
    opRevenueCSV.headers['content-type'].includes('text/csv'),
    'Operator Revenue CSV response header has Content-Type text/csv'
  );

  // --- STEP 8: Empty Database & Zero Results Handling ---
  console.log('\n--- STEP 8: Empty Dataset Graceful Handling ---');

  // Temporarily stub models to return zero documents
  const origTripFind = Trip.find;
  const origPaymentFind = Payment.find;
  const origBookingFind = Booking.find;
  const origRefundFind = Refund.find;
  const origCancellationFind = Cancellation.find;
  const origPaymentAgg = Payment.aggregate;
  const origRefundAgg = Refund.aggregate;
  const origBookingAgg = Booking.aggregate;

  Trip.find = () => {
    const q = {
      populate: () => q,
      select: () => q,
      sort: () => q,
      skip: () => q,
      limit: () => Promise.resolve([]),
      then: (fn) => Promise.resolve([]).then(fn)
    };
    return q;
  };
  Trip.countDocuments = () => Promise.resolve(0);
  Booking.countDocuments = () => Promise.resolve(0);
  Payment.aggregate = () => Promise.resolve([]);
  Refund.aggregate = () => Promise.resolve([]);
  Booking.aggregate = () => Promise.resolve([]);

  const emptyOverviewRes = await simulateRequest('GET', '/api/admin/analytics/overview', null, {
    authorization: `Bearer ${adminToken}`
  });

  assert(emptyOverviewRes.statusCode === 200, 'Empty database returns 200 OK without errors');
  assert(
    emptyOverviewRes.body.data.summary.grossBookingRevenue === 0,
    'Returns 0 gross revenue when no payments exist'
  );
  assert(
    emptyOverviewRes.body.data.summary.netRevenue === 0,
    'Returns 0 net revenue when no payments exist'
  );
  assert(
    emptyOverviewRes.body.data.charts.busOccupancyOverview.averageOccupancyPercentage === 0,
    'Returns 0% average occupancy when no trips exist without NaN or error'
  );

  // Restore mocks
  Trip.find = origTripFind;
  Payment.find = origPaymentFind;
  Booking.find = origBookingFind;
  Refund.find = origRefundFind;
  Cancellation.find = origCancellationFind;
  Payment.aggregate = origPaymentAgg;
  Refund.aggregate = origRefundAgg;
  Booking.aggregate = origBookingAgg;

  // --- STEP 9: Critical Segment-Based Seat Reuse Audit ---
  console.log('\n--- STEP 9: Critical Segment-Based Seat Reuse Audit ---');

  // Exact scenario from audit mandate:
  // - Trip has 40 physical seats.
  // - 5 stops (stop sequences 1, 2, 3, 4, 5) -> 4 atomic segments [1,2), [2,3), [3,4), [4,5).
  // - Passenger A books seat 1A from stop 1 to stop 3.
  // - Passenger B books seat 1A from stop 3 to stop 5.
  // - Both bookings are confirmed.
  // - Passenger C booked seat 2A from stop 1 to stop 2, but it was CANCELLED (must not count as active occupancy).

  const tripScenarioId = new mongoose.Types.ObjectId();
  const busScenario = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: 'DL-01-SEAT-40',
    totalSeats: 40,
    busType: 'AC Sleeper'
  };

  const tripScenario = {
    _id: tripScenarioId,
    operatorId: mockOperators[0],
    busId: busScenario,
    routeId: { routeName: 'Delhi to Amritsar Multi-Stop' },
    travelDate: departure1,
    departureTime: departure1,
    arrivalTime: new Date(departure1.getTime() + 8 * 3600 * 1000),
    tripStatus: 'scheduled'
  };

  const tripScenarioStops = [
    { _id: new mongoose.Types.ObjectId(), tripId: tripScenarioId, stopSequence: 1, stopId: { stopName: 'Delhi' } },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScenarioId, stopSequence: 2, stopId: { stopName: 'Panipat' } },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScenarioId, stopSequence: 3, stopId: { stopName: 'Ambala' } },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScenarioId, stopSequence: 4, stopId: { stopName: 'Ludhiana' } },
    { _id: new mongoose.Types.ObjectId(), tripId: tripScenarioId, stopSequence: 5, stopId: { stopName: 'Amritsar' } }
  ];

  const bookingA = { _id: new mongoose.Types.ObjectId(), pnr: 'BG-SEG-01', tripId: tripScenario, bookingStatus: 'confirmed' };
  const bookingB = { _id: new mongoose.Types.ObjectId(), pnr: 'BG-SEG-02', tripId: tripScenario, bookingStatus: 'confirmed' };
  const bookingC = { _id: new mongoose.Types.ObjectId(), pnr: 'BG-SEG-03', tripId: tripScenario, bookingStatus: 'cancelled' };

  const seatA = {
    _id: new mongoose.Types.ObjectId(),
    bookingId: bookingA._id,
    seatNumber: '1A',
    fromSequence: 1,
    toSequence: 3,
    allocationStatus: 'confirmed'
  };

  const seatB = {
    _id: new mongoose.Types.ObjectId(),
    bookingId: bookingB._id,
    seatNumber: '1A',
    fromSequence: 3,
    toSequence: 5,
    allocationStatus: 'confirmed'
  };

  const seatC = {
    _id: new mongoose.Types.ObjectId(),
    bookingId: bookingC._id,
    seatNumber: '2A',
    fromSequence: 1,
    toSequence: 2,
    allocationStatus: 'cancelled'
  };

  mockTrips.push(tripScenario);
  mockTripStops.push(...tripScenarioStops);
  mockBookings.push(bookingA, bookingB, bookingC);
  mockBookingSeats.push(seatA, seatB, seatC);

  const scenarioRes = await simulateRequest('GET', `/api/reports/occupancy?tripId=${tripScenarioId}`, null, {
    authorization: `Bearer ${adminToken}`
  });

  assert(scenarioRes.statusCode === 200, 'Fetches segment-based occupancy report with 200 OK');
  const scenarioRow = scenarioRes.body.data.occupancy.find((r) => r.tripId.toString() === tripScenarioId.toString());

  assert(scenarioRow !== undefined, 'Found scenario trip in occupancy report');
  console.log('SCENARIO ROW DEBUG:', JSON.stringify(scenarioRow, null, 2));
  assert(scenarioRow.totalSeats === 40, 'Total physical seats is 40');
  assert(
    scenarioRow.confirmedSeats === 1,
    'CRITICAL: Non-overlapping seat reuse (1A [1,3) + 1A [3,5)) is counted as 1 peak occupied seat (NOT 2)'
  );
  assert(
    scenarioRow.availableSeats === 39,
    'CRITICAL: Minimum available physical seats is 39 (NOT 38)'
  );
  assert(
    scenarioRow.totalAllocations === 2,
    'Total confirmed ticket allocations across segments is 2'
  );
  assert(
    scenarioRow.cancelledSeats === 1,
    'Cancelled allocation (2A [1,2)) is itemized separately'
  );
  assert(
    scenarioRow.segmentCount === 4,
    'Correctly identifies 4 route segments between 5 sequential stops'
  );

  // Verify Segment-by-Segment accuracy
  const seg1 = scenarioRow.segments.find((s) => s.fromSequence === 1 && s.toSequence === 2);
  const seg2 = scenarioRow.segments.find((s) => s.fromSequence === 2 && s.toSequence === 3);
  const seg3 = scenarioRow.segments.find((s) => s.fromSequence === 3 && s.toSequence === 4);
  const seg4 = scenarioRow.segments.find((s) => s.fromSequence === 4 && s.toSequence === 5);

  assert(
    seg1 && seg1.confirmedSeats === 1 && seg1.availableSeats === 39 && seg1.occupancyPercentage === 2.5,
    'Segment 1 [1,2) (Delhi->Panipat): 1 seat occupied, 39 available, 2.5% occupancy'
  );
  assert(
    seg2 && seg2.confirmedSeats === 1 && seg2.availableSeats === 39 && seg2.occupancyPercentage === 2.5,
    'Segment 2 [2,3) (Panipat->Ambala): 1 seat occupied, 39 available, 2.5% occupancy'
  );
  assert(
    seg3 && seg3.confirmedSeats === 1 && seg3.availableSeats === 39 && seg3.occupancyPercentage === 2.5,
    'Segment 3 [3,4) (Ambala->Ludhiana): 1 seat occupied, 39 available, 2.5% occupancy'
  );
  assert(
    seg4 && seg4.confirmedSeats === 1 && seg4.availableSeats === 39 && seg4.occupancyPercentage === 2.5,
    'Segment 4 [4,5) (Ludhiana->Amritsar): 1 seat occupied, 39 available, 2.5% occupancy'
  );
  assert(
    scenarioRow.occupancyPercentage === 2.5,
    'Overall weighted segment occupancy percentage is exactly 2.5%'
  );
  assert(
    scenarioRow.peakOccupancyPercentage === 2.5,
    'Peak simultaneous occupancy percentage is 2.5%'
  );

  // --- STEP 10: Financial Reconciliation All Refund States ---
  console.log('\n--- STEP 10: Financial Reconciliation All Refund States ---');

  // Configure explicit payment & refund aggregation returns
  Payment.aggregate = function () {
    return Promise.resolve([
      { _id: 'successful', totalAmount: 10000, count: 2 },
      { _id: 'failed', totalAmount: 2000, count: 1 },
      { _id: 'pending', totalAmount: 1500, count: 1 }
    ]);
  };

  Refund.aggregate = function () {
    return Promise.resolve([
      { _id: 'completed', totalAmount: 1000, count: 1 },
      { _id: 'pending', totalAmount: 500, count: 1 },
      { _id: 'processing', totalAmount: 300, count: 1 },
      { _id: 'failed', totalAmount: 400, count: 1 }
    ]);
  };

  const finRes = await simulateRequest('GET', '/api/admin/analytics/overview', null, {
    authorization: `Bearer ${adminToken}`
  });

  assert(finRes.statusCode === 200, 'Fetches financial analytics with 200 OK');
  const finSummary = finRes.body.data.summary;

  assert(finSummary.grossBookingRevenue === 10000, 'Gross revenue strictly sums successful payments (₹10,000)');
  assert(finSummary.completedRefunds === 1000, 'Completed refunds strictly identifies settled refunds (₹1,000)');
  assert(finSummary.pendingRefunds === 500, 'Tracks pending refund requests (₹500)');
  assert(finSummary.processingRefunds === 300, 'Tracks in-processing refunds (₹300)');
  assert(finSummary.failedRefunds === 400, 'Failed refunds tracked separately (₹400)');
  assert(
    finSummary.outstandingRefundLiability === 800,
    'Outstanding refund liability = pending (500) + processing (300) = ₹800'
  );
  assert(
    finSummary.netRevenue === 9000,
    'Net settled revenue strictly calculated as Gross (10,000) - Completed Refunds (1,000) = ₹9,000'
  );
  assert(
    finSummary.netRevenue !== 8200,
    'Pending and processing refunds are NOT deducted from realized settled revenue'
  );
  assert(
    finSummary.failedPaymentsAmount === 2000,
    'Failed payments (₹2,000) excluded from gross realized revenue'
  );

  // --- STEP 11: Route Protection & Cross-Role Security Audit ---
  console.log('\n--- STEP 11: Route Protection & Cross-Role Security Audit ---');

  const unauthRes = await simulateRequest('GET', '/api/operator/reports/occupancy');
  assert(unauthRes.statusCode === 401, 'Unauthenticated request to operator reports returns 401 Unauthorized');

  const customerReportRes = await simulateRequest('GET', '/api/operator/reports/occupancy', null, {
    authorization: `Bearer ${customerToken}`
  });
  assert(customerReportRes.statusCode === 403, 'Customer request to operator reports returns 403 Forbidden');

  const customerRevenueRes = await simulateRequest('GET', '/api/operator/analytics/revenue', null, {
    authorization: `Bearer ${customerToken}`
  });
  assert(customerRevenueRes.statusCode === 403, 'Customer request to operator revenue returns 403 Forbidden');

  const customerManifestRes = await simulateRequest('GET', `/api/reports/trips/${tripScenarioId}/manifest`, null, {
    authorization: `Bearer ${customerToken}`
  });
  assert(customerManifestRes.statusCode === 403, 'Customer request to passenger manifest returns 403 Forbidden');

  // --- STEP 12: CSV Escaping & Large Limit Integrity ---
  console.log('\n--- STEP 12: CSV Escaping & Large Limit Integrity ---');

  const csvRes = await simulateRequest('GET', '/api/reports/occupancy?format=csv', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(csvRes.statusCode === 200, 'Occupancy CSV export returns 200 OK');
  assert(
    csvRes.body.includes('Total Physical Seats') && csvRes.body.includes('Peak Occupied Seats'),
    'CSV export contains segment-aware header columns'
  );
  assert(
    csvRes.body.includes('Avg Segment Occupancy %'),
    'CSV export contains weighted average segment occupancy column'
  );

  console.log('\n====================================================================');
  console.log(`TOTAL PHASE 8 TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
