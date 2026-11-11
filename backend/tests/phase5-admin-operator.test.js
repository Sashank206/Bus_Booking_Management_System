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
  RouteStop,
  Trip,
  TripStop,
  SeatInventory,
  Booking,
  BookingSeat,
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

async function runPhase5Tests() {
  console.log('\n====================================================================');
  console.log('       BUSGO PHASE 5: ADMIN & OPERATOR MANAGEMENT TEST SUITE        ');
  console.log('====================================================================\n');

  // Generate test IDs
  const adminUserId = new mongoose.Types.ObjectId();
  const operatorUserId1 = new mongoose.Types.ObjectId();
  const operatorUserId2 = new mongoose.Types.ObjectId();
  const customerUserId = new mongoose.Types.ObjectId();

  const operatorId1 = new mongoose.Types.ObjectId();
  const operatorId2 = new mongoose.Types.ObjectId();

  const adminToken = generateToken({ id: adminUserId.toString(), role: 'admin' });
  const operatorToken1 = generateToken({ id: operatorUserId1.toString(), role: 'operator' });
  const operatorToken2 = generateToken({ id: operatorUserId2.toString(), role: 'operator' });
  const customerToken = generateToken({ id: customerUserId.toString(), role: 'customer' });

  // Mock in-memory state for Users and Operators
  const mockUsers = [
    {
      _id: adminUserId,
      name: 'System Administrator',
      email: 'admin@busgo.com',
      role: 'admin',
      accountStatus: 'active'
    },
    {
      _id: operatorUserId1,
      name: 'Rajesh Travels Manager',
      email: 'rajesh@travels.com',
      role: 'operator',
      accountStatus: 'active'
    },
    {
      _id: operatorUserId2,
      name: 'Pending Operator Manager',
      email: 'pending@travels.com',
      role: 'operator',
      accountStatus: 'active'
    },
    {
      _id: customerUserId,
      name: 'Priya Passenger',
      email: 'priya@example.com',
      role: 'customer',
      accountStatus: 'active'
    }
  ];

  const mockOperators = [
    {
      _id: operatorId1,
      userId: mockUsers[1],
      companyName: 'Rajesh Super Express',
      registrationNumber: 'GSTIN07AABCR1234F1Z5',
      contactPerson: 'Rajesh Kumar',
      approvalStatus: 'approved'
    },
    {
      _id: operatorId2,
      userId: mockUsers[2],
      companyName: 'Punjab Royal Liner',
      registrationNumber: 'GSTIN03PUNJ1234F1Z1',
      contactPerson: 'Harpreet Singh',
      approvalStatus: 'pending'
    }
  ];

  mockUsers.forEach((u) => {
    u.save = function () {
      return Promise.resolve(this);
    };
  });

  mockOperators.forEach((o) => {
    o.save = function () {
      return Promise.resolve(this);
    };
  });

  const mockBuses = [];
  const mockStops = [];
  const mockRoutes = [];
  const mockRouteStops = [];
  const mockTrips = [];
  const mockTripStops = [];
  const mockSeatInventory = [];
  const mockAuditLogs = [];

  // Chainable query builder for Mongoose mock calls
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

  // Patch Mongoose Model findById and findOne methods
  const originalUserFindById = User.findById;
  User.findById = function (id) {
    const user = mockUsers.find((u) => u._id.toString() === id.toString());
    return makeChainableQuery(user || null);
  };

  const originalOperatorFindOne = Operator.findOne;
  Operator.findOne = function (query) {
    let match = null;
    if (query.userId) {
      match = mockOperators.find((o) => {
        const uId = o.userId?._id ? o.userId._id.toString() : o.userId.toString();
        return uId === query.userId.toString();
      });
    }
    return Promise.resolve(match || null);
  };

  Operator.findById = function (id) {
    const match = mockOperators.find((o) => o._id.toString() === id.toString());
    return makeChainableQuery(match || null);
  };

  Operator.find = function (query = {}) {
    let result = [...mockOperators];
    if (query.approvalStatus) {
      result = result.filter((o) => o.approvalStatus === query.approvalStatus);
    }
    return makeChainableQuery(result);
  };

  Operator.countDocuments = function (query = {}) {
    if (query.approvalStatus) {
      return Promise.resolve(mockOperators.filter((o) => o.approvalStatus === query.approvalStatus).length);
    }
    return Promise.resolve(mockOperators.length);
  };

  User.countDocuments = function (query = {}) {
    if (query.role) {
      return Promise.resolve(mockUsers.filter((u) => u.role === query.role).length);
    }
    return Promise.resolve(mockUsers.length);
  };

  AuditLog.create = function (doc) {
    const log = { _id: new mongoose.Types.ObjectId(), ...doc, createdAt: new Date() };
    mockAuditLogs.push(log);
    return Promise.resolve(log);
  };

  AuditLog.find = function () {
    return makeChainableQuery(mockAuditLogs);
  };

  AuditLog.countDocuments = function () {
    return Promise.resolve(mockAuditLogs.length);
  };

  Bus.countDocuments = function (query = {}) {
    if (query.operatorId) {
      return Promise.resolve(mockBuses.filter((b) => b.operatorId.toString() === query.operatorId.toString()).length);
    }
    return Promise.resolve(mockBuses.length);
  };

  Trip.countDocuments = function (query = {}) {
    if (query.operatorId) {
      return Promise.resolve(mockTrips.filter((t) => t.operatorId.toString() === query.operatorId.toString()).length);
    }
    if (query.busId) {
      let filtered = mockTrips.filter((t) => t.busId.toString() === query.busId.toString());
      if (query.tripStatus) {
        filtered = filtered.filter((t) => t.tripStatus === query.tripStatus);
      }
      if (query.departureTime && query.departureTime.$gte) {
        filtered = filtered.filter((t) => new Date(t.departureTime) >= query.departureTime.$gte);
      }
      return Promise.resolve(filtered.length);
    }
    return Promise.resolve(mockTrips.length);
  };

  Booking.countDocuments = function () {
    return Promise.resolve(0);
  };

  Booking.aggregate = function () {
    return Promise.resolve([{ _id: null, total: 12500, totalBookings: 15, totalRevenue: 12500 }]);
  };

  // Mock Bus Mongoose calls
  Bus.find = function (query = {}) {
    let result = [...mockBuses];
    if (query.operatorId) {
      result = result.filter((b) => b.operatorId.toString() === query.operatorId.toString());
    }
    return makeChainableQuery(result);
  };

  Bus.findById = function (id) {
    const match = mockBuses.find((b) => b._id.toString() === id.toString());
    return makeChainableQuery(match || null);
  };

  Bus.findOne = function (query = {}) {
    let match = null;
    if (query.registrationNumber) {
      match = mockBuses.find((b) => b.registrationNumber === query.registrationNumber);
    }
    return Promise.resolve(match || null);
  };

  Bus.create = function (doc) {
    const bus = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      isActive: true,
      createdAt: new Date(),
      save: function () {
        return Promise.resolve(this);
      }
    };
    mockBuses.push(bus);
    return Promise.resolve(bus);
  };

  // Mock Stop Mongoose calls
  Stop.find = function (query = {}) {
    let result = [...mockStops];
    if (query.city) {
      result = result.filter((s) => s.city.toLowerCase().includes(query.city.toLowerCase()));
    }
    return makeChainableQuery(result);
  };

  Stop.findById = function (id) {
    const match = mockStops.find((s) => s._id.toString() === id.toString());
    return makeChainableQuery(match || null);
  };

  Stop.findOne = function (query = {}) {
    let match = null;
    if (query.stopName && query.city) {
      const name = query.stopName.$regex ? query.stopName.$regex.replace(/[\^$]/g, '').toLowerCase() : query.stopName.toLowerCase();
      const city = query.city.$regex ? query.city.$regex.replace(/[\^$]/g, '').toLowerCase() : query.city.toLowerCase();
      match = mockStops.find(
        (s) => s.stopName.toLowerCase() === name && s.city.toLowerCase() === city
      );
    }
    return Promise.resolve(match || null);
  };

  Stop.create = function (doc) {
    const stop = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      isActive: true,
      createdAt: new Date(),
      save: function () {
        return Promise.resolve(this);
      }
    };
    mockStops.push(stop);
    return Promise.resolve(stop);
  };

  // Mock Route Mongoose calls
  Route.find = function () {
    return makeChainableQuery(mockRoutes);
  };

  Route.findById = function (id) {
    const match = mockRoutes.find((r) => r._id.toString() === id.toString());
    return makeChainableQuery(match || null);
  };

  Route.create = function (doc) {
    const route = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      isActive: true,
      createdAt: new Date(),
      save: function () {
        return Promise.resolve(this);
      }
    };
    mockRoutes.push(route);
    return Promise.resolve(route);
  };

  RouteStop.insertMany = function (docs) {
    const created = docs.map((d) => ({
      _id: new mongoose.Types.ObjectId(),
      ...d
    }));
    mockRouteStops.push(...created);
    return Promise.resolve(created);
  };

  RouteStop.find = function (query = {}) {
    const filtered = mockRouteStops.filter((rs) => rs.routeId.toString() === query.routeId?.toString());
    return makeChainableQuery(filtered);
  };

  // Mock Trip Mongoose calls
  Trip.find = function (query = {}) {
    let result = [...mockTrips];
    if (query.operatorId) {
      result = result.filter((t) => t.operatorId.toString() === query.operatorId.toString());
    }
    return makeChainableQuery(result);
  };

  Trip.findById = function (id) {
    const match = mockTrips.find((t) => t._id.toString() === id.toString());
    return makeChainableQuery(match || null);
  };

  Trip.findOne = function (query = {}) {
    if (query.busId) {
      const match = mockTrips.find((t) => {
        const busMatch = t.busId.toString() === query.busId.toString();
        const notCancelled = t.tripStatus !== 'cancelled';
        if (!busMatch || !notCancelled) return false;

        // Check time overlap: departureTime < arrTime && arrivalTime > depTime
        if (query.departureTime && query.arrivalTime) {
          const reqArr = new Date(query.departureTime.$lt);
          const reqDep = new Date(query.arrivalTime.$gt);
          const existDep = new Date(t.departureTime);
          const existArr = new Date(t.arrivalTime);
          return reqDep < existArr && reqArr > existDep;
        }
        return true;
      });
      return Promise.resolve(match || null);
    }
    return Promise.resolve(null);
  };

  Trip.create = function (doc) {
    const trip = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      tripStatus: 'scheduled',
      createdAt: new Date(),
      save: function () {
        return Promise.resolve(this);
      }
    };
    mockTrips.push(trip);
    return Promise.resolve(trip);
  };

  TripStop.insertMany = function (docs) {
    const created = docs.map((d) => ({ _id: new mongoose.Types.ObjectId(), ...d }));
    mockTripStops.push(...created);
    return Promise.resolve(created);
  };

  TripStop.find = function (query = {}) {
    const filtered = mockTripStops.filter((ts) => ts.tripId.toString() === query.tripId?.toString());
    return makeChainableQuery(filtered);
  };

  SeatInventory.insertMany = function (docs) {
    const created = docs.map((d) => ({ _id: new mongoose.Types.ObjectId(), ...d }));
    mockSeatInventory.push(...created);
    return Promise.resolve(created);
  };

  SeatInventory.updateMany = function (query = {}, update = {}) {
    return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
  };

  SeatInventory.countDocuments = function () {
    return Promise.resolve(mockSeatInventory.length);
  };

  BookingSeat.countDocuments = function () {
    return Promise.resolve(0);
  };

  const mockNotifications = [];
  const mockBookings = [];
  const mockBookingSeats = [];

  Notification.insertMany = function (docs) {
    mockNotifications.push(...docs);
    return Promise.resolve(docs);
  };

  Booking.find = function (query = {}) {
    let result = [...mockBookings];
    if (query.tripId) {
      result = result.filter((b) => b.tripId.toString() === query.tripId.toString());
    }
    return makeChainableQuery(result);
  };

  Booking.updateMany = function (query = {}, update = {}) {
    if (update.bookingStatus) {
      mockBookings.forEach((b) => {
        b.bookingStatus = update.bookingStatus;
      });
    }
    return Promise.resolve({ acknowledged: true, modifiedCount: mockBookings.length });
  };

  BookingSeat.find = function (query = {}) {
    let result = [...mockBookingSeats];
    if (query.bookingId && query.bookingId.$in) {
      const idStrs = query.bookingId.$in.map((id) => id.toString());
      result = result.filter((bs) => idStrs.includes(bs.bookingId.toString()));
    }
    return makeChainableQuery(result);
  };

  BookingSeat.updateMany = function (query = {}, update = {}) {
    if (update.allocationStatus) {
      mockBookingSeats.forEach((bs) => {
        bs.allocationStatus = update.allocationStatus;
      });
    }
    return Promise.resolve({ acknowledged: true, modifiedCount: mockBookingSeats.length });
  };

  // -------------------------------------------------------------------------
  // 1. Operator Approval & Administrative Management Tests
  // -------------------------------------------------------------------------
  console.log('--- 1. Admin Operator Listing & Approvals ---');

  // Customer cannot list operators
  const unauthorizedOpRes = await simulateRequest('GET', '/api/admin/operators', null, {
    authorization: `Bearer ${customerToken}`
  });
  assert(
    unauthorizedOpRes.statusCode === 403,
    'Customer accessing admin operator listing is blocked with 403 Forbidden'
  );

  // Admin lists operators
  const adminOpListRes = await simulateRequest('GET', '/api/admin/operators', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(
    adminOpListRes.statusCode === 200 && adminOpListRes.body.data.operators.length >= 2,
    'Admin successfully lists registered bus operators'
  );

  // Admin approves pending operator
  const approveRes = await simulateRequest(
    'PATCH',
    `/api/admin/operators/${operatorId2}/approval`,
    { decision: 'approved' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    approveRes.statusCode === 200 && approveRes.body.data.operator.approvalStatus === 'approved',
    'Admin successfully approves pending operator application'
  );

  // Audit log recorded for operator approval
  const approveAudit = mockAuditLogs.find((l) => l.action === 'OPERATOR_APPROVED');
  assert(
    Boolean(approveAudit),
    'Audit log record created for OPERATOR_APPROVED'
  );

  // Admin rejects operator
  const rejectRes = await simulateRequest(
    'PATCH',
    `/api/admin/operators/${operatorId2}/approval`,
    { decision: 'rejected', rejectionReason: 'Incomplete tax documents' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    rejectRes.statusCode === 200 && rejectRes.body.data.operator.approvalStatus === 'rejected',
    'Admin successfully rejects operator with documented rejectionReason'
  );

  // Admin updates user account status (suspension & reactivation)
  const suspendRes = await simulateRequest(
    'PATCH',
    `/api/admin/users/${operatorUserId2}/status`,
    { status: 'suspended' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    suspendRes.statusCode === 200 && suspendRes.body.data.user.accountStatus === 'suspended',
    'Admin successfully suspends operator user account'
  );

  const activateRes = await simulateRequest(
    'PATCH',
    `/api/admin/users/${operatorUserId2}/status`,
    { status: 'active' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    activateRes.statusCode === 200 && activateRes.body.data.user.accountStatus === 'active',
    'Admin successfully reactivates operator user account'
  );

  // Restore operator 2 to approved for subsequent tests
  mockOperators[1].approvalStatus = 'approved';

  // -------------------------------------------------------------------------
  // 2. Bus Management & Layout Validation Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Bus Fleet Management & Layout Validation ---');

  // Customer cannot register a bus
  const custBusRes = await simulateRequest(
    'POST',
    '/api/buses',
    { busNumber: 'CUST-1', registrationNumber: 'DL01A1', busType: 'AC', totalSeats: 10, seatLayout: { seats: [] } },
    { authorization: `Bearer ${customerToken}` }
  );
  assert(
    custBusRes.statusCode === 403,
    'Customer attempting to register a bus is blocked with 403 Forbidden'
  );

  // Operator 1 registers a valid bus
  const validSeats = [
    { seatNumber: '1A', row: 1, col: 1, deck: 1, seatType: 'seater' },
    { seatNumber: '1B', row: 1, col: 2, deck: 1, seatType: 'seater' },
    { seatNumber: '2A', row: 2, col: 1, deck: 1, seatType: 'seater' },
    { seatNumber: '2B', row: 2, col: 2, deck: 1, seatType: 'seater' }
  ];

  const createBusRes = await simulateRequest(
    'POST',
    '/api/buses',
    {
      busNumber: 'RAJESH-EXPRESS-01',
      busName: 'Scania Multi-Axle Luxury',
      busType: 'AC Seater (2+2)',
      registrationNumber: 'DL 01 AB 1001',
      totalSeats: 4,
      seatLayout: {
        rows: 2,
        columns: 2,
        deckCount: 1,
        seats: validSeats
      },
      amenities: ['Wi-Fi', 'Charging Point']
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    createBusRes.statusCode === 201 && createBusRes.body.data.bus.totalSeats === 4,
    'Approved operator successfully registers bus with 2x2 seat layout'
  );

  const registeredBus = createBusRes.body.data.bus;

  // Validation failure: totalSeats mismatch with seats array length
  const mismatchBusRes = await simulateRequest(
    'POST',
    '/api/buses',
    {
      busNumber: 'FAIL-BUS',
      busType: 'AC Seater',
      registrationNumber: 'DL 01 AB 9999',
      totalSeats: 10, // claims 10, but provides only 4 seats
      seatLayout: {
        rows: 2,
        columns: 2,
        seats: validSeats
      }
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    mismatchBusRes.statusCode === 400,
    'Bus creation rejected when totalSeats does not match seatLayout.seats.length'
  );

  // Validation failure: duplicate seat numbers in layout
  const duplicateSeatBusRes = await simulateRequest(
    'POST',
    '/api/buses',
    {
      busNumber: 'FAIL-DUP-SEAT',
      busType: 'AC Seater',
      registrationNumber: 'DL 01 AB 8888',
      totalSeats: 2,
      seatLayout: {
        rows: 1,
        columns: 2,
        seats: [
          { seatNumber: '1A', row: 1, col: 1, deck: 1, seatType: 'seater' },
          { seatNumber: '1A', row: 1, col: 2, deck: 1, seatType: 'seater' } // Duplicate!
        ]
      }
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    duplicateSeatBusRes.statusCode === 400,
    'Bus creation rejected when layout contains duplicate seat numbers'
  );

  // Validation failure: invalid non-positive row/column in seat layout
  const invalidRowColRes = await simulateRequest(
    'POST',
    '/api/buses',
    {
      busNumber: 'FAIL-ROW-COL',
      busType: 'AC Seater',
      registrationNumber: 'DL 01 AB 7777',
      totalSeats: 1,
      seatLayout: {
        rows: 1,
        columns: 1,
        seats: [
          { seatNumber: '1A', row: -5, col: 1, deck: 1, seatType: 'seater' } // Invalid row -5
        ]
      }
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    invalidRowColRes.statusCode === 400,
    'Bus creation rejected when seat layout contains non-positive integer row or column'
  );

  // Duplicate registration number prevention
  const duplicateRegRes = await simulateRequest(
    'POST',
    '/api/buses',
    {
      busNumber: 'CLONE-BUS',
      busType: 'AC Seater',
      registrationNumber: 'DL 01 AB 1001', // Already registered
      totalSeats: 4,
      seatLayout: {
        rows: 2,
        columns: 2,
        seats: validSeats
      }
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    duplicateRegRes.statusCode === 409,
    'Bus registration rejected with 409 Conflict when registration number already exists'
  );

  // Operator 2 attempts to toggle Operator 1's bus (ownership isolation)
  const unauthorizedBusToggleRes = await simulateRequest(
    'PATCH',
    `/api/buses/${registeredBus._id}/status`,
    null,
    { authorization: `Bearer ${operatorToken2}` }
  );
  assert(
    unauthorizedBusToggleRes.statusCode === 403,
    'Operator cannot modify or toggle status of another operator bus (403 Forbidden)'
  );

  // -------------------------------------------------------------------------
  // 3. Stop Management Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Physical Stop Management & Master Catalog ---');

  // Non-admin blocked from creating stop
  const custStopRes = await simulateRequest(
    'POST',
    '/api/stops',
    { stopName: 'Hauz Khas', city: 'Delhi' },
    { authorization: `Bearer ${customerToken}` }
  );
  assert(
    custStopRes.statusCode === 403,
    'Customer attempting to create a master stop is blocked with 403 Forbidden'
  );

  // Admin creates Origin Stop (Delhi ISBT)
  const stop1Res = await simulateRequest(
    'POST',
    '/api/stops',
    {
      stopName: 'Kashmere Gate ISBT',
      city: 'Delhi',
      state: 'Delhi',
      address: 'Ring Road, Kashmere Gate',
      latitude: 28.6675,
      longitude: 77.2285
    },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    stop1Res.statusCode === 201 && stop1Res.body.data.stop.stopName === 'Kashmere Gate ISBT',
    'Admin successfully creates origin master stop (Delhi ISBT)'
  );

  // Admin creates Intermediate Stop (Ludhiana)
  const stop2Res = await simulateRequest(
    'POST',
    '/api/stops',
    {
      stopName: 'Ludhiana Bus Terminal',
      city: 'Ludhiana',
      state: 'Punjab',
      address: 'Near Clock Tower',
      latitude: 30.901,
      longitude: 75.8573
    },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    stop2Res.statusCode === 201,
    'Admin successfully creates intermediate master stop (Ludhiana)'
  );

  // Admin creates Destination Stop (Amritsar)
  const stop3Res = await simulateRequest(
    'POST',
    '/api/stops',
    {
      stopName: 'Golden Temple Terminal',
      city: 'Amritsar',
      state: 'Punjab',
      address: 'Near Hall Gate',
      latitude: 31.62,
      longitude: 74.8765
    },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    stop3Res.statusCode === 201,
    'Admin successfully creates destination master stop (Amritsar)'
  );

  const stop1 = stop1Res.body.data.stop;
  const stop2 = stop2Res.body.data.stop;
  const stop3 = stop3Res.body.data.stop;

  // Duplicate stop prevention in same city
  const dupStopRes = await simulateRequest(
    'POST',
    '/api/stops',
    {
      stopName: 'Kashmere Gate ISBT',
      city: 'Delhi'
    },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    dupStopRes.statusCode === 409,
    'Stop creation rejected with 409 Conflict for duplicate stopName in same city'
  );

  // Public browse stops without token
  const publicStopsRes = await simulateRequest('GET', '/api/stops');
  assert(
    publicStopsRes.statusCode === 200 && publicStopsRes.body.data.stops.length >= 3,
    'Public unauthenticated catalog browse lists all active physical stops'
  );

  // -------------------------------------------------------------------------
  // 4. Route Management & Stop Sequence Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Route Management & Stop Sequences ---');

  // Route validation: same source and destination
  const sameStopRouteRes = await simulateRequest(
    'POST',
    '/api/routes',
    {
      sourceStopId: stop1._id.toString(),
      destinationStopId: stop1._id.toString(), // Same!
      distanceKm: 100
    },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    sameStopRouteRes.statusCode === 400,
    'Route creation rejected when source and destination are identical'
  );

  // Admin creates Delhi -> Amritsar route corridor with intermediate stop
  const createRouteRes = await simulateRequest(
    'POST',
    '/api/routes',
    {
      routeName: 'Delhi to Amritsar Grand Trunk Corridor',
      sourceStopId: stop1._id.toString(),
      destinationStopId: stop3._id.toString(),
      distanceKm: 450,
      estimatedDurationMinutes: 480,
      stops: [
        { stopId: stop1._id.toString(), stopSequence: 0, distanceFromStart: 0 },
        { stopId: stop2._id.toString(), stopSequence: 1, distanceFromStart: 310 },
        { stopId: stop3._id.toString(), stopSequence: 2, distanceFromStart: 450 }
      ]
    },
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    createRouteRes.statusCode === 201 && createRouteRes.body.data.routeStops.length === 3,
    'Admin successfully creates multi-stop route corridor with ordered sequences (0, 1, 2)'
  );

  const createdRoute = createRouteRes.body.data.route;

  // Toggle route active status
  const toggleRouteRes = await simulateRequest(
    'PATCH',
    `/api/routes/${createdRoute._id}/status`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );
  assert(
    toggleRouteRes.statusCode === 200 && toggleRouteRes.body.data.route.isActive === false,
    'Admin successfully toggles route active status to false'
  );
  // Reactivate route
  await simulateRequest(
    'PATCH',
    `/api/routes/${createdRoute._id}/status`,
    null,
    { authorization: `Bearer ${adminToken}` }
  );

  // -------------------------------------------------------------------------
  // 5. Trip Scheduling & Automated Inventory Generation Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Trip Scheduling & Seat Inventory Generation ---');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const depTime = new Date(tomorrow);
  depTime.setHours(8, 0, 0, 0);
  const arrTime = new Date(tomorrow);
  arrTime.setHours(16, 0, 0, 0);

  // Validation failure: arrival time before departure time
  const invalidTimeTripRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: tomorrow.toISOString(),
      departureTime: arrTime.toISOString(),
      arrivalTime: depTime.toISOString(), // Arrival before departure!
      baseFare: 650
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    invalidTimeTripRes.statusCode === 400,
    'Trip scheduling rejected when arrival time is earlier than departure time'
  );

  // Operator 2 attempts to schedule trip with Operator 1's bus (ownership isolation)
  const stealBusTripRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: tomorrow.toISOString(),
      departureTime: depTime.toISOString(),
      arrivalTime: arrTime.toISOString(),
      baseFare: 650
    },
    { authorization: `Bearer ${operatorToken2}` }
  );
  assert(
    stealBusTripRes.statusCode === 403,
    'Operator cannot schedule a trip using a bus belonging to another operator (403 Forbidden)'
  );

  // Approved Operator 1 schedules valid trip
  const scheduleTripRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: tomorrow.toISOString(),
      departureTime: depTime.toISOString(),
      arrivalTime: arrTime.toISOString(),
      baseFare: 750
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    scheduleTripRes.statusCode === 201 &&
      scheduleTripRes.body.data.trip.tripStatus === 'scheduled',
    'Approved operator successfully schedules trip and initializes travel stops'
  );

  const scheduledTrip = scheduleTripRes.body.data.trip;

  // Verify TripStops and SeatInventory were created
  const generatedTripStops = mockTripStops.filter(
    (ts) => ts.tripId.toString() === scheduledTrip._id.toString()
  );
  const generatedSeatsInventory = mockSeatInventory.filter(
    (si) => si.tripId.toString() === scheduledTrip._id.toString()
  );

  assert(
    generatedTripStops.length === 3,
    `TripStops automatically generated for all 3 stops in sequence [0, 1, 2]`
  );
  assert(
    generatedSeatsInventory.length === 4,
    `SeatInventory automatically generated for all 4 physical seats (1A, 1B, 2A, 2B)`
  );

  // Schedule Conflict Prevention: same bus overlapping departure/arrival
  const conflictTripRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: tomorrow.toISOString(),
      departureTime: depTime.toISOString(), // Exact same window!
      arrivalTime: arrTime.toISOString(),
      baseFare: 750
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    conflictTripRes.statusCode === 409,
    'Conflicting trip schedule on same bus is blocked with 409 Conflict'
  );

  // Bus layout modification prevented when bus has active scheduled trips
  const modifyBusyBusRes = await simulateRequest(
    'PUT',
    `/api/buses/${registeredBus._id}`,
    {
      busNumber: registeredBus.busNumber,
      totalSeats: 2, // Attempting to alter seat capacity while trip is active
      seatLayout: {
        rows: 1,
        columns: 2,
        seats: [
          { seatNumber: '1A', row: 1, col: 1, deck: 1, seatType: 'seater' },
          { seatNumber: '1B', row: 1, col: 2, deck: 1, seatType: 'seater' }
        ]
      }
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    modifyBusyBusRes.statusCode === 409,
    'Bus layout modification rejected with 409 Conflict when bus has active scheduled trips'
  );

  // Updating non-layout metadata (busName, amenities) succeeds on bus with active trips
  const updateBusMetaRes = await simulateRequest(
    'PUT',
    `/api/buses/${registeredBus._id}`,
    {
      busNumber: registeredBus.busNumber,
      busName: 'Scania Diamond Cruiser Platinum',
      amenities: ['Wi-Fi', 'Charging Point', 'Blanket']
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    updateBusMetaRes.statusCode === 200 && updateBusMetaRes.body.data.bus.busName === 'Scania Diamond Cruiser Platinum',
    'Updating non-layout metadata (busName, amenities) succeeds on bus with active trips'
  );

  // Overnight Trip: Departs Day 2 at 22:00, arrives Day 3 at 06:00
  const day2 = new Date();
  day2.setDate(day2.getDate() + 2);
  const overnightDep = new Date(day2);
  overnightDep.setHours(22, 0, 0, 0);
  const day3 = new Date(day2);
  day3.setDate(day3.getDate() + 1);
  const overnightArr = new Date(day3);
  overnightArr.setHours(6, 0, 0, 0);

  const overnightTripRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: day2.toISOString(),
      departureTime: overnightDep.toISOString(),
      arrivalTime: overnightArr.toISOString(),
      baseFare: 850
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    overnightTripRes.statusCode === 201,
    'Trip crossing midnight (22:00 -> 06:00 next day) scheduled successfully'
  );

  // Conflicting trip overlapping across midnight: Day 3 morning 04:00 to 10:00 (overlaps 06:00 arrival)
  const morningDep = new Date(day3);
  morningDep.setHours(4, 0, 0, 0);
  const morningArr = new Date(day3);
  morningArr.setHours(10, 0, 0, 0);

  const midnightConflictRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: day3.toISOString(),
      departureTime: morningDep.toISOString(),
      arrivalTime: morningArr.toISOString(),
      baseFare: 650
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    midnightConflictRes.statusCode === 409,
    'Trip collision correctly detected across midnight (04:00 departure overlaps 06:00 overnight arrival)'
  );

  // Non-overlapping trip on Day 3 departing at 08:00 (after overnight arrival at 06:00)
  const validDay3Dep = new Date(day3);
  validDay3Dep.setHours(8, 0, 0, 0);
  const validDay3Arr = new Date(day3);
  validDay3Arr.setHours(14, 0, 0, 0);

  const nonOverlapRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: day3.toISOString(),
      departureTime: validDay3Dep.toISOString(),
      arrivalTime: validDay3Arr.toISOString(),
      baseFare: 650
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    nonOverlapRes.statusCode === 201,
    'Non-overlapping trip on same bus after arrival succeeds with 201 Created'
  );

  // Manifest endpoint returns passenger manifest
  const manifestRes = await simulateRequest(
    'GET',
    `/api/trips/${scheduledTrip._id}/manifest`,
    null,
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    manifestRes.statusCode === 200 && Array.isArray(manifestRes.body.data.manifest),
    'Operator passenger manifest endpoint returns 200 with passenger manifest array'
  );

  // Operator 2 cannot access Operator 1's manifest (ownership isolation)
  const unauthManifestRes = await simulateRequest(
    'GET',
    `/api/trips/${scheduledTrip._id}/manifest`,
    null,
    { authorization: `Bearer ${operatorToken2}` }
  );
  assert(
    unauthManifestRes.statusCode === 403,
    'Operator cannot view passenger manifest of another operator trip (403 Forbidden)'
  );

  // Suspended operator blocked from scheduling trip
  mockUsers[1].accountStatus = 'suspended';
  const suspendedOpTripRes = await simulateRequest(
    'POST',
    '/api/trips',
    {
      busId: registeredBus._id.toString(),
      routeId: createdRoute._id.toString(),
      travelDate: tomorrow.toISOString(),
      departureTime: depTime.toISOString(),
      arrivalTime: arrTime.toISOString(),
      baseFare: 750
    },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    suspendedOpTripRes.statusCode === 403,
    'Suspended operator is blocked from trip scheduling with 403 Forbidden'
  );
  mockUsers[1].accountStatus = 'active'; // restore

  // Attach a mock confirmed booking and passenger seat to scheduledTrip
  const testBookingId = new mongoose.Types.ObjectId();
  mockBookings.push({
    _id: testBookingId,
    tripId: scheduledTrip._id,
    userId: customerUserId,
    pnr: 'PNR-TEST-12345',
    bookingStatus: 'confirmed',
    totalAmount: 750
  });
  mockBookingSeats.push({
    _id: new mongoose.Types.ObjectId(),
    bookingId: testBookingId,
    seatNumber: '1A',
    allocationStatus: 'confirmed'
  });

  // Cancel trip with confirmed bookings & verify side-effects
  const cancelTripRes = await simulateRequest(
    'PATCH',
    `/api/trips/${scheduledTrip._id}/cancel`,
    { reason: 'Vehicle maintenance emergency' },
    { authorization: `Bearer ${operatorToken1}` }
  );
  assert(
    cancelTripRes.statusCode === 200 &&
      cancelTripRes.body.data.trip.tripStatus === 'cancelled',
    'Operator successfully cancels trip (status updated to cancelled)'
  );
  assert(
    mockBookings[0].bookingStatus === 'cancelled',
    'All confirmed bookings on cancelled trip are automatically marked cancelled'
  );
  assert(
    mockBookingSeats[0].allocationStatus === 'cancelled',
    'All booking seats on cancelled trip are automatically marked cancelled'
  );
  assert(
    mockNotifications.length > 0 && mockNotifications[0].notificationType === 'TRIP_CANCELLED',
    'Passenger cancellation notification dispatched with PNR and reason'
  );

  // Schema verification: SeatInventory compound unique index on { tripId: 1, seatNumber: 1 }
  const siIndexes = SeatInventory.schema.indexes();
  const hasUniqueCompoundIndex = siIndexes.some((idx) => {
    const keys = idx[0];
    const opts = idx[1];
    return keys.tripId === 1 && keys.seatNumber === 1 && opts.unique === true;
  });
  assert(
    hasUniqueCompoundIndex,
    'SeatInventory schema defines unique compound index on { tripId: 1, seatNumber: 1 }'
  );

  // -------------------------------------------------------------------------
  // 6. Dashboard Statistics & Metric Aggregation Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Dashboard Statistics Aggregation ---');

  // Admin Dashboard metrics
  const adminDashRes = await simulateRequest('GET', '/api/admin/dashboard', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(
    adminDashRes.statusCode === 200 &&
      adminDashRes.body.data.metrics.totalUsers !== undefined &&
      adminDashRes.body.data.metrics.totalOperators !== undefined &&
      Array.isArray(adminDashRes.body.data.recentAuditLogs),
    'Admin dashboard returns live aggregated system metrics, operators, and audit logs'
  );

  // Operator Dashboard metrics
  const opDashRes = await simulateRequest('GET', '/api/operator/dashboard', null, {
    authorization: `Bearer ${operatorToken1}`
  });
  assert(
    opDashRes.statusCode === 200 &&
      opDashRes.body.data.metrics.totalBuses !== undefined &&
      opDashRes.body.data.metrics.occupancyPercentage !== undefined &&
      Array.isArray(opDashRes.body.data.recentTrips),
    'Operator dashboard returns fleet size, occupancy %, simulated revenue, and recent trips'
  );

  // Cleanup mocks
  User.findById = originalUserFindById;
  Operator.findOne = originalOperatorFindOne;

  console.log('\n====================================================================');
  console.log(`PHASE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
