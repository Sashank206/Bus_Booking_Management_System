const { PassThrough } = require('stream');
const http = require('http');
const mongoose = require('mongoose');
const { app } = require('../server');
const models = require('../models');
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
  Passenger,
  BookingSeat,
  Payment,
  Cancellation,
  CancellationItem,
  Refund,
  Notification,
  AuditLog
} = models;
const { generateToken, verifyToken } = require('../utils/jwt');
const { authorize, requireApprovedOperator } = require('../middleware/auth');
const AppError = require('../utils/appError');

// Helper to simulate HTTP requests without opening external network sockets
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

      return result;
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

async function runPhase3Tests() {
  console.log('=====================================================');
  console.log('       BUSGO PHASE 3: BACKEND FOUNDATION TESTS       ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. MODEL CATALOG VERIFICATION
    console.log('--- 1. Verification of All 18 Mongoose Models ---');
    const modelKeys = Object.keys(models);
    assert(modelKeys.length === 18, 'Exactly 18 Mongoose models registered in registry');

    const expectedModels = [
      'User',
      'Operator',
      'Bus',
      'Stop',
      'Route',
      'RouteStop',
      'Trip',
      'TripStop',
      'SeatInventory',
      'Booking',
      'Passenger',
      'BookingSeat',
      'Payment',
      'Cancellation',
      'CancellationItem',
      'Refund',
      'Notification',
      'AuditLog'
    ];

    expectedModels.forEach((name) => {
      assert(models[name] && typeof models[name] === 'function', `Model '${name}' exists and is a valid Mongoose model`);
    });

    // 2. CRITICAL DATABASE INDEXES AND CONSTRAINTS
    console.log('\n--- 2. Database Indexes & Structural Constraints ---');
    const seatInvIndexes = SeatInventory.schema.indexes();
    const hasSeatInvTripSeatUnique = seatInvIndexes.some(
      ([idx, opt]) => idx.tripId === 1 && idx.seatNumber === 1 && opt && opt.unique === true
    );
    assert(hasSeatInvTripSeatUnique, 'SeatInventory has unique compound index on { tripId: 1, seatNumber: 1 }');

    const bookingSeatIndexes = BookingSeat.schema.indexes();
    const hasBookingSeatInvUnique = bookingSeatIndexes.some(
      ([idx, opt]) => idx.seatInventoryId === 1 && opt && opt.unique === true
    );
    assert(
      !hasBookingSeatInvUnique,
      'BookingSeats intentionally does NOT have unique index on seatInventoryId (segment reuse permitted)'
    );

    const routeStopIndexes = RouteStop.schema.indexes();
    const hasRouteStopUnique = routeStopIndexes.some(
      ([idx, opt]) => idx.routeId === 1 && idx.stopSequence === 1 && opt && opt.unique === true
    );
    assert(hasRouteStopUnique, 'RouteStop has unique compound index on { routeId: 1, stopSequence: 1 }');

    const tripStopIndexes = TripStop.schema.indexes();
    const hasTripStopUnique = tripStopIndexes.some(
      ([idx, opt]) => idx.tripId === 1 && idx.stopSequence === 1 && opt && opt.unique === true
    );
    assert(hasTripStopUnique, 'TripStop has unique compound index on { tripId: 1, stopSequence: 1 }');

    const bookingIndexes = Booking.schema.indexes();
    const hasPnrUnique = bookingIndexes.some(([idx, opt]) => idx.pnr === 1 && opt && opt.unique === true);
    assert(hasPnrUnique, 'Booking has unique index on { pnr: 1 }');

    // 3. SEGMENT OVERLAP LOGIC (HALF-OPEN INTERVALS [from, to))
    console.log('\n--- 3. Segment Overlap Mathematical Rule Tests ---');
    // Rule: existingFrom < requestedTo AND existingTo > requestedFrom
    const isOverlap = SeatInventory.isOverlap;

    // Delhi [0] -> Ambala [1] -> Ludhiana [2] -> Jalandhar [3] -> Amritsar [4]
    assert(
      isOverlap(0, 2, 2, 4) === false,
      'Delhi->Ludhiana [0,2) and Ludhiana->Amritsar [2,4) DO NOT overlap (seat reuse allowed)'
    );

    assert(
      isOverlap(0, 2, 1, 3) === true,
      'Delhi->Ludhiana [0,2) and Ambala->Jalandhar [1,3) OVERLAP (conflict blocked)'
    );

    assert(
      isOverlap(1, 3, 3, 4) === false,
      'Ambala->Jalandhar [1,3) and Jalandhar->Amritsar [3,4) DO NOT overlap (seat reuse allowed)'
    );

    assert(
      isOverlap(0, 4, 1, 2) === true,
      'Full trip Delhi->Amritsar [0,4) and intermediate Ambala->Ludhiana [1,2) OVERLAP (conflict blocked)'
    );

    // 4. SEAT INVENTORY SEGMENT AVAILABILITY & HOLD EXPIRY
    console.log('\n--- 4. Temporary Hold Expiration Logic ---');
    const mockInventory = new SeatInventory({
      tripId: new mongoose.Types.ObjectId(),
      seatNumber: 'A1',
      seatType: 'seater',
      isActive: true,
      activeSegments: [
        {
          fromSequence: 0,
          toSequence: 2,
          status: 'held',
          holdExpiresAt: new Date(Date.now() - 60000) // Expired 1 min ago
        }
      ]
    });

    assert(
      mockInventory.isAvailableForSegment(0, 2, new Date()) === true,
      'Expired hold segment does not block new reservation request'
    );

    mockInventory.activeSegments[0].holdExpiresAt = new Date(Date.now() + 600000); // Active for 10 min
    assert(
      mockInventory.isAvailableForSegment(0, 2, new Date()) === false,
      'Unexpired active hold segment correctly blocks overlapping reservation'
    );

    assert(
      mockInventory.isAvailableForSegment(2, 4, new Date()) === true,
      'Unexpired active hold on [0,2) allows booking on [2,4)'
    );

    // 5. PASSWORD HASHING AND JWT SECURITY
    console.log('\n--- 5. Authentication, Hashing & JWT Verification ---');
    const plainPass = 'SecurePass123!';
    const hashed = await User.hashPassword(plainPass);
    assert(hashed && hashed.startsWith('$2'), 'User.hashPassword generated valid bcrypt hash');

    const tempUser = new User({
      name: 'Test Customer',
      email: 'test@example.com',
      passwordHash: hashed
    });
    const matchSuccess = await tempUser.comparePassword(plainPass);
    const matchFail = await tempUser.comparePassword('WrongPassword');
    assert(matchSuccess === true, 'comparePassword correctly validates authentic password');
    assert(matchFail === false, 'comparePassword rejects incorrect password');

    const token = generateToken({ id: tempUser._id, role: 'customer' });
    assert(typeof token === 'string' && token.split('.').length === 3, 'generateToken issued valid 3-part JWT');

    const decoded = verifyToken(token);
    assert(decoded.id === tempUser._id.toString() && decoded.role === 'customer', 'verifyToken decoded payload correctly');

    // 6. RBAC AND OPERATOR APPROVAL MIDDLEWARE
    console.log('\n--- 6. Role-Based Authorization & Approval Gate Middleware ---');
    let rbacError = null;
    const authorizeAdmin = authorize('admin');
    authorizeAdmin({ user: { role: 'customer' } }, {}, (err) => {
      rbacError = err;
    });
    assert(rbacError && rbacError.statusCode === 403, 'authorize middleware blocks unauthorized role with 403 Forbidden');

    let rbacSuccess = false;
    authorizeAdmin({ user: { role: 'admin' } }, {}, (err) => {
      rbacSuccess = !err;
    });
    assert(rbacSuccess === true, 'authorize middleware allows authorized role');

    let operatorGateError = null;
    const mockPendingReq = {
      user: { role: 'operator' },
      operator: { approvalStatus: 'pending' }
    };
    requireApprovedOperator(mockPendingReq, {}, (err) => {
      operatorGateError = err;
    });
    assert(
      operatorGateError && operatorGateError.statusCode === 403,
      'requireApprovedOperator blocks pending operator profile with 403 Forbidden'
    );

    // 7. ROUTE-LEVEL ENDPOINTS & VALIDATORS
    console.log('\n--- 7. Route Handlers & Input Validators Execution ---');
    const healthRes = await simulateRequest('GET', '/api/health');
    assert(healthRes.statusCode === 200 && healthRes.body.status === 'healthy', 'GET /api/health returned 200 healthy');

    const baseRes = await simulateRequest('GET', '/');
    assert(baseRes.statusCode === 200 && baseRes.body.service === 'BusGo Backend API', 'GET / returned 200 with service info');

    const notFoundRes = await simulateRequest('GET', '/api/unknown');
    assert(notFoundRes.statusCode === 404 && notFoundRes.body.status === 'fail', '404 handler returns structured fail error');

    const meUnauthorizedRes = await simulateRequest('GET', '/api/auth/me');
    assert(meUnauthorizedRes.statusCode === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

    const invalidRegisterRes = await simulateRequest('POST', '/api/auth/register', {
      name: '',
      email: 'not-an-email',
      password: '123'
    });
    assert(
      invalidRegisterRes.statusCode === 400 && invalidRegisterRes.body.errors,
      'POST /api/auth/register with invalid data returns 400 with validation error map'
    );

    const invalidLoginRes = await simulateRequest('POST', '/api/auth/login', {
      email: 'bad-email',
      password: ''
    });
    assert(
      invalidLoginRes.statusCode === 400,
      'POST /api/auth/login with missing password returns 400 validation error'
    );

    console.log('\n=====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test execution encountered unexpected error:', error);
    process.exit(1);
  }
}

runPhase3Tests();

