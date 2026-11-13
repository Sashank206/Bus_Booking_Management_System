const {
  Trip,
  SeatInventory,
  Booking,
  BookingSeat,
  Payment,
  Refund,
  Cancellation,
  AuditLog
} = require('../models');
const ArchivedSeatInventory = require('../models/ArchivedSeatInventory');

// Configurable retention period in days (default: 180 days)
const DEFAULT_RETENTION_DAYS = parseInt(process.env.SEAT_INVENTORY_RETENTION_DAYS, 10) || 180;

/**
 * 1. Clean up expired temporary seat holds safely.
 * Releases expired held segments from SeatInventory, marks BookingSeats as 'expired',
 * and transitions pending_payment Bookings with expired holds to 'expired'.
 * 
 * @param {Object} [options]
 * @param {Date} [options.referenceTime]
 * @returns {Promise<Object>} Summary of released holds
 */
async function cleanupExpiredHolds({ referenceTime = new Date() } = {}) {
  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);

  // Find SeatInventories containing at least one expired held segment
  const inventoriesWithExpiredHolds = await SeatInventory.find({
    'activeSegments.status': 'held',
    'activeSegments.holdExpiresAt': { $lte: now }
  });

  let releasedSegmentsCount = 0;
  const affectedBookingSeatIds = [];

  for (const si of inventoriesWithExpiredHolds) {
    if (Array.isArray(si.activeSegments)) {
      const initialCount = si.activeSegments.length;
      const expiredSegs = si.activeSegments.filter(
        (seg) => seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now
      );

      expiredSegs.forEach((seg) => {
        if (seg.bookingSeatId) affectedBookingSeatIds.push(seg.bookingSeatId);
      });

      si.activeSegments = si.activeSegments.filter(
        (seg) => !(seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now)
      );

      const removed = initialCount - si.activeSegments.length;
      if (removed > 0) {
        releasedSegmentsCount += removed;
        await si.save();
      }
    }
  }

  // Update corresponding BookingSeat allocations to 'expired'
  let expiredBookingSeatsCount = 0;
  if (affectedBookingSeatIds.length > 0) {
    const updateBsRes = await BookingSeat.updateMany(
      {
        _id: { $in: affectedBookingSeatIds },
        allocationStatus: 'held'
      },
      { allocationStatus: 'expired' }
    );
    expiredBookingSeatsCount = updateBsRes.modifiedCount || updateBsRes.nModified || affectedBookingSeatIds.length;
  }

  // Also query any orphan BookingSeat held records whose holdExpiresAt passed
  const orphanSeats = await BookingSeat.find({
    allocationStatus: 'held',
    holdExpiresAt: { $lte: now }
  });
  if (orphanSeats.length > 0) {
    await BookingSeat.updateMany(
      { _id: { $in: orphanSeats.map((s) => s._id) } },
      { allocationStatus: 'expired' }
    );
    expiredBookingSeatsCount += orphanSeats.length;
  }

  // Transition Bookings that remain in 'pending_payment' with all seats expired
  let expiredBookingsCount = 0;
  const pendingBookings = await Booking.find({
    bookingStatus: 'pending_payment'
  });

  for (const b of pendingBookings) {
    const seats = await BookingSeat.find({ bookingId: b._id });
    if (seats.length > 0 && seats.every((s) => s.allocationStatus === 'expired' || s.allocationStatus === 'released')) {
      b.bookingStatus = 'expired';
      await b.save();
      expiredBookingsCount++;
    }
  }

  if (releasedSegmentsCount > 0 || expiredBookingsCount > 0) {
    console.log(
      `[INVENTORY CLEANUP] Released ${releasedSegmentsCount} expired held segment(s), expired ${expiredBookingSeatsCount} seat(s), expired ${expiredBookingsCount} booking(s)`
    );

    await AuditLog.create({
      action: 'EXPIRED_HOLDS_CLEANED',
      entityType: 'SeatInventory',
      description: `Automated cleanup released ${releasedSegmentsCount} expired hold(s) across inventory records`
    }).catch(() => {});
  }

  return {
    referenceTime: now.toISOString(),
    releasedSegmentsCount,
    releasedHoldsCount: releasedSegmentsCount,
    expiredBookingSeatsCount,
    expiredBookingsCount
  };
}

/**
 * 2. Safely archive SeatInventory for completed trips past the retention period.
 * 
 * Safety Rules:
 * - Only completed trips with arrivalTime + retentionDays <= now.
 * - Never archive if active holds exist.
 * - Never archive if pending bookings exist.
 * - Never archive if pending payments exist.
 * - Never archive if pending/processing refunds exist.
 * - Supports dryRun mode (simulates and reports without deleting).
 * - Archival is idempotent and prevents duplicates.
 * 
 * @param {Object} [options]
 * @param {number} [options.retentionDays]
 * @param {boolean} [options.dryRun]
 * @param {Date} [options.referenceTime]
 * @returns {Promise<Object>}
 */
async function archiveEligibleInventories({
  retentionDays = DEFAULT_RETENTION_DAYS,
  dryRun = false,
  referenceTime = new Date()
} = {}) {
  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(now.getTime() - retentionMs);

  // Find candidate completed trips that arrived on or before the cutoff date
  const candidateTrips = await Trip.find({
    tripStatus: 'completed',
    arrivalTime: { $lte: cutoffDate }
  }).sort({ arrivalTime: 1 });

  const eligibleTrips = [];
  const skippedTrips = [];
  let eligibleInventoriesCount = 0;
  let archivedInventoriesCount = 0;

  for (const trip of candidateTrips) {
    const tripId = trip._id;

    // Safety Check 1: Any active unexpired holds on this trip?
    const hasActiveHold = await SeatInventory.findOne({
      tripId,
      'activeSegments.status': 'held',
      'activeSegments.holdExpiresAt': { $gt: now }
    });
    if (hasActiveHold) {
      skippedTrips.push({
        tripId,
        reason: 'Active unexpired seat hold currently present on trip'
      });
      continue;
    }

    // Safety Check 2: Any unresolved pending bookings on this trip?
    const hasPendingBooking = await Booking.findOne({
      tripId,
      bookingStatus: { $in: ['pending_payment', 'pending'] }
    });
    if (hasPendingBooking) {
      skippedTrips.push({
        tripId,
        reason: 'Trip has unresolved pending payment booking(s)'
      });
      continue;
    }

    // Fetch all bookings for this trip to check financial and refund settlements
    const tripBookings = await Booking.find({ tripId }).select('_id');
    const tripBookingIds = tripBookings.map((b) => b._id);

    if (tripBookingIds.length > 0) {
      // Safety Check 3: Any pending payments?
      const hasPendingPayment = await Payment.findOne({
        bookingId: { $in: tripBookingIds },
        paymentStatus: 'pending'
      });
      if (hasPendingPayment) {
        skippedTrips.push({
          tripId,
          reason: 'Unsettled pending payment record exists for trip'
        });
        continue;
      }

      // Safety Check 4: Any unsettled / in-flight refunds?
      const hasUnsettledRefund = await Refund.findOne({
        bookingId: { $in: tripBookingIds },
        refundStatus: { $in: ['pending', 'processing'] }
      });
      if (hasUnsettledRefund) {
        skippedTrips.push({
          tripId,
          reason: 'Outstanding refund liability (pending/processing) depends on this trip'
        });
        continue;
      }
    }

    // Trip is verified safe for archival
    const inventories = await SeatInventory.find({ tripId });
    if (!inventories || inventories.length === 0) {
      // Inventory already archived or empty
      continue;
    }

    eligibleTrips.push({
      tripId,
      busId: trip.busId,
      arrivalTime: trip.arrivalTime,
      seatCount: inventories.length
    });
    eligibleInventoriesCount += inventories.length;

    // If dry-run, do not write or delete
    if (dryRun) {
      continue;
    }

    // Live archival: copy to ArchivedSeatInventory idempotently
    for (const si of inventories) {
      await ArchivedSeatInventory.findOneAndUpdate(
        { tripId: si.tripId, seatNumber: si.seatNumber },
        {
          $set: {
            tripId: si.tripId,
            busId: trip.busId,
            seatNumber: si.seatNumber,
            seatType: si.seatType,
            originalSeatInventoryId: si._id,
            activeSegments: si.activeSegments || [],
            archivedAt: now
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Remove from active SeatInventory collection once safely archived
    await SeatInventory.deleteMany({ tripId });
    archivedInventoriesCount += inventories.length;

    console.log(
      `[INVENTORY ARCHIVE] Safely archived ${inventories.length} seat inventories for completed trip ${tripId} (arrived ${trip.arrivalTime.toISOString()})`
    );

    await AuditLog.create({
      action: 'INVENTORY_ARCHIVED',
      entityType: 'SeatInventory',
      entityId: tripId,
      description: `Safely archived ${inventories.length} seat records for completed trip arriving on ${trip.arrivalTime.toISOString()}`
    }).catch(() => {});
  }

  return {
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    referenceTime: now.toISOString(),
    dryRun,
    candidatesFound: candidateTrips.length,
    eligibleTripsCount: eligibleTrips.length,
    eligibleInventoriesCount,
    archivedInventoriesCount,
    archivedSeatsCount: archivedInventoriesCount,
    skippedTripsCount: skippedTrips.length,
    skippedTrips,
    eligibleTrips
  };
}

/**
 * 3. Get storage and retention metrics
 */
async function getInventoryStorageStats(options = {}) {
  const opts = typeof options === 'number' ? { retentionDays: options } : (options || {});
  const {
    retentionDays = DEFAULT_RETENTION_DAYS,
    referenceTime = new Date()
  } = opts;
  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(now.getTime() - retentionMs);

  const [
    totalActiveInventories,
    archivedInventoriesCount,
    expiredHoldsCount,
    completedTripsPastCutoff
  ] = await Promise.all([
    SeatInventory.countDocuments(),
    ArchivedSeatInventory.countDocuments().catch(() => 0),
    SeatInventory.countDocuments({
      'activeSegments.status': 'held',
      'activeSegments.holdExpiresAt': { $lte: now }
    }),
    Trip.countDocuments({
      tripStatus: 'completed',
      arrivalTime: { $lte: cutoffDate }
    })
  ]);

  return {
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    referenceTime: now.toISOString(),
    totalActiveInventories,
    activeSeatInventories: totalActiveInventories,
    archivedInventoriesCount,
    archivedSeatInventories: archivedInventoriesCount,
    expiredHoldsCount,
    expiredHeldSegmentsCount: expiredHoldsCount,
    completedTripsPastCutoff,
    completedTripsPastRetention: completedTripsPastCutoff
  };
}

let inventoryTimer = null;

function startInventoryLifecycleScheduler({ intervalMs = 60 * 60 * 1000 } = {}) {
  if (inventoryTimer) return inventoryTimer;

  // Run cleanup and archival
  const executeCycle = async () => {
    try {
      await cleanupExpiredHolds();
      await archiveEligibleInventories({ retentionDays: DEFAULT_RETENTION_DAYS, dryRun: false });
    } catch (err) {
      console.warn('[Inventory Lifecycle Scheduler Warning]', err.message);
    }
  };

  executeCycle();
  inventoryTimer = setInterval(executeCycle, intervalMs);

  if (inventoryTimer.unref) {
    inventoryTimer.unref();
  }

  return inventoryTimer;
}

function stopInventoryLifecycleScheduler() {
  if (inventoryTimer) {
    clearInterval(inventoryTimer);
    inventoryTimer = null;
  }
}

module.exports = {
  DEFAULT_RETENTION_DAYS,
  cleanupExpiredHolds,
  archiveEligibleInventories,
  getInventoryStorageStats,
  startInventoryLifecycleScheduler,
  stopInventoryLifecycleScheduler
};
