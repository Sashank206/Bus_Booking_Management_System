import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import useToast from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

export default function AdminBookingsRefundsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('payments'); // 'payments', 'cancellations', 'refunds', 'policy'

  // Data states
  const [payments, setPayments] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);

  // Status simulation modal
  const [simulatingRefund, setSimulatingRefund] = useState(null);
  const [targetRefundStatus, setTargetRefundStatus] = useState('completed');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Policy editing state
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payments?limit=50');
      setPayments(res.data?.payments || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch payment records.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCancellations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/cancellations?limit=50');
      setCancellations(res.data?.cancellations || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch cancellations.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/refunds?limit=50');
      setRefunds(res.data?.refunds || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch refund records.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/cancellation-policy');
      setPolicy(res.data?.policy || null);
      setEditingPolicy(JSON.parse(JSON.stringify(res.data?.policy || {})));
    } catch (err) {
      toast.error(err.message || 'Failed to fetch cancellation policy.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments();
    if (activeTab === 'cancellations') fetchCancellations();
    if (activeTab === 'refunds') fetchRefunds();
    if (activeTab === 'policy') fetchPolicy();
  }, [activeTab, fetchPayments, fetchCancellations, fetchRefunds, fetchPolicy]);

  const handleUpdateRefundStatus = async () => {
    if (!simulatingRefund) return;
    setStatusUpdating(true);
    try {
      await api.post(`/admin/refunds/${simulatingRefund._id}/simulate`, {
        status: targetRefundStatus,
        reason: 'Administrative simulation from control dashboard'
      });
      toast.success(`Refund status updated to '${targetRefundStatus}'.`);
      setSimulatingRefund(null);
      fetchRefunds();
    } catch (err) {
      toast.error(err.message || 'Failed to update refund status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      const res = await api.put('/admin/cancellation-policy', editingPolicy);
      setPolicy(res.data?.policy);
      setEditingPolicy(JSON.parse(JSON.stringify(res.data?.policy)));
      toast.success('Cancellation policy updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950 text-white rounded-2xl p-6 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-purple-400 block mb-1">
            Financial &amp; Risk Governance
          </span>
          <h1 className="text-2xl font-black tracking-tight">Payments, Cancellations &amp; Refunds</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Audit simulated transactions, inspect cancellation charges, process refunds, and configure fare deduction policies.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={() => {
            if (activeTab === 'payments') fetchPayments();
            if (activeTab === 'cancellations') fetchCancellations();
            if (activeTab === 'refunds') fetchRefunds();
            if (activeTab === 'policy') fetchPolicy();
          }}
          disabled={loading}
        >
          Refresh Data
        </Button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { id: 'payments', label: 'Payments Log', icon: CreditCard },
          { id: 'cancellations', label: 'Cancellations Log', icon: RotateCcw },
          { id: 'refunds', label: 'Refund Processing', icon: DollarSign },
          { id: 'policy', label: 'Cancellation Policy Engine', icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Payments */}
      {activeTab === 'payments' && (
        <Card title="Payment Records" subtitle="Simulated transactions across all customer bookings">
          {loading ? (
            <LoadingSkeleton count={4} />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments recorded"
              description="No payments have been simulated yet in the system."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Reference / PNR</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900 block">
                          {p.paymentReference || 'N/A'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          PNR: {p.bookingId?.pnr || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">
                          {p.bookingId?.userId?.name || 'Customer'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {p.bookingId?.userId?.email || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                        ₹{p.paymentAmount}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600">
                        {p.paymentMethod?.replace('_', ' ') || 'card'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={p.paymentStatus} />
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(p.paidAt || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Cancellations */}
      {activeTab === 'cancellations' && (
        <Card title="Cancellation Requests" subtitle="Deduction breakdowns and audit logs">
          {loading ? (
            <LoadingSkeleton count={4} />
          ) : cancellations.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No cancellations recorded"
              description="No booking or seat cancellations have been processed yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">PNR</th>
                    <th className="py-2.5 px-3">Requested By</th>
                    <th className="py-2.5 px-3">Deduction Charge</th>
                    <th className="py-2.5 px-3">Refund Amount</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {cancellations.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-black text-slate-900">
                        {c.bookingId?.pnr || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">
                          {c.requestedBy?.name || 'Customer'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {c.requestedBy?.email || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-rose-600 font-bold">
                        ₹{c.totalCancellationCharge || 0}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-black text-sm">
                        ₹{c.totalRefundAmount || 0}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {c.cancellationReason || 'Standard customer cancellation'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(c.requestedAt || c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Refunds */}
      {activeTab === 'refunds' && (
        <Card
          title="Simulated Refunds Queue"
          subtitle="View and simulate payment gateway refund fulfillment states"
        >
          {loading ? (
            <LoadingSkeleton count={4} />
          ) : refunds.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No refund records"
              description="No refund records generated yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-3">Refund Ref</th>
                    <th className="py-2.5 px-3">Original PNR / Payment</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Processed At</th>
                    <th className="py-2.5 px-3 text-right">Simulation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {refunds.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {r.refundReference || 'SIM_REF'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900 block">
                          PNR: {r.cancellationId?.bookingId?.pnr || '—'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Txn: {r.paymentId?.paymentReference || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-emerald-700 text-sm">
                        ₹{r.refundAmount}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={r.refundStatus} />
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(r.processedAt || r.createdAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSimulatingRefund(r);
                            setTargetRefundStatus(r.refundStatus === 'completed' ? 'failed' : 'completed');
                          }}
                        >
                          Simulate Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Policy Engine */}
      {activeTab === 'policy' && editingPolicy && (
        <Card
          title="Cancellation Policy Rules Engine"
          subtitle="Adjust pre-departure cutoff thresholds and deduction tiers"
        >
          <form onSubmit={handleSavePolicy} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Policy Display Name
              </label>
              <input
                type="text"
                value={editingPolicy.policyName || ''}
                onChange={(e) =>
                  setEditingPolicy({ ...editingPolicy, policyName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mandatory Departure Cutoff Window (Hours)
              </label>
              <input
                type="number"
                min="0"
                max="48"
                value={editingPolicy.cutoffHours ?? 2}
                onChange={(e) =>
                  setEditingPolicy({
                    ...editingPolicy,
                    cutoffHours: parseInt(e.target.value, 10) || 0
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                required
              />
              <span className="text-[11px] text-slate-500 block">
                Within this cutoff window before journey departure, bookings are strictly non-cancellable (0% refund).
              </span>
            </div>

            {/* Tiers List */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Tiered Percentage Deductions
              </label>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                {(editingPolicy.tiers || []).map((tier, idx) => (
                  <div key={idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">{tier.description}</span>
                      <span className="text-[11px] text-slate-500">
                        Threshold: &gt; {tier.minHoursBeforeDeparture} hours before departure
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">Deduction %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tier.cancellationChargePercent}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                            const updatedTiers = [...editingPolicy.tiers];
                            updatedTiers[idx].cancellationChargePercent = val;
                            updatedTiers[idx].refundPercent = 100 - val;
                            setEditingPolicy({ ...editingPolicy, tiers: updatedTiers });
                          }}
                          className="w-16 px-2 py-1 rounded border border-slate-300 font-mono font-bold text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-emerald-700 font-bold">
                          Refund: {tier.refundPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="md"
              loading={savingPolicy}
              disabled={savingPolicy}
            >
              Save Policy Rules
            </Button>
          </form>
        </Card>
      )}

      {/* Simulate Refund Status Modal */}
      {simulatingRefund && (
        <Modal
          isOpen={!!simulatingRefund}
          onClose={() => setSimulatingRefund(null)}
          title="Simulate Gateway Refund Status"
          subtitle={`Refund Reference: ${simulatingRefund.refundReference}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Select the simulated bank or gateway payout state to assign to this refund of{' '}
              <strong className="text-emerald-700 font-mono">₹{simulatingRefund.refundAmount}</strong>:
            </p>

            <div className="space-y-2">
              {['completed', 'failed', 'processing'].map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer capitalize font-bold transition-colors ${
                    targetRefundStatus === s
                      ? 'border-purple-600 bg-purple-50 text-purple-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="refundStatus"
                    value={s}
                    checked={targetRefundStatus === s}
                    onChange={() => setTargetRefundStatus(s)}
                    className="text-purple-600"
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSimulatingRefund(null)}
                disabled={statusUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleUpdateRefundStatus}
                loading={statusUpdating}
              >
                Confirm Simulation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

