require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
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
  Payment
} = require('../models');

async function verify() {
  console.log('\n====================================================================');
  console.log('              BUSGO LIVE DEMO DATA VERIFICATION                     ');
  console.log('====================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  let passes = 0;
  let fails = 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`✓ PASS: ${msg}`);
      passes++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
      fails++;
    }
  }

  // 1. Verify User and Operator Counts
  const userCount = await User.countDocuments();
  assert(userCount >= 15, `User count (${userCount}) is at least 15 (1 admin + 4 operators + 10 customers)`);

  const opCount = await Operator.countDocuments({ approvalStatus: 'approved' });
  assert(opCount >= 4, `Approved operator count (${opCount}) is at least 4`);

  // 2. Verify Stops and Routes
  const stopCount = await Stop.countDocuments({ isActive: true });
  assert(stopCount >= 15, `Master stops count (${stopCount}) is at least 15`);

  const routeCount = await Route.countDocuments({ isActive: true });
  assert(routeCount >= 8, `Master routes count (${routeCount}) is at least 8`);

  // 3. Verify Buses and Total Seats match layouts
  const buses = await Bus.find({ isActive: true });
  assert(buses.length >= 10, `Fleet buses count (${buses.length}) is at least 10`);

  let allBusesMatchLayout = true;
  for (const b of buses) {
    if (b.totalSeats !== b.seatLayout.seats.length) {
      allBusesMatchLayout = false;
      break;
    }
  }
  assert(allBusesMatchLayout, 'Every physical bus has totalSeats exactly equal to seatLayout.seats.length');

  // 4. Verify Trips and SeatInventory Counts
  const trips = await Trip.find({ tripStatus: 'scheduled' });
  assert(trips.length >= 20, `Scheduled trips count (${trips.length}) is at least 20`);

  let allTripsHaveInventory = true;
  for (const t of trips) {
    const invCount = await SeatInventory.countDocuments({ tripId: t._id });
    const bus = buses.find((b) => b._id.toString() === t.busId.toString());
    if (bus && invCount !== bus.totalSeats) {
      allTripsHaveInventory = false;
      break;
    }
  }
  assert(allTripsHaveInventory, 'Every scheduled trip has exactly one SeatInventory per physical bus seat');

  // 5. Verify Sample Bookings Integrity
  const bookings = await Booking.find();
  assert(bookings.length >= 6, `Sample bookings count (${bookings.length}) is at least 6`);

  let allBookingsHavePassengersAndSeats = true;
  for (const b of bookings) {
    const pCount = await Passenger.countDocuments({ bookingId: b._id });
    const sCount = await BookingSeat.countDocuments({ bookingId: b._id });
    if (pCount === 0 || sCount === 0 || pCount !== sCount) {
      allBookingsHavePassengersAndSeats = false;
      break;
    }
  }
  assert(allBookingsHavePassengersAndSeats, 'Every booking has 1-to-1 mapped Passenger and BookingSeat records');

  // 6. Verify Segment-Based Seat Reuse (Seat 3A on Delhi->Amritsar trip)
  const reuseBooking1 = await Booking.findOne({ pnr: 'BGSEGREU01' });
  const reuseBooking2 = await Booking.findOne({ pnr: 'BGSEGREU02' });
  assert(Boolean(reuseBooking1 && reuseBooking2), 'Found both segment-reuse bookings (BGSEGREU01 and BGSEGREU02)');

  if (reuseBooking1 && reuseBooking2) {
    assert(reuseBooking1.tripId.toString() === reuseBooking2.tripId.toString(), 'Both bookings are on the same physical trip');
    const seatAlloc1 = await BookingSeat.findOne({ bookingId: reuseBooking1._id });
    const seatAlloc2 = await BookingSeat.findOne({ bookingId: reuseBooking2._id });
    assert(seatAlloc1.seatNumber === '3A' && seatAlloc2.seatNumber === '3A', 'Both bookings allocated the same Seat 3A');
    assert(seatAlloc1.fromSequence === 0 && seatAlloc1.toSequence === 2, 'Booking 1 is for segment [0, 2)');
    assert(seatAlloc2.fromSequence === 2 && seatAlloc2.toSequence === 4, 'Booking 2 is for non-overlapping segment [2, 4)');

    const si3A = await SeatInventory.findById(seatAlloc1.seatInventoryId);
    assert(si3A.activeSegments.length >= 2, 'Seat 3A in SeatInventory has both active segments recorded');
  }

  console.log('\n====================================================================');
  console.log(`VERIFICATION RESULTS: ${passes} PASSED | ${fails} FAILED`);
  console.log('====================================================================\n');

  await mongoose.disconnect();
  if (fails > 0) process.exit(1);
}

verify().catch((err) => {
  console.error('Verification error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});

