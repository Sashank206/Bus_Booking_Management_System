/**
 * BusGo Cancellation Policy Engine
 * Supports tiered cancellation deductions based on time remaining before scheduled journey departure.
 */

// In-memory policy state with sensible defaults
let activePolicy = {
  cutoffHours: 2, // Within 2 hours of departure, tickets are non-cancellable (0% refund)
  policyName: 'Standard BusGo Cancellation & Refund Policy',
  lastUpdated: new Date().toISOString(),
  tiers: [
    {
      minHoursBeforeDeparture: 24,
      cancellationChargePercent: 10,
      refundPercent: 90,
      description: 'More than 24 hours before departure: 10% deduction, 90% refund'
    },
    {
      minHoursBeforeDeparture: 12,
      cancellationChargePercent: 25,
      refundPercent: 75,
      description: 'Between 12 and 24 hours before departure: 25% deduction, 75% refund'
    },
    {
      minHoursBeforeDeparture: 2,
      cancellationChargePercent: 50,
      refundPercent: 50,
      description: 'Between 2 and 12 hours before departure: 50% deduction, 50% refund'
    },
    {
      minHoursBeforeDeparture: 0,
      cancellationChargePercent: 100,
      refundPercent: 0,
      description: 'Less than 2 hours before departure: Non-cancellable / 0% refund'
    }
  ]
};

/**
 * Get active cancellation policy
 */
function getCancellationPolicy() {
  return JSON.parse(JSON.stringify(activePolicy));
}

/**
 * Update cancellation policy (Admin operation)
 */
function updateCancellationPolicy(newPolicy) {
  if (!newPolicy || typeof newPolicy !== 'object') {
    throw new Error('Invalid policy object provided');
  }

  const cutoffHours = Number(newPolicy.cutoffHours ?? activePolicy.cutoffHours);
  if (isNaN(cutoffHours) || cutoffHours < 0) {
    throw new Error('Cutoff hours must be a non-negative number');
  }

  if (Array.isArray(newPolicy.tiers) && newPolicy.tiers.length > 0) {
    for (const t of newPolicy.tiers) {
      if (t.minHoursBeforeDeparture == null || t.minHoursBeforeDeparture < 0) {
        throw new Error('Tier minHoursBeforeDeparture must be a non-negative number');
      }
      if (t.cancellationChargePercent == null || t.cancellationChargePercent < 0 || t.cancellationChargePercent > 100) {
        throw new Error('Cancellation charge percent must be between 0 and 100');
      }
      if (t.refundPercent == null || t.refundPercent < 0 || t.refundPercent > 100) {
        throw new Error('Refund percent must be between 0 and 100');
      }
      if (t.cancellationChargePercent + t.refundPercent !== 100) {
        throw new Error('Cancellation charge percent and refund percent must total exactly 100%');
      }
    }
    // Sort tiers descending by minHoursBeforeDeparture
    const sortedTiers = [...newPolicy.tiers].sort((a, b) => b.minHoursBeforeDeparture - a.minHoursBeforeDeparture);
    activePolicy.tiers = sortedTiers;
  }

  activePolicy.cutoffHours = cutoffHours;
  if (newPolicy.policyName) {
    activePolicy.policyName = String(newPolicy.policyName).trim();
  }
  activePolicy.lastUpdated = new Date().toISOString();

  return getCancellationPolicy();
}

/**
 * Calculate cancellation charge and refund for a given seat and departure time
 *
 * @param {Date|string} departureTime - Scheduled departure time of the journey / boarding stop
 * @param {number} seatFare - Original fare of the seat allocation
 * @param {Date} [referenceTime=new Date()] - Reference timestamp (defaults to current time)
 */
function calculateSeatCancellation(departureTime, seatFare, referenceTime = new Date()) {
  const depTime = new Date(departureTime).getTime();
  const refTime = new Date(referenceTime).getTime();
  const diffMs = depTime - refTime;
  const hoursUntilDeparture = diffMs / (1000 * 60 * 60);

  const policy = getCancellationPolicy();

  // If journey has already departed or is within cutoff
  if (hoursUntilDeparture < policy.cutoffHours) {
    return {
      isEligible: false,
      reason: `Cancellation is not permitted within ${policy.cutoffHours} hours of departure (departure in ${Math.max(0, hoursUntilDeparture).toFixed(1)} hrs).`,
      hoursUntilDeparture: Math.max(0, Number(hoursUntilDeparture.toFixed(2))),
      cancellationChargePercent: 100,
      refundPercent: 0,
      cancellationCharge: seatFare,
      refundAmount: 0,
      policySnapshot: {
        ...policy,
        matchedTier: {
          minHoursBeforeDeparture: 0,
          cancellationChargePercent: 100,
          refundPercent: 0,
          description: 'Non-cancellable within cutoff'
        },
        calculatedAt: new Date().toISOString()
      }
    };
  }

  // Find matching tier
  let matchedTier = policy.tiers[policy.tiers.length - 1]; // fallback lowest tier
  for (const tier of policy.tiers) {
    if (hoursUntilDeparture >= tier.minHoursBeforeDeparture) {
      matchedTier = tier;
      break;
    }
  }

  const chargePercent = matchedTier.cancellationChargePercent;
  const refundPercent = matchedTier.refundPercent;

  const cancellationCharge = Math.min(seatFare, Math.round((seatFare * chargePercent) / 100));
  const refundAmount = Math.max(0, seatFare - cancellationCharge);

  return {
    isEligible: true,
    hoursUntilDeparture: Number(hoursUntilDeparture.toFixed(2)),
    cancellationChargePercent: chargePercent,
    refundPercent,
    cancellationCharge,
    refundAmount,
    policySnapshot: {
      ...policy,
      matchedTier,
      hoursUntilDeparture: Number(hoursUntilDeparture.toFixed(2)),
      calculatedAt: new Date().toISOString()
    }
  };
}

module.exports = {
  getCancellationPolicy,
  updateCancellationPolicy,
  calculateSeatCancellation
};

