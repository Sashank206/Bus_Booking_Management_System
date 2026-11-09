const http = require('http');
const { PassThrough } = require('stream');
const { app } = require('../server');

function testEndpoint(method, url) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = { host: 'localhost:5000' };

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
      if (err) {
        reject(err);
      }
    });
  });
}

async function runTests() {
  try {
    console.log('Testing GET /api/health ...');
    const healthRes = await testEndpoint('GET', '/api/health');
    console.log('GET /api/health response:', healthRes.statusCode, healthRes.body);

    if (healthRes.statusCode === 200 && healthRes.body && healthRes.body.status === 'healthy') {
      console.log('PASS: /api/health returned 200 OK with healthy status.');
    } else {
      throw new Error(`FAIL: /api/health returned ${healthRes.statusCode}`);
    }

    console.log('\nTesting GET / (base route) ...');
    const baseRes = await testEndpoint('GET', '/');
    console.log('GET / response:', baseRes.statusCode, baseRes.body);

    if (baseRes.statusCode === 200 && baseRes.body && baseRes.body.service === 'BusGo Backend API') {
      console.log('PASS: GET / returned 200 OK with service details.');
    } else {
      throw new Error(`FAIL: GET / returned ${baseRes.statusCode}`);
    }

    console.log('\nTesting GET /api/unknown (404 handler) ...');
    const notFoundRes = await testEndpoint('GET', '/api/unknown');
    console.log('GET /api/unknown response:', notFoundRes.statusCode, notFoundRes.body);

    if (notFoundRes.statusCode === 404 && notFoundRes.body && notFoundRes.body.status === 'fail') {
      console.log('PASS: 404 handler returned 404 Not Found.');
    } else {
      throw new Error(`FAIL: 404 handler returned ${notFoundRes.statusCode}`);
    }

    console.log('\n✓ All backend setup tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
