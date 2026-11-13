const { Trip, AuditLog } = require('../models');

// Configurable boarding window buffer in minutes (default: 30 minutes)
const BOARDING_BUFFER_MINUTES = parseInt(process.env.BOARDING_BUFFER_MINUTES, 10) || 30;

/**
 * Automatically update trip lifecycle statuses based on departure and arrival times.
 * Transitions:
 * - scheduled -> boarding (within boarding buffer before departure)
 * - scheduled / boarding -> in_progress (after departureTime, before arrivalTime)
 * - in_progress / boarding / scheduled -> completed (after arrivalTime)
 * - cancelled trips are PERMANENT and NEVER overwritten.
 * 
 * @param {Object} options
 * @param {number} [options.boardingBufferMinutes]
 * @param {Date} [options.referenceTime]
 * @returns {Promise<Object>} Summary of transitions
 */
async function updateTripLifecycleStatuses({
  boardingBufferMinutes = BOARDING_BUFFER_MINUTES,
  referenceTime = new Date()
} = {}) {
  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  const boardingBufferMs = boardingBufferMinutes * 60 * 1000;

  // Query all active trips that are NOT cancelled and NOT already completed
  const activeTrips = await Trip.find({
    tripStatus: { $nin: ['cancelled', 'completed'] }
  });

  const transitions = [];
  let updatedCount = 0;

  for (const trip of activeTrips) {
    const depTime = new Date(trip.departureTime);
    const arrTime = new Date(trip.arrivalTime);
    const boardingStartTime = new Date(depTime.getTime() - boardingBufferMs);

    let nextStatus = trip.tripStatus;

    if (now >= arrTime) {
      // Arrival time has passed -> Trip completed
      nextStatus = 'completed';
    } else if (now >= depTime) {
      // Departed, journey underway -> In Progress
      nextStatus = 'in_progress';
    } else if (now >= boardingStartTime && trip.tripStatus === 'scheduled') {
      // Boarding window open -> Boarding
      nextStatus = 'boarding';
    }

    // Only update if there is a genuine lifecycle progression
    if (nextStatus !== trip.tripStatus) {
      const prevStatus = trip.tripStatus;
      trip.tripStatus = nextStatus;
      await trip.save();
      updatedCount++;

      const transitionRecord = {
        tripId: trip._id,
        busId: trip.busId,
        fromStatus: prevStatus,
        toStatus: nextStatus,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        timestamp: now.toISOString()
      };
      transitions.push(transitionRecord);

      console.log(
        `[TRIP LIFECYCLE] Trip ${trip._id} transitioned from '${prevStatus}' to '${nextStatus}'`
      );

      // Audit log
      await AuditLog.create({
        action: 'TRIP_STATUS_UPDATED',
        entityType: 'Trip',
        entityId: trip._id,
        description: `Automated lifecycle transition: status changed from '${prevStatus}' to '${nextStatus}' at ${now.toISOString()}`
      }).catch((err) =>
        console.warn('[Audit Warning] Could not record automated trip lifecycle transition:', err.message)
      );
    }
  }

  return {
    referenceTime: now.toISOString(),
    checkedCount: activeTrips.length,
    updatedCount,
    transitions
  };
}


let lifecycleTimer = null;

function startTripLifecycleScheduler({ intervalMs = 60 * 1000 } = {}) {
  // Prevent duplicate background timers
  if (lifecycleTimer) return lifecycleTimer;

  // Run initial pass
  updateTripLifecycleStatuses().catch((err) =>
    console.warn('[Trip Lifecycle Scheduler Warning]', err.message)
  );

  lifecycleTimer = setInterval(() => {
    updateTripLifecycleStatuses().catch((err) =>
      console.warn('[Trip Lifecycle Scheduler Warning]', err.message)
    );
  }, intervalMs);

  // Unref timer so it does not prevent node process from exiting cleanly in scripts
  if (lifecycleTimer.unref) {
    lifecycleTimer.unref();
  }

  return lifecycleTimer;
}

function stopTripLifecycleScheduler() {
  if (lifecycleTimer) {
    clearInterval(lifecycleTimer);
    lifecycleTimer = null;
  }
}

module.exports = {
  BOARDING_BUFFER_MINUTES,
  updateTripLifecycleStatuses,
  startTripLifecycleScheduler,
  stopTripLifecycleScheduler
};

