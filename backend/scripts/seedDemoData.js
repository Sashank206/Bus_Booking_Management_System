require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const crypto = require('crypto');
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
  AuditLog
} = require('../models');

const SHARED_PASSWORD = 'BusGo@Demo2026';

// Metrics tracker
const stats = {
  users: { created: 0, existing: 0 },
  operators: { created: 0, existing: 0 },
  stops: { created: 0, existing: 0 },
  routes: { created: 0, existing: 0 },
  routeStops: { created: 0, existing: 0 },
  buses: { created: 0, existing: 0 },
  trips: { created: 0, existing: 0 },
  tripStops: { created: 0, existing: 0 },
  seatInventories: { created: 0, existing: 0 },
  bookings: { created: 0, existing: 0 }
};

// Helper: Generate Seat Layout Definitions
function generateSeatLayout(rows, cols, deckCount = 1, defaultType = 'seater') {
  const seats = [];
  const colLetters = ['A', 'B', 'C', 'D', 'E'];

  for (let d = 1; d <= deckCount; d++) {
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const letter = colLetters[c - 1] || `${c}`;
        const prefix = deckCount > 1 ? (d === 1 ? 'L' : 'U') : '';
        const seatNumber = `${prefix}${r}${letter}`;

        seats.push({
          seatNumber,
          row: r,
          col: c,
          deck: d,
          seatType: defaultType
        });
      }
    }
  }

  return {
    rows,
    columns: cols,
    deckCount,
    seats
  };
}

async function seed() {
  console.log('\n====================================================================');
  console.log('              BUSGO PRODUCTION DEMO DATABASE SEEDER                ');
  console.log('====================================================================\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/busgo';
  console.log('[1/7] Connecting to database...');
  await mongoose.connect(uri);
  console.log('[1/7] Connected successfully.\n');

  const passwordHash = await User.hashPassword(SHARED_PASSWORD);

  // -------------------------------------------------------------------------
  // 1. ADMIN & USER ACCOUNTS
  // -------------------------------------------------------------------------
  console.log('[2/7] Seeding Users and Operator Accounts...');

  // Admin Account
  let adminUser = await User.findOne({ email: 'admin@busgo.com' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@busgo.com',
      passwordHash,
      phone: '9999999999',
      role: 'admin',
      accountStatus: 'active',
      emailVerified: true
    });
    stats.users.created++;
  } else {
    stats.users.existing++;
  }

  // 4 Operator Users and Business Profiles
  const operatorDefs = [
    {
      name: 'Rajesh Sharma',
      email: 'rajesh@travels.com',
      phone: '9811122233',
      companyName: 'Rajesh Royal Express',
      registrationNumber: 'GSTIN07AABCR1234F1Z5',
      contactPerson: 'Rajesh Sharma',
      businessAddress: 'Plot 42, Connaught Circus, New Delhi'
    },
    {
      name: 'Harpreet Singh',
      email: 'punjab@travels.com',
      phone: '9822233344',
      companyName: 'Punjab Super Liner',
      registrationNumber: 'GSTIN03PUNJ5678F1Z2',
      contactPerson: 'Harpreet Singh',
      businessAddress: 'GT Road Bus Stand Complex, Amritsar'
    },
    {
      name: 'Venkatesh Rao',
      email: 'south@travels.com',
      phone: '9833344455',
      companyName: 'Deccan Southern Star',
      registrationNumber: 'GSTIN36DECC9012F1Z8',
      contactPerson: 'Venkatesh Rao',
      businessAddress: 'Majestic Terminal Chambers, Bengaluru'
    },
    {
      name: 'Mohit Negi',
      email: 'himalayan@travels.com',
      phone: '9844455566',
      companyName: 'Himalayan Heights Transport',
      registrationNumber: 'GSTIN02HIMA3456F1Z4',
      contactPerson: 'Mohit Negi',
      businessAddress: 'The Mall Road Bus Depot, Shimla'
    }
  ];

  const operatorMap = new Map();

  for (const opDef of operatorDefs) {
    let user = await User.findOne({ email: opDef.email });
    if (!user) {
      user = await User.create({
        name: opDef.name,
        email: opDef.email,
        passwordHash,
        phone: opDef.phone,
        role: 'operator',
        accountStatus: 'active',
        emailVerified: true
      });
      stats.users.created++;
    } else {
      stats.users.existing++;
    }

    let operator = await Operator.findOne({ userId: user._id });
    if (!operator) {
      operator = await Operator.create({
        userId: user._id,
        companyName: opDef.companyName,
        registrationNumber: opDef.registrationNumber,
        contactPerson: opDef.contactPerson,
        businessAddress: opDef.businessAddress,
        approvalStatus: 'approved',
        approvedBy: adminUser._id,
        approvedAt: new Date()
      });
      stats.operators.created++;
    } else {
      stats.operators.existing++;
    }

    operatorMap.set(opDef.email, { user, operator });
  }

  // 10 Customer Accounts
  const customerDefs = [
    { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '9876543210' },
    { name: 'Amit Kumar', email: 'amit.kumar@example.com', phone: '9876543211' },
    { name: 'Neha Gupta', email: 'neha.gupta@example.com', phone: '9876543212' },
    { name: 'Rohit Verma', email: 'rohit.verma@example.com', phone: '9876543213' },
    { name: 'Ananya Reddy', email: 'ananya.reddy@example.com', phone: '9876543214' },
    { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '9876543215' },
    { name: 'Pooja Patel', email: 'pooja.patel@example.com', phone: '9876543216' },
    { name: 'Rahul Nair', email: 'rahul.nair@example.com', phone: '9876543217' },
    { name: 'Divya Krishnan', email: 'divya.krishnan@example.com', phone: '9876543218' },
    { name: 'Karan Malhotra', email: 'karan.malhotra@example.com', phone: '9876543219' }
  ];

  const customerMap = new Map();

  for (const cDef of customerDefs) {
    let user = await User.findOne({ email: cDef.email });
    if (!user) {
      user = await User.create({
        name: cDef.name,
        email: cDef.email,
        passwordHash,
        phone: cDef.phone,
        role: 'customer',
        accountStatus: 'active',
        emailVerified: true
      });
      stats.users.created++;
    } else {
      stats.users.existing++;
    }
    customerMap.set(cDef.email, user);
  }

  // -------------------------------------------------------------------------
  // 2. STOPS (15 Fictional Master Stops)
  // -------------------------------------------------------------------------
  console.log('[3/7] Seeding Master Stops...');

  const stopDefs = [
    { stopName: 'Kashmere Gate ISBT', city: 'Delhi', state: 'Delhi', address: 'Inter State Bus Terminal, Kashmere Gate', lat: 28.6665, lng: 77.2285 },
    { stopName: 'Sector 43 ISBT', city: 'Chandigarh', state: 'Chandigarh', address: 'Sector 43 Bus Stand, Chandigarh', lat: 30.7188, lng: 76.7410 },
    { stopName: 'Ludhiana Bus Terminal', city: 'Ludhiana', state: 'Punjab', address: 'GT Road Bus Stand, Ludhiana', lat: 30.9010, lng: 75.8573 },
    { stopName: 'Jalandhar City Bus Stand', city: 'Jalandhar', state: 'Punjab', address: 'BMC Chowk, Jalandhar', lat: 31.3260, lng: 75.5762 },
    { stopName: 'Amritsar Golden Temple Bay', city: 'Amritsar', state: 'Punjab', address: 'Bus Stand Road, Near Golden Temple', lat: 31.6200, lng: 74.8765 },
    { stopName: 'Sindhi Camp Central Stand', city: 'Jaipur', state: 'Rajasthan', address: 'Station Road, Sindhi Camp, Jaipur', lat: 26.9239, lng: 75.8010 },
    { stopName: 'ISBT Dehradun Express Stand', city: 'Dehradun', state: 'Uttarakhand', address: 'Haridwar Bypass, Dehradun', lat: 30.2850, lng: 78.0050 },
    { stopName: 'Shimla Old Bus Stand', city: 'Shimla', state: 'Himachal Pradesh', address: 'Cart Road, Shimla', lat: 31.1048, lng: 77.1734 },
    { stopName: 'Manali Private Bus Depot', city: 'Manali', state: 'Himachal Pradesh', address: 'Mall Road Bus Depot, Manali', lat: 32.2396, lng: 77.1887 },
    { stopName: 'Majestic Inter-City Terminus', city: 'Bengaluru', state: 'Karnataka', address: 'Kempegowda Bus Station, Bengaluru', lat: 12.9770, lng: 77.5720 },
    { stopName: 'MGBS Central Station', city: 'Hyderabad', state: 'Telangana', address: 'Gowliguda, Mahatma Gandhi Bus Station', lat: 17.3780, lng: 78.4820 },
    { stopName: 'Koyambedu CMBT', city: 'Chennai', state: 'Tamil Nadu', address: 'Chennai Mofussil Bus Terminus, Koyambedu', lat: 13.0694, lng: 80.2038 },
    { stopName: 'PNBS Central Bus Station', city: 'Vijayawada', state: 'Andhra Pradesh', address: 'Pandit Nehru Bus Station, Tarapet', lat: 16.5062, lng: 80.6480 },
    { stopName: 'Dwaraka Bus Complex', city: 'Visakhapatnam', state: 'Andhra Pradesh', address: 'Dwarka Nagar, Visakhapatnam', lat: 17.7280, lng: 83.3030 },
    { stopName: 'Tirupati Central Bus Stand', city: 'Tirupati', state: 'Andhra Pradesh', address: 'Central Bus Stand, Tirupati', lat: 13.6288, lng: 79.4192 }
  ];

  const stopMap = new Map();

  for (const sDef of stopDefs) {
    let stop = await Stop.findOne({ stopName: sDef.stopName, city: sDef.city });
    if (!stop) {
      stop = await Stop.create({
        stopName: sDef.stopName,
        city: sDef.city,
        state: sDef.state,
        address: sDef.address,
        latitude: sDef.lat,
        longitude: sDef.lng,
        isActive: true
      });
      stats.stops.created++;
    } else {
      stats.stops.existing++;
    }
    stopMap.set(sDef.city, stop);
  }

  // -------------------------------------------------------------------------
  // 3. ROUTES & ROUTESTOPS (8 Master Routes)
  // -------------------------------------------------------------------------
  console.log('[4/7] Seeding Routes and Ordered Sequence Stops...');

  const routeConfigs = [
    {
      routeName: 'Delhi to Amritsar Grand Trunk Express',
      sourceCity: 'Delhi',
      destCity: 'Amritsar',
      distanceKm: 450,
      durationMins: 480,
      stops: [
        { city: 'Delhi', dist: 0 },
        { city: 'Chandigarh', dist: 245 },
        { city: 'Ludhiana', dist: 340 },
        { city: 'Jalandhar', dist: 400 },
        { city: 'Amritsar', dist: 450 }
      ]
    },
    {
      routeName: 'Delhi to Jaipur Pink City Highway',
      sourceCity: 'Delhi',
      destCity: 'Jaipur',
      distanceKm: 280,
      durationMins: 330,
      stops: [
        { city: 'Delhi', dist: 0 },
        { city: 'Jaipur', dist: 280 }
      ]
    },
    {
      routeName: 'Delhi to Manali Himalayan Safari',
      sourceCity: 'Delhi',
      destCity: 'Manali',
      distanceKm: 540,
      durationMins: 720,
      stops: [
        { city: 'Delhi', dist: 0 },
        { city: 'Chandigarh', dist: 245 },
        { city: 'Shimla', dist: 355 },
        { city: 'Manali', dist: 540 }
      ]
    },
    {
      routeName: 'Delhi to Dehradun Capital Express',
      sourceCity: 'Delhi',
      destCity: 'Dehradun',
      distanceKm: 250,
      durationMins: 300,
      stops: [
        { city: 'Delhi', dist: 0 },
        { city: 'Dehradun', dist: 250 }
      ]
    },
    {
      routeName: 'Bengaluru to Chennai Deccan Corridor',
      sourceCity: 'Bengaluru',
      destCity: 'Chennai',
      distanceKm: 340,
      durationMins: 390,
      stops: [
        { city: 'Bengaluru', dist: 0 },
        { city: 'Chennai', dist: 340 }
      ]
    },
    {
      routeName: 'Hyderabad to Vijayawada Andhra Link',
      sourceCity: 'Hyderabad',
      destCity: 'Vijayawada',
      distanceKm: 275,
      durationMins: 300,
      stops: [
        { city: 'Hyderabad', dist: 0 },
        { city: 'Vijayawada', dist: 275 }
      ]
    },
    {
      routeName: 'Vijayawada to Visakhapatnam Coastal Line',
      sourceCity: 'Vijayawada',
      destCity: 'Visakhapatnam',
      distanceKm: 350,
      durationMins: 420,
      stops: [
        { city: 'Vijayawada', dist: 0 },
        { city: 'Visakhapatnam', dist: 350 }
      ]
    },
    {
      routeName: 'Bengaluru to Tirupati Pilgrim Express',
      sourceCity: 'Bengaluru',
      destCity: 'Tirupati',
      distanceKm: 250,
      durationMins: 270,
      stops: [
        { city: 'Bengaluru', dist: 0 },
        { city: 'Tirupati', dist: 250 }
      ]
    }
  ];

  const routeMap = new Map();

  for (const rConf of routeConfigs) {
    const srcStop = stopMap.get(rConf.sourceCity);
    const destStop = stopMap.get(rConf.destCity);

    let route = await Route.findOne({ sourceStopId: srcStop._id, destinationStopId: destStop._id });
    if (!route) {
      route = await Route.create({
        routeName: rConf.routeName,
        sourceStopId: srcStop._id,
        destinationStopId: destStop._id,
        distanceKm: rConf.distanceKm,
        estimatedDurationMinutes: rConf.durationMins,
        isActive: true
      });
      stats.routes.created++;
    } else {
      stats.routes.existing++;
    }

    // Insert RouteStops sequentially
    for (let seq = 0; seq < rConf.stops.length; seq++) {
      const stopInfo = rConf.stops[seq];
      const targetStop = stopMap.get(stopInfo.city);

      let routeStop = await RouteStop.findOne({ routeId: route._id, stopSequence: seq });
      if (!routeStop) {
        await RouteStop.create({
          routeId: route._id,
          stopId: targetStop._id,
          stopSequence: seq,
          distanceFromStart: stopInfo.dist
        });
        stats.routeStops.created++;
      } else {
        stats.routeStops.existing++;
      }
    }

    routeMap.set(rConf.routeName, { route, config: rConf });
  }

  // -------------------------------------------------------------------------
  // 4. BUSES (10 Physical Fleet Vehicles with Layouts)
  // -------------------------------------------------------------------------
  console.log('[5/7] Seeding Fleet Buses and Cabin Seat Layouts...');

  const op1 = operatorMap.get('rajesh@travels.com').operator;
  const op2 = operatorMap.get('punjab@travels.com').operator;
  const op3 = operatorMap.get('south@travels.com').operator;
  const op4 = operatorMap.get('himalayan@travels.com').operator;

  const busConfigs = [
    // Operator 1: Rajesh Royal Express
    {
      operator: op1,
      busNumber: 'DL-01-EXP-1001',
      registrationNumber: 'DL01EX1001',
      busType: 'AC Sleeper',
      layout: generateSeatLayout(6, 3, 2, 'sleeper'), // 6 * 3 * 2 = 36 sleeper berths
      amenities: ['Blanket', 'Pillow', 'Charging Point', 'WiFi', 'Reading Light']
    },
    {
      operator: op1,
      busNumber: 'DL-01-EXP-1002',
      registrationNumber: 'DL01EX1002',
      busType: 'AC Seater',
      layout: generateSeatLayout(10, 4, 1, 'seater'), // 40 seater
      amenities: ['Water Bottle', 'Charging Point', 'Air Suspension']
    },
    {
      operator: op1,
      busNumber: 'DL-01-EXP-1003',
      registrationNumber: 'DL01EX1003',
      busType: 'Volvo Multi-Axle',
      layout: generateSeatLayout(11, 4, 1, 'seater'), // 44 luxury seater
      amenities: ['Live Tracking', 'Snacks', 'WiFi', 'Charging Point', 'Emergency Exit']
    },
    // Operator 2: Punjab Super Liner
    {
      operator: op2,
      busNumber: 'PB-08-SUP-2001',
      registrationNumber: 'PB08SU2001',
      busType: 'AC Sleeper',
      layout: generateSeatLayout(5, 3, 2, 'sleeper'), // 30 sleeper berths
      amenities: ['Blanket', 'Reading Light', 'Charging Point']
    },
    {
      operator: op2,
      busNumber: 'PB-08-SUP-2002',
      registrationNumber: 'PB08SU2002',
      busType: 'Non-AC Sleeper',
      layout: generateSeatLayout(5, 3, 2, 'sleeper'), // 30 sleeper berths
      amenities: ['Curtains', 'Luggage Compartment']
    },
    {
      operator: op2,
      busNumber: 'PB-08-SUP-2003',
      registrationNumber: 'PB08SU2003',
      busType: 'AC Seater',
      layout: generateSeatLayout(9, 4, 1, 'seater'), // 36 seater
      amenities: ['Water Bottle', 'CCTV', 'First Aid Box']
    },
    // Operator 3: Deccan Southern Star
    {
      operator: op3,
      busNumber: 'KA-01-DEC-3001',
      registrationNumber: 'KA01DE3001',
      busType: 'Volvo Multi-Axle',
      layout: generateSeatLayout(10, 4, 1, 'seater'), // 40 luxury seater
      amenities: ['WiFi', 'Water Bottle', 'Charging Point', 'Movie Screen']
    },
    {
      operator: op3,
      busNumber: 'TS-09-DEC-3002',
      registrationNumber: 'TS09DE3002',
      busType: 'AC Sleeper',
      layout: generateSeatLayout(6, 3, 2, 'sleeper'), // 36 sleeper
      amenities: ['Blanket', 'Reading Light', 'Snacks', 'WiFi']
    },
    // Operator 4: Himalayan Heights Transport
    {
      operator: op4,
      busNumber: 'HP-01-HIM-4001',
      registrationNumber: 'HP01HI4001',
      busType: 'AC Seater',
      layout: generateSeatLayout(8, 4, 1, 'seater'), // 32 mountain seater
      amenities: ['Heating', 'First Aid Box', 'Luggage Storage']
    },
    {
      operator: op4,
      busNumber: 'HP-01-HIM-4002',
      registrationNumber: 'HP01HI4002',
      busType: 'AC Sleeper',
      layout: generateSeatLayout(5, 3, 2, 'sleeper'), // 30 sleeper
      amenities: ['Heater', 'Blanket', 'Hot Water Flask', 'Charging Point']
    }
  ];

  const busList = [];

  for (const bConf of busConfigs) {
    let bus = await Bus.findOne({ registrationNumber: bConf.registrationNumber });
    const totalSeats = bConf.layout.seats.length;

    if (!bus) {
      bus = await Bus.create({
        operatorId: bConf.operator._id,
        busNumber: bConf.busNumber,
        busName: `${bConf.operator.companyName} (${bConf.busType})`,
        busType: bConf.busType,
        registrationNumber: bConf.registrationNumber,
        totalSeats,
        seatLayout: bConf.layout,
        amenities: bConf.amenities,
        isActive: true
      });
      stats.buses.created++;
    } else {
      stats.buses.existing++;
    }

    busList.push(bus);
  }

  // -------------------------------------------------------------------------
  // 5. TRIPS (20 Fictional Scheduled Trips across Dates & Routes)
  // -------------------------------------------------------------------------
  console.log('[6/7] Seeding 20 Scheduled Trips, TripStops & SeatInventory...');

  // Base dates
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dayOffsets = [0, 1, 1, 2, 2, 3, 3, 5];

  // Helper to construct exact departure and arrival dates
  function makeTimes(daysFromNow, depHour, depMin, durationHours) {
    const dep = new Date(today.getTime() + daysFromNow * 24 * 3600 * 1000);
    dep.setUTCHours(depHour, depMin, 0, 0);
    const arr = new Date(dep.getTime() + durationHours * 3600 * 1000);
    const travelDate = new Date(dep);
    travelDate.setUTCHours(0, 0, 0, 0);
    return { travelDate, depTime: dep, arrTime: arr };
  }

  // Trip definitions ensuring diversity in operator, bus, route, and timing:
  const tripDefinitions = [
    // 1. Delhi to Amritsar - Morning (Today) - Rajesh Royal Express (Volvo Multi-Axle)
    {
      routeName: 'Delhi to Amritsar Grand Trunk Express',
      busIndex: 2, // Bus 3 (DL01EX1003)
      times: makeTimes(0, 6, 0, 8),
      fare: 850
    },
    // 2. Delhi to Amritsar - Afternoon (Tomorrow) - Punjab Super Liner (AC Sleeper)
    {
      routeName: 'Delhi to Amritsar Grand Trunk Express',
      busIndex: 3, // Bus 4 (PB08SU2001)
      times: makeTimes(1, 14, 0, 8.5),
      fare: 950
    },
    // 3. Delhi to Amritsar - Night (Tomorrow) - Rajesh Royal Express (AC Sleeper)
    {
      routeName: 'Delhi to Amritsar Grand Trunk Express',
      busIndex: 0, // Bus 1 (DL01EX1001)
      times: makeTimes(1, 22, 30, 8),
      fare: 1100
    },
    // 4. Delhi to Amritsar - Evening (+2 days) - Punjab Super Liner (AC Seater)
    {
      routeName: 'Delhi to Amritsar Grand Trunk Express',
      busIndex: 5, // Bus 6 (PB08SU2003)
      times: makeTimes(2, 17, 30, 8.5),
      fare: 750
    },
    // 5. Delhi to Jaipur - Morning (Today) - Rajesh Royal Express (AC Seater)
    {
      routeName: 'Delhi to Jaipur Pink City Highway',
      busIndex: 1, // Bus 2 (DL01EX1002)
      times: makeTimes(0, 7, 0, 5.5),
      fare: 550
    },
    // 6. Delhi to Jaipur - Afternoon (Tomorrow) - Rajesh Royal Express (Volvo)
    {
      routeName: 'Delhi to Jaipur Pink City Highway',
      busIndex: 2, // Bus 3 (DL01EX1003)
      times: makeTimes(1, 15, 0, 5),
      fare: 650
    },
    // 7. Delhi to Jaipur - Night (+2 days) - Rajesh Royal Express (AC Sleeper)
    {
      routeName: 'Delhi to Jaipur Pink City Highway',
      busIndex: 0, // Bus 1 (DL01EX1001)
      times: makeTimes(2, 23, 0, 5.5),
      fare: 750
    },
    // 8. Delhi to Manali - Evening (Today) - Himalayan Heights (AC Sleeper)
    {
      routeName: 'Delhi to Manali Himalayan Safari',
      busIndex: 9, // Bus 10 (HP01HI4002)
      times: makeTimes(0, 18, 0, 12),
      fare: 1450
    },
    // 9. Delhi to Manali - Night (Tomorrow) - Himalayan Heights (AC Seater)
    {
      routeName: 'Delhi to Manali Himalayan Safari',
      busIndex: 8, // Bus 9 (HP01HI4001)
      times: makeTimes(1, 20, 30, 12.5),
      fare: 1200
    },
    // 10. Delhi to Manali - Night (+3 days) - Himalayan Heights (AC Sleeper)
    {
      routeName: 'Delhi to Manali Himalayan Safari',
      busIndex: 9, // Bus 10 (HP01HI4002)
      times: makeTimes(3, 21, 0, 12),
      fare: 1500
    },
    // 11. Delhi to Dehradun - Morning (Tomorrow) - Rajesh Royal Express (AC Seater)
    {
      routeName: 'Delhi to Dehradun Capital Express',
      busIndex: 1, // Bus 2 (DL01EX1002)
      times: makeTimes(1, 8, 30, 5),
      fare: 480
    },
    // 12. Delhi to Dehradun - Afternoon (+2 days) - Himalayan Heights (AC Seater)
    {
      routeName: 'Delhi to Dehradun Capital Express',
      busIndex: 8, // Bus 9 (HP01HI4001)
      times: makeTimes(2, 13, 0, 5.5),
      fare: 520
    },
    // 13. Bengaluru to Chennai - Early Morning (Today) - Deccan Southern Star (Volvo)
    {
      routeName: 'Bengaluru to Chennai Deccan Corridor',
      busIndex: 6, // Bus 7 (KA01DE3001)
      times: makeTimes(0, 6, 30, 6.5),
      fare: 780
    },
    // 14. Bengaluru to Chennai - Afternoon (Tomorrow) - Deccan Southern Star (AC Sleeper)
    {
      routeName: 'Bengaluru to Chennai Deccan Corridor',
      busIndex: 7, // Bus 8 (TS09DE3002)
      times: makeTimes(1, 14, 0, 7),
      fare: 890
    },
    // 15. Bengaluru to Chennai - Night (+2 days) - Deccan Southern Star (Volvo)
    {
      routeName: 'Bengaluru to Chennai Deccan Corridor',
      busIndex: 6, // Bus 7 (KA01DE3001)
      times: makeTimes(2, 22, 0, 6.5),
      fare: 850
    },
    // 16. Hyderabad to Vijayawada - Morning (Tomorrow) - Deccan Southern Star (AC Sleeper)
    {
      routeName: 'Hyderabad to Vijayawada Andhra Link',
      busIndex: 7, // Bus 8 (TS09DE3002)
      times: makeTimes(1, 9, 0, 5),
      fare: 580
    },
    // 17. Hyderabad to Vijayawada - Evening (+3 days) - Deccan Southern Star (Volvo)
    {
      routeName: 'Hyderabad to Vijayawada Andhra Link',
      busIndex: 6, // Bus 7 (KA01DE3001)
      times: makeTimes(3, 18, 30, 5),
      fare: 620
    },
    // 18. Vijayawada to Visakhapatnam - Night (Tomorrow) - Deccan Southern Star (AC Sleeper)
    {
      routeName: 'Vijayawada to Visakhapatnam Coastal Line',
      busIndex: 7, // Bus 8 (TS09DE3002)
      times: makeTimes(1, 23, 0, 7),
      fare: 790
    },
    // 19. Bengaluru to Tirupati - Early Morning (Tomorrow) - Deccan Southern Star (Volvo)
    {
      routeName: 'Bengaluru to Tirupati Pilgrim Express',
      busIndex: 6, // Bus 7 (KA01DE3001)
      times: makeTimes(1, 5, 0, 4.5),
      fare: 450
    },
    // 20. Bengaluru to Tirupati - Evening (+5 days) - Deccan Southern Star (Volvo)
    {
      routeName: 'Bengaluru to Tirupati Pilgrim Express',
      busIndex: 6, // Bus 7 (KA01DE3001)
      times: makeTimes(5, 17, 0, 4.5),
      fare: 480
    }
  ];

  const seededTrips = [];

  for (const tDef of tripDefinitions) {
    const routeData = routeMap.get(tDef.routeName);
    const bus = busList[tDef.busIndex];

    let trip = await Trip.findOne({
      busId: bus._id,
      departureTime: tDef.times.depTime
    });

    if (!trip) {
      trip = await Trip.create({
        busId: bus._id,
        operatorId: bus.operatorId,
        routeId: routeData.route._id,
        travelDate: tDef.times.travelDate,
        departureTime: tDef.times.depTime,
        arrivalTime: tDef.times.arrTime,
        baseFare: tDef.fare,
        tripStatus: 'scheduled'
      });
      stats.trips.created++;
    } else {
      stats.trips.existing++;
    }

    seededTrips.push({ trip, bus, routeData });

    // Seed TripStops with linear interpolation of intermediate arrival/departure times
    const routeStops = await RouteStop.find({ routeId: routeData.route._id }).sort({ stopSequence: 1 });
    const totalDist = routeData.config.distanceKm || 1;
    const totalDurationMs = tDef.times.arrTime.getTime() - tDef.times.depTime.getTime();

    const existingTripStops = await TripStop.find({ tripId: trip._id });
    const existingSeqs = new Set(existingTripStops.map((ts) => ts.stopSequence));
    const newTripStops = [];

    for (const rs of routeStops) {
      if (!existingSeqs.has(rs.stopSequence)) {
        const ratio = totalDist > 0 ? rs.distanceFromStart / totalDist : 0;
        const stopArrivalTime = new Date(tDef.times.depTime.getTime() + ratio * totalDurationMs);
        const stopDepTime = rs.stopSequence === routeStops.length - 1
          ? stopArrivalTime
          : new Date(stopArrivalTime.getTime() + 15 * 60 * 1000); // 15-min halt

        newTripStops.push({
          tripId: trip._id,
          stopId: rs.stopId,
          stopSequence: rs.stopSequence,
          arrivalTime: stopArrivalTime,
          departureTime: stopDepTime
        });
      } else {
        stats.tripStops.existing++;
      }
    }

    if (newTripStops.length > 0) {
      await TripStop.insertMany(newTripStops);
      stats.tripStops.created += newTripStops.length;
    }

    // Seed SeatInventory for every seat in the bus layout in batch
    const existingSeats = await SeatInventory.find({ tripId: trip._id });
    const existingSeatNums = new Set(existingSeats.map((s) => s.seatNumber));
    const newSeats = [];

    for (const layoutSeat of bus.seatLayout.seats) {
      if (!existingSeatNums.has(layoutSeat.seatNumber)) {
        newSeats.push({
          tripId: trip._id,
          seatNumber: layoutSeat.seatNumber,
          seatType: layoutSeat.seatType || 'seater',
          isActive: true,
          activeSegments: []
        });
      } else {
        stats.seatInventories.existing++;
      }
    }

    if (newSeats.length > 0) {
      await SeatInventory.insertMany(newSeats);
      stats.seatInventories.created += newSeats.length;
    }
  }

  // -------------------------------------------------------------------------
  // 6. SAMPLE BOOKINGS (6 Diverse Scenarios for Phase 6 Testing)
  // -------------------------------------------------------------------------
  console.log('[7/7] Seeding Realistic Booking & Segment Allocation Scenarios...');

  const trip1 = seededTrips[0].trip; // Delhi to Amritsar (Volvo)
  const trip2 = seededTrips[4].trip; // Delhi to Jaipur (AC Seater)
  const trip3 = seededTrips[12].trip; // Bengaluru to Chennai (Volvo)
  const trip4 = seededTrips[10].trip; // Delhi to Dehradun (AC Seater)

  const trip1Stops = await TripStop.find({ tripId: trip1._id }).sort({ stopSequence: 1 });
  const trip2Stops = await TripStop.find({ tripId: trip2._id }).sort({ stopSequence: 1 });
  const trip3Stops = await TripStop.find({ tripId: trip3._id }).sort({ stopSequence: 1 });
  const trip4Stops = await TripStop.find({ tripId: trip4._id }).sort({ stopSequence: 1 });

  // Scenario 1: Multi-passenger Confirmed Booking (Priya Sharma - 2 seats: 1A, 1B)
  const pnr1 = 'BGDELAMR01';
  let b1 = await Booking.findOne({ pnr: pnr1 });
  if (!b1) {
    const cust1 = customerMap.get('priya.sharma@example.com');
    const fare = trip1.baseFare;
    const totalAmount = fare * 2;

    b1 = await Booking.create({
      pnr: pnr1,
      userId: cust1._id,
      tripId: trip1._id,
      bookingStatus: 'confirmed',
      totalAmount,
      bookingDate: new Date(),
      confirmedAt: new Date()
    });

    const p1 = await Passenger.create({
      bookingId: b1._id,
      fullName: 'Priya Sharma',
      age: 28,
      gender: 'female',
      phone: cust1.phone,
      email: cust1.email
    });

    const p2 = await Passenger.create({
      bookingId: b1._id,
      fullName: 'Rohan Sharma',
      age: 31,
      gender: 'male',
      phone: '9876543299',
      email: 'rohan.sharma@example.com'
    });

    const si1A = await SeatInventory.findOne({ tripId: trip1._id, seatNumber: '1A' });
    const si1B = await SeatInventory.findOne({ tripId: trip1._id, seatNumber: '1B' });

    const bs1 = await BookingSeat.create({
      bookingId: b1._id,
      passengerId: p1._id,
      seatInventoryId: si1A._id,
      boardingStopId: trip1Stops[0].stopId,
      droppingStopId: trip1Stops[trip1Stops.length - 1].stopId,
      fromSequence: 0,
      toSequence: 4,
      seatNumber: '1A',
      segmentFare: fare,
      allocationStatus: 'confirmed',
      confirmedAt: new Date()
    });

    const bs2 = await BookingSeat.create({
      bookingId: b1._id,
      passengerId: p2._id,
      seatInventoryId: si1B._id,
      boardingStopId: trip1Stops[0].stopId,
      droppingStopId: trip1Stops[trip1Stops.length - 1].stopId,
      fromSequence: 0,
      toSequence: 4,
      seatNumber: '1B',
      segmentFare: fare,
      allocationStatus: 'confirmed',
      confirmedAt: new Date()
    });

    // Update SeatInventory activeSegments
    si1A.activeSegments.push({
      bookingSeatId: bs1._id,
      fromSequence: 0,
      toSequence: 4,
      status: 'confirmed'
    });
    await si1A.save();

    si1B.activeSegments.push({
      bookingSeatId: bs2._id,
      fromSequence: 0,
      toSequence: 4,
      status: 'confirmed'
    });
    await si1B.save();

    await Payment.create({
      bookingId: b1._id,
      paymentReference: `SIM_PAY_${pnr1}`,
      idempotencyKey: `IDEMP_${pnr1}_001`,
      paymentMethod: 'simulated_card',
      paymentAmount: totalAmount,
      paymentStatus: 'successful',
      provider: 'simulated_gateway',
      paidAt: new Date()
    });

    stats.bookings.created++;
  } else {
    stats.bookings.existing++;
  }

  // Scenario 2: Single-passenger Confirmed Booking (Amit Kumar - Seat 2A)
  const pnr2 = 'BGDELJAI02';
  let b2 = await Booking.findOne({ pnr: pnr2 });
  if (!b2) {
    const cust2 = customerMap.get('amit.kumar@example.com');
    const fare = trip2.baseFare;

    b2 = await Booking.create({
      pnr: pnr2,
      userId: cust2._id,
      tripId: trip2._id,
      bookingStatus: 'confirmed',
      totalAmount: fare,
      bookingDate: new Date(),
      confirmedAt: new Date()
    });

    const p = await Passenger.create({
      bookingId: b2._id,
      fullName: 'Amit Kumar',
      age: 34,
      gender: 'male',
      phone: cust2.phone,
      email: cust2.email
    });

    const si2A = await SeatInventory.findOne({ tripId: trip2._id, seatNumber: '2A' });

    const bs = await BookingSeat.create({
      bookingId: b2._id,
      passengerId: p._id,
      seatInventoryId: si2A._id,
      boardingStopId: trip2Stops[0].stopId,
      droppingStopId: trip2Stops[trip2Stops.length - 1].stopId,
      fromSequence: 0,
      toSequence: 1,
      seatNumber: '2A',
      segmentFare: fare,
      allocationStatus: 'confirmed',
      confirmedAt: new Date()
    });

    si2A.activeSegments.push({
      bookingSeatId: bs._id,
      fromSequence: 0,
      toSequence: 1,
      status: 'confirmed'
    });
    await si2A.save();

    await Payment.create({
      bookingId: b2._id,
      paymentReference: `SIM_PAY_${pnr2}`,
      idempotencyKey: `IDEMP_${pnr2}_001`,
      paymentMethod: 'simulated_upi',
      paymentAmount: fare,
      paymentStatus: 'successful',
      provider: 'simulated_gateway',
      paidAt: new Date()
    });

    stats.bookings.created++;
  } else {
    stats.bookings.existing++;
  }

  // Scenario 3: SEGMENT-BASED SEAT REUSE (Demonstrating Half-Open Interval [0, 2) & [2, 4) on same Seat 3A)
  // Passenger 1 (Neha Gupta): Delhi to Ludhiana [0, 2) on Seat 3A
  const pnr3A = 'BGSEGREU01';
  let b3A = await Booking.findOne({ pnr: pnr3A });
  const si3A = await SeatInventory.findOne({ tripId: trip1._id, seatNumber: '3A' });

  if (!b3A && si3A) {
    const cust3 = customerMap.get('neha.gupta@example.com');
    const fare = Math.round(trip1.baseFare * 0.7);

    b3A = await Booking.create({
      pnr: pnr3A,
      userId: cust3._id,
      tripId: trip1._id,
      bookingStatus: 'confirmed',
      totalAmount: fare,
      bookingDate: new Date(),
      confirmedAt: new Date()
    });

    const p = await Passenger.create({
      bookingId: b3A._id,
      fullName: 'Neha Gupta',
      age: 26,
      gender: 'female',
      phone: cust3.phone,
      email: cust3.email
    });

    const bs = await BookingSeat.create({
      bookingId: b3A._id,
      passengerId: p._id,
      seatInventoryId: si3A._id,
      boardingStopId: trip1Stops[0].stopId,
      droppingStopId: trip1Stops[2].stopId, // Ludhiana (seq 2)
      fromSequence: 0,
      toSequence: 2,
      seatNumber: '3A',
      segmentFare: fare,
      allocationStatus: 'confirmed',
      confirmedAt: new Date()
    });

    si3A.activeSegments.push({
      bookingSeatId: bs._id,
      fromSequence: 0,
      toSequence: 2,
      status: 'confirmed'
    });
    await si3A.save();

    await Payment.create({
      bookingId: b3A._id,
      paymentReference: `SIM_PAY_${pnr3A}`,
      idempotencyKey: `IDEMP_${pnr3A}_001`,
      paymentMethod: 'simulated_card',
      paymentAmount: fare,
      paymentStatus: 'successful',
      provider: 'simulated_gateway',
      paidAt: new Date()
    });

    stats.bookings.created++;
  } else {
    stats.bookings.existing++;
  }

  // Passenger 2 (Rohit Verma): Ludhiana to Amritsar [2, 4) on the EXACT SAME Seat 3A!
  const pnr3B = 'BGSEGREU02';
  let b3B = await Booking.findOne({ pnr: pnr3B });
  if (!b3B && si3A) {
    const cust4 = customerMap.get('rohit.verma@example.com');
    const fare = Math.round(trip1.baseFare * 0.4);

    b3B = await Booking.create({
      pnr: pnr3B,
      userId: cust4._id,
      tripId: trip1._id,
      bookingStatus: 'confirmed',
      totalAmount: fare,
      bookingDate: new Date(),
      confirmedAt: new Date()
    });

    const p = await Passenger.create({
      bookingId: b3B._id,
      fullName: 'Rohit Verma',
      age: 29,
      gender: 'male',
      phone: cust4.phone,
      email: cust4.email
    });

    const bs = await BookingSeat.create({
      bookingId: b3B._id,
      passengerId: p._id,
      seatInventoryId: si3A._id,
      boardingStopId: trip1Stops[2].stopId, // Ludhiana (seq 2)
      droppingStopId: trip1Stops[4].stopId, // Amritsar (seq 4)
      fromSequence: 2,
      toSequence: 4,
      seatNumber: '3A',
      segmentFare: fare,
      allocationStatus: 'confirmed',
      confirmedAt: new Date()
    });

    // Push second non-overlapping segment into the same physical seat
    si3A.activeSegments.push({
      bookingSeatId: bs._id,
      fromSequence: 2,
      toSequence: 4,
      status: 'confirmed'
    });
    await si3A.save();

    await Payment.create({
      bookingId: b3B._id,
      paymentReference: `SIM_PAY_${pnr3B}`,
      idempotencyKey: `IDEMP_${pnr3B}_001`,
      paymentMethod: 'simulated_netbanking',
      paymentAmount: fare,
      paymentStatus: 'successful',
      provider: 'simulated_gateway',
      paidAt: new Date()
    });

    stats.bookings.created++;
  } else {
    stats.bookings.existing++;
  }

  // Scenario 4: Active 10-Minute Hold Booking (Ananya Reddy - Bengaluru to Chennai - Seat 1A)
  const pnr4 = 'BGHOLDCHE4';
  let b4 = await Booking.findOne({ pnr: pnr4 });
  if (!b4) {
    const cust5 = customerMap.get('ananya.reddy@example.com');
    const fare = trip3.baseFare;
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future

    b4 = await Booking.create({
      pnr: pnr4,
      userId: cust5._id,
      tripId: trip3._id,
      bookingStatus: 'pending_payment',
      totalAmount: fare,
      bookingDate: new Date()
    });

    const p = await Passenger.create({
      bookingId: b4._id,
      fullName: 'Ananya Reddy',
      age: 25,
      gender: 'female',
      phone: cust5.phone,
      email: cust5.email
    });

    const siTrip3_1A = await SeatInventory.findOne({ tripId: trip3._id, seatNumber: '1A' });

    const bs = await BookingSeat.create({
      bookingId: b4._id,
      passengerId: p._id,
      seatInventoryId: siTrip3_1A._id,
      boardingStopId: trip3Stops[0].stopId,
      droppingStopId: trip3Stops[trip3Stops.length - 1].stopId,
      fromSequence: 0,
      toSequence: 1,
      seatNumber: '1A',
      segmentFare: fare,
      allocationStatus: 'held',
      holdExpiresAt
    });

    siTrip3_1A.activeSegments.push({
      bookingSeatId: bs._id,
      fromSequence: 0,
      toSequence: 1,
      status: 'held',
      holdExpiresAt
    });
    await siTrip3_1A.save();

    await Payment.create({
      bookingId: b4._id,
      paymentReference: `SIM_PAY_${pnr4}`,
      idempotencyKey: `IDEMP_${pnr4}_001`,
      paymentMethod: 'simulated_card',
      paymentAmount: fare,
      paymentStatus: 'pending',
      provider: 'simulated_gateway'
    });

    stats.bookings.created++;
  } else {
    stats.bookings.existing++;
  }

  // Scenario 5: Cancelled Booking (Vikram Singh - Delhi to Dehradun)
  const pnr5 = 'BGCANCDEH5';
  let b5 = await Booking.findOne({ pnr: pnr5 });
  if (!b5) {
    const cust6 = customerMap.get('vikram.singh@example.com');
    const fare = trip4.baseFare;

    b5 = await Booking.create({
      pnr: pnr5,
      userId: cust6._id,
      tripId: trip4._id,
      bookingStatus: 'cancelled',
      totalAmount: fare,
      bookingDate: new Date(Date.now() - 24 * 3600 * 1000),
      cancelledAt: new Date()
    });

    const p = await Passenger.create({
      bookingId: b5._id,
      fullName: 'Vikram Singh',
      age: 42,
      gender: 'male',
      phone: cust6.phone,
      email: cust6.email
    });

    const siTrip4_1A = await SeatInventory.findOne({ tripId: trip4._id, seatNumber: '1A' });

    await BookingSeat.create({
      bookingId: b5._id,
      passengerId: p._id,
      seatInventoryId: siTrip4_1A._id,
      boardingStopId: trip4Stops[0].stopId,
      droppingStopId: trip4Stops[trip4Stops.length - 1].stopId,
      fromSequence: 0,
      toSequence: 1,
      seatNumber: '1A',
      segmentFare: fare,
      allocationStatus: 'cancelled',
      cancelledAt: new Date()
    });

    // Seat inventory does NOT keep cancelled segments, so seat 1A is free again
    await Payment.create({
      bookingId: b5._id,
      paymentReference: `SIM_PAY_${pnr5}`,
      idempotencyKey: `IDEMP_${pnr5}_001`,
      paymentMethod: 'simulated_card',
      paymentAmount: fare,
      paymentStatus: 'failed',
      provider: 'simulated_gateway'
    });

    stats.bookings.created++;
  } else {
    stats.bookings.existing++;
  }

  // Log Audit trail
  await AuditLog.create({
    userId: adminUser._id,
    action: 'DEMO_DATA_SEEDED',
    entityType: 'System',
    entityId: adminUser._id,
    description: `Demo database seeded with 4 operators, 10 buses, 15 stops, 8 routes, 20 trips, and sample bookings.`,
    ipAddress: '127.0.0.1'
  }).catch(() => {});

  console.log('\n====================================================================');
  console.log('                 DATABASE SEEDING COMPLETED                         ');
  console.log('====================================================================');
  console.log(`Users (Admin/Op/Cust)  : ${stats.users.created} created | ${stats.users.existing} existing`);
  console.log(`Operators              : ${stats.operators.created} created | ${stats.operators.existing} existing`);
  console.log(`Master Stops           : ${stats.stops.created} created | ${stats.stops.existing} existing`);
  console.log(`Master Routes          : ${stats.routes.created} created | ${stats.routes.existing} existing`);
  console.log(`Route Stops            : ${stats.routeStops.created} created | ${stats.routeStops.existing} existing`);
  console.log(`Buses & Seat Layouts   : ${stats.buses.created} created | ${stats.buses.existing} existing`);
  console.log(`Trips                  : ${stats.trips.created} created | ${stats.trips.existing} existing`);
  console.log(`Trip Stops             : ${stats.tripStops.created} created | ${stats.tripStops.existing} existing`);
  console.log(`Seat Inventories       : ${stats.seatInventories.created} created | ${stats.seatInventories.existing} existing`);
  console.log(`Sample Bookings        : ${stats.bookings.created} created | ${stats.bookings.existing} existing`);
  console.log('====================================================================\n');

  await mongoose.disconnect();
  console.log('[BusGo Seeder] Database connection cleanly closed.');
}

seed().catch((err) => {
  console.error('\n[Seed Error] Fatal error during seeding:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
