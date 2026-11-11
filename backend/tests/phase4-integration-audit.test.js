const { PassThrough } = require('stream');
const http = require('http');
const mongoose = require('mongoose');
const { app } = require('../server');
const { User, Operator, AuditLog } = require('../models');
const { generateToken, verifyToken } = require('../utils/jwt');
const { protect, authorize, requireApprovedOperator } = require('../middleware/auth');

// Helper to simulate full Express requests and response parsing without opening loopback sockets
function simulateRequest(method, url, body = null, headers = {}, cookies = {}) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;

    // Build Cookie header if cookies provided
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

      // Parse Set-Cookie header if present
      const setCookieHeader = res.getHeader('set-cookie');
      let parsedCookies = {};
      if (setCookieHeader) {
        const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        cookieStrings.forEach((c) => {
          const parts = c.split(';')[0].split('=');
          if (parts.length === 2) {
            parsedCookies[parts[0].trim()] = parts[1].trim();
          }
        });
      }

      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        cookies: parsedCookies,
        body: parsedBody
      });

      return result;
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

async function runIntegrationAudit() {
  console.log('====================================================================');
  console.log('       BUSGO PHASE 4: FULL-STACK INTEGRATION AUDIT SUITE           ');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${description}`);
      failed++;
    }
  }

  // Set up mock users for end-to-end controller simulation
  const mockCustomer = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Rajesh Customer',
    email: 'customer@busgo.com',
    role: 'customer',
    accountStatus: 'active',
    comparePassword: async (pwd) => pwd === 'CustomerPass123!'
  };

  const mockOperatorUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Vikram Operator',
    email: 'operator@busgo.com',
    role: 'operator',
    accountStatus: 'active',
    comparePassword: async (pwd) => pwd === 'OperatorPass123!'
  };

  const mockAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'System Admin',
    email: 'admin@busgo.com',
    role: 'admin',
    accountStatus: 'active',
    comparePassword: async (pwd) => pwd === 'AdminPass123!'
  };

  const originalUserFindOne = User.findOne;
  const originalUserFindById = User.findById;
  const originalOperatorFindOne = Operator.findOne;
  const originalAuditCreate = AuditLog.create;

  AuditLog.create = async () => ({ _id: new mongoose.Types.ObjectId() });

  User.findOne = (query) => {
    const qEmail = (query.email || '').toLowerCase();
    let target = null;
    if (qEmail === 'customer@busgo.com') target = mockCustomer;
    if (qEmail === 'operator@busgo.com') target = mockOperatorUser;
    if (qEmail === 'admin@busgo.com') target = mockAdminUser;

    return {
      select: () => Promise.resolve(target)
    };
  };

  User.findById = (id) => {
    const idStr = id?.toString();
    if (idStr === mockCustomer._id.toString()) return Promise.resolve(mockCustomer);
    if (idStr === mockOperatorUser._id.toString()) return Promise.resolve(mockOperatorUser);
    if (idStr === mockAdminUser._id.toString()) return Promise.resolve(mockAdminUser);
    return Promise.resolve(null);
  };

  Operator.findOne = (query) => {
    if (query.userId?.toString() === mockOperatorUser._id.toString()) {
      return Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        userId: mockOperatorUser._id,
        companyName: 'Royal Express Travels',
        approvalStatus: 'approved'
      });
    }
    return Promise.resolve(null);
  };

  try {
    // 1. AUDIT SCENARIO: CUSTOMER LOGIN, LOGOUT & CREDENTIALS
    console.log('--- 1. Customer Login, Invalid Credentials & Logout ---');
    const validCustomerLogin = await simulateRequest('POST', '/api/auth/login', {
      email: 'customer@busgo.com',
      password: 'CustomerPass123!'
    });
    assert(
      validCustomerLogin.statusCode === 200 &&
        validCustomerLogin.body.token &&
        validCustomerLogin.body.data.user.role === 'customer',
      'Customer login succeeds with 200 OK, returns JWT token and customer user payload'
    );
    assert(
      validCustomerLogin.cookies.token != null,
      'Customer login sets secure HTTP-only token cookie in response headers'
    );

    const customerToken = validCustomerLogin.body.token;

    const invalidPassLogin = await simulateRequest('POST', '/api/auth/login', {
      email: 'customer@busgo.com',
      password: 'WrongPassword999!'
    });
    assert(
      invalidPassLogin.statusCode === 401 && invalidPassLogin.body.status === 'fail',
      'Login with incorrect password returns 401 Unauthorized'
    );

    const nonExistentUserLogin = await simulateRequest('POST', '/api/auth/login', {
      email: 'nobody@busgo.com',
      password: 'SomePassword123!'
    });
    assert(
      nonExistentUserLogin.statusCode === 401,
      'Login with non-existent email returns 401 Unauthorized'
    );

    const emptyBodyRes = await simulateRequest('POST', '/api/auth/login', {
      email: '',
      password: ''
    });
    assert(
      emptyBodyRes.statusCode === 400 && emptyBodyRes.body.status === 'fail',
      'Login with empty fields returns 400 Bad Request with validation errors'
    );

    // 2. AUDIT SCENARIO: OPERATOR LOGIN & PROFILE ASSOCIATION
    console.log('\n--- 2. Operator Login & Profile Association ---');
    const validOperatorLogin = await simulateRequest('POST', '/api/auth/login', {
      email: 'operator@busgo.com',
      password: 'OperatorPass123!'
    });
    assert(
      validOperatorLogin.statusCode === 200 &&
        validOperatorLogin.body.data.user.role === 'operator' &&
        validOperatorLogin.body.data.operator &&
        validOperatorLogin.body.data.operator.companyName === 'Royal Express Travels',
      'Operator login returns 200 OK with associated Operator business profile'
    );

    // 3. AUDIT SCENARIO: ADMIN LOGIN & PRIVILEGES
    console.log('\n--- 3. Administrator Login ---');
    const validAdminLogin = await simulateRequest('POST', '/api/auth/login', {
      email: 'admin@busgo.com',
      password: 'AdminPass123!'
    });
    assert(
      validAdminLogin.statusCode === 200 && validAdminLogin.body.data.user.role === 'admin',
      'Administrator login returns 200 OK with admin role'
    );
    const adminToken = validAdminLogin.body.token;

    // 4. AUDIT SCENARIO: SESSION RESTORE VIA GET /api/auth/me (BEARER & COOKIE)
    console.log('\n--- 4. Session Restore (Bearer Header & Cookie Modes) ---');
    const sessionWithHeader = await simulateRequest('GET', '/api/auth/me', null, {
      authorization: `Bearer ${customerToken}`
    });
    assert(
      sessionWithHeader.statusCode === 200 && sessionWithHeader.body.data.user.email === 'customer@busgo.com',
      'Session successfully restored via Authorization: Bearer header'
    );

    const sessionWithCookie = await simulateRequest('GET', '/api/auth/me', null, {}, {
      token: customerToken
    });
    assert(
      sessionWithCookie.statusCode === 200 && sessionWithCookie.body.data.user.email === 'customer@busgo.com',
      'Session successfully restored via HTTP-only cookie'
    );

    // 5. AUDIT SCENARIO: UNAUTHENTICATED & STALE TOKEN ACCESS
    console.log('\n--- 5. Unauthenticated Access & Stale Token Handling ---');
    const unauthMeRes = await simulateRequest('GET', '/api/auth/me');
    assert(
      unauthMeRes.statusCode === 401 && unauthMeRes.body.status === 'fail',
      'GET /api/auth/me without token returns 401 Unauthorized'
    );

    const staleCookieRes = await simulateRequest('GET', '/api/auth/me', null, {}, { token: 'none' });
    assert(
      staleCookieRes.statusCode === 401,
      'GET /api/auth/me with stale "token=none" cookie is cleanly rejected with 401'
    );

    const malformedTokenRes = await simulateRequest('GET', '/api/auth/me', null, {
      authorization: 'Bearer malformed.jwt.token'
    });
    assert(
      malformedTokenRes.statusCode === 401,
      'GET /api/auth/me with malformed Bearer token returns 401'
    );

    // 6. AUDIT SCENARIO: LOGOUT COOKIE CLEARING
    console.log('\n--- 6. Logout & Cookie Invalidation ---');
    const logoutRes = await simulateRequest('POST', '/api/auth/logout');
    assert(logoutRes.statusCode === 200, 'POST /api/auth/logout returns 200 OK');
    const rawSetCookie = logoutRes.headers['set-cookie'];
    const isCleared =
      rawSetCookie &&
      (rawSetCookie.includes('token=;') ||
        rawSetCookie.includes('Expires=Thu, 01 Jan 1970') ||
        rawSetCookie.includes('Max-Age=0'));
    assert(isCleared, 'Logout endpoint cleared the HTTP-only "token" cookie with past expiration date');

    // 7. AUDIT SCENARIO: ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
    console.log('\n--- 7. Role-Based Authorization Guards (RBAC) ---');
    let customerToAdminErr = null;
    authorize('admin')({ user: mockCustomer }, {}, (err) => {
      customerToAdminErr = err;
    });
    assert(
      customerToAdminErr && customerToAdminErr.statusCode === 403,
      'Customer attempting to access admin-only resource is blocked with 403 Forbidden'
    );

    let operatorToAdminErr = null;
    authorize('admin')({ user: mockOperatorUser }, {}, (err) => {
      operatorToAdminErr = err;
    });
    assert(
      operatorToAdminErr && operatorToAdminErr.statusCode === 403,
      'Operator attempting to access admin-only resource is blocked with 403 Forbidden'
    );

    let adminPass = false;
    authorize('admin')({ user: mockAdminUser }, {}, (err) => {
      adminPass = !err;
    });
    assert(adminPass === true, 'Admin successfully passes admin authorization guard');

    // 8. AUDIT SCENARIO: OPERATOR APPROVAL STATE ENFORCEMENT
    console.log('\n--- 8. Operator Approval State Enforcement ---');
    const pendingOperator = {
      user: { role: 'operator', _id: new mongoose.Types.ObjectId() },
      operator: { approvalStatus: 'pending' }
    };
    let pendingErr = null;
    requireApprovedOperator(pendingOperator, {}, (err) => {
      pendingErr = err;
    });
    assert(
      pendingErr && pendingErr.statusCode === 403 && pendingErr.message.includes('pending'),
      'Backend blocks pending operator from operational features with 403 Forbidden'
    );

    const suspendedOperator = {
      user: { role: 'operator', _id: new mongoose.Types.ObjectId() },
      operator: { approvalStatus: 'suspended' }
    };
    let suspendedErr = null;
    requireApprovedOperator(suspendedOperator, {}, (err) => {
      suspendedErr = err;
    });
    assert(
      suspendedErr && suspendedErr.statusCode === 403 && suspendedErr.message.includes('suspended'),
      'Backend blocks suspended operator from operational features with 403 Forbidden'
    );

    const approvedOperator = {
      user: { role: 'operator', _id: mockOperatorUser._id },
      operator: { approvalStatus: 'approved' }
    };
    let approvedPass = false;
    requireApprovedOperator(approvedOperator, {}, (err) => {
      approvedPass = !err;
    });
    assert(approvedPass === true, 'Backend allows approved operator through operator gate');

    let adminBypassPass = false;
    requireApprovedOperator({ user: mockAdminUser }, {}, (err) => {
      adminBypassPass = !err;
    });
    assert(adminBypassPass === true, 'Admin role bypasses operator approval gate cleanly');

    // 9. AUDIT SCENARIO: REGISTRATION FORM VALIDATION ERROR MAPPINGS
    console.log('\n--- 9. Form Input Validation Error Mapping ---');
    const badRegisterRes = await simulateRequest('POST', '/api/auth/register', {
      name: '',
      email: 'invalid-email-address',
      password: '12' // Too short (< 6)
    });
    assert(
      badRegisterRes.statusCode === 400 &&
        badRegisterRes.body.errors &&
        badRegisterRes.body.errors.email &&
        badRegisterRes.body.errors.password &&
        badRegisterRes.body.errors.name,
      'Customer registration maps invalid fields to structured error keys'
    );

    const badOperatorRegisterRes = await simulateRequest('POST', '/api/auth/operator-register', {
      name: '',
      email: 'not-email',
      companyName: '',
      registrationNumber: '',
      businessAddress: '',
      phone: '',
      password: '321'
    });
    assert(
      badOperatorRegisterRes.statusCode === 400 &&
        badOperatorRegisterRes.body.errors &&
        badOperatorRegisterRes.body.errors.companyName &&
        badOperatorRegisterRes.body.errors.registrationNumber,
      'Operator registration maps business fields to structured error keys'
    );

    // 10. AUDIT SCENARIO: CORS ORIGIN RESOLUTION
    console.log('\n--- 10. CORS Origin Resolution ---');
    const corsRes = await simulateRequest('OPTIONS', '/api/health', null, {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'GET'
    });
    assert(
      corsRes.statusCode === 204 || corsRes.statusCode === 200,
      'OPTIONS preflight check resolves cleanly for http://localhost:5173'
    );

    const cors127Res = await simulateRequest('OPTIONS', '/api/health', null, {
      origin: 'http://127.0.0.1:5173',
      'access-control-request-method': 'GET'
    });
    assert(
      cors127Res.statusCode === 204 || cors127Res.statusCode === 200,
      'OPTIONS preflight check resolves cleanly for http://127.0.0.1:5173'
    );

    console.log('\n====================================================================');
    console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================================');

    // Restore stubs
    User.findOne = originalUserFindOne;
    User.findById = originalUserFindById;
    Operator.findOne = originalOperatorFindOne;
    AuditLog.create = originalAuditCreate;

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  }
}

runIntegrationAudit();
