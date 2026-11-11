import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  Building2,
  Mail,
  Phone,
  FileBadge,
  MapPin,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX
} from 'lucide-react';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InputField from '../../components/forms/InputField';
import EmptyState from '../../components/ui/EmptyState';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function AdminOperatorsPage() {
  const toast = useToast();

  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Reject Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetOperator, setTargetOperator] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Suspend/Activate ConfirmDialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    operator: null,
    targetStatus: 'suspended',
    loading: false
  });

  const fetchOperators = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/admin/operators', { params });
      if (res && res.data) {
        setOperators(res.data.operators || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load operators list.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOperators();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchOperators]);

  const handleApprove = async (op) => {
    try {
      await api.patch(`/admin/operators/${op._id}/approval`, {
        decision: 'approved'
      });
      toast.success(`Operator "${op.companyName}" has been approved!`);
      await fetchOperators();
    } catch (err) {
      toast.error(err.message || 'Failed to approve operator.');
    }
  };

  const handleOpenReject = (op) => {
    setTargetOperator(op);
    setRejectionReason('Documents or business accreditation could not be verified.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!targetOperator) return;

    try {
      setSubmittingReject(true);
      await api.patch(`/admin/operators/${targetOperator._id}/approval`, {
        decision: 'rejected',
        rejectionReason: rejectionReason.trim()
      });
      toast.success(`Operator "${targetOperator.companyName}" was rejected.`);
      setRejectModalOpen(false);
      setTargetOperator(null);
      await fetchOperators();
    } catch (err) {
      toast.error(err.message || 'Failed to reject operator.');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleToggleAccountStatus = async () => {
    const { operator, targetStatus } = confirmDialog;
    if (!operator || !operator.userId?._id) return;

    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));
      await api.patch(`/admin/users/${operator.userId._id}/status`, {
        status: targetStatus
      });
      toast.success(
        targetStatus === 'suspended'
          ? `Operator account suspended.`
          : `Operator account reactivated.`
      );
      setConfirmDialog({ isOpen: false, operator: null, targetStatus: 'suspended', loading: false });
      await fetchOperators();
    } catch (err) {
      toast.error(err.message || 'Failed to update account status.');
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const openDetails = (op) => {
    setSelectedOperator(op);
    setDetailsModalOpen(true);
  };

  const columns = [
    {
      header: 'Company / Agency',
      key: 'companyName',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.companyName}</div>
          <div className="text-xs font-mono text-slate-500">
            Reg: {row.registrationNumber}
          </div>
        </div>
      )
    },
    {
      header: 'Representative & Contact',
      key: 'contactPerson',
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{row.contactPerson}</div>
          <div className="text-slate-500 flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3 text-slate-400" />
            {row.userId?.email || '—'}
          </div>
          {row.userId?.phone && (
            <div className="text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              {row.userId.phone}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Approval Status',
      key: 'approvalStatus',
      render: (row) => <StatusBadge status={row.approvalStatus} />
    },
    {
      header: 'Account Status',
      key: 'accountStatus',
      render: (row) => (
        <StatusBadge status={row.userId?.accountStatus || 'active'} />
      )
    },
    {
      header: 'Registered',
      key: 'createdAt',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => openDetails(row)}
            title="View Details"
          />

          {row.approvalStatus === 'pending' && (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle}
                onClick={() => handleApprove(row)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={XCircle}
                onClick={() => handleOpenReject(row)}
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
              >
                Reject
              </Button>
            </>
          )}

          {row.approvalStatus === 'approved' && row.userId?.accountStatus === 'active' && (
            <Button
              variant="outline"
              size="sm"
              icon={UserX}
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  operator: row,
                  targetStatus: 'suspended',
                  loading: false
                })
              }
              className="text-amber-600 hover:bg-amber-50 border-amber-200"
            >
              Suspend
            </Button>
          )}

          {row.userId?.accountStatus === 'suspended' && (
            <Button
              variant="primary"
              size="sm"
              icon={UserCheck}
              onClick={() =>
                setConfirmDialog({
                  isOpen: true,
                  operator: row,
                  targetStatus: 'active',
                  loading: false
                })
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Activate
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Operator Management &amp; Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Vet transport agencies, inspect business credentials, and control trip publishing privileges.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={fetchOperators}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Operators' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'approved', label: 'Approved' },
            { id: 'rejected', label: 'Rejected' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <InputField
            placeholder="Search company, reg #, email..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Operators Data Table */}
      <Card noPadding>
        <DataTable
          columns={columns}
          data={operators}
          loading={loading}
          emptyTitle="No Operators Found"
          emptyMessage={
            statusFilter !== 'all'
              ? `No operators found with status "${statusFilter}".`
              : 'No bus operators have registered on the platform yet.'
          }
        />
      </Card>

      {/* Operator Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Operator Business Profile"
        subtitle="Submitted business accreditation and contact information"
        maxWidth="max-w-xl"
      >
        {selectedOperator && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-500 block text-[11px]">Company Name</span>
                <span className="font-bold text-sm text-slate-900">
                  {selectedOperator.companyName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px] mb-1">Status</span>
                <StatusBadge status={selectedOperator.approvalStatus} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Registration / GST</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedOperator.registrationNumber}
                </span>
              </div>
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Contact Person</span>
                <span className="font-semibold text-slate-800">
                  {selectedOperator.contactPerson}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">User Email</span>
                <span className="font-semibold text-slate-800">
                  {selectedOperator.userId?.email || '—'}
                </span>
              </div>
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Contact Phone</span>
                <span className="font-semibold text-slate-800">
                  {selectedOperator.userId?.phone || '—'}
                </span>
              </div>
            </div>

            {selectedOperator.address && (
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Registered Address</span>
                <span className="text-slate-700">
                  {typeof selectedOperator.address === 'string'
                    ? selectedOperator.address
                    : `${selectedOperator.address.street || ''}, ${selectedOperator.address.city || ''}, ${selectedOperator.address.state || ''} ${selectedOperator.address.pincode || ''}`}
                </span>
              </div>
            )}

            {selectedOperator.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                <span className="font-semibold block mb-0.5">Rejection Reason:</span>
                {selectedOperator.rejectionReason}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Operator Application"
        subtitle="Provide a transparent reason for declining this business profile"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Explain why the application is rejected..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setRejectModalOpen(false)}
              disabled={submittingReject}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              type="submit"
              loading={submittingReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend / Activate Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, operator: null, targetStatus: 'suspended', loading: false })
        }
        onConfirm={handleToggleAccountStatus}
        title={
          confirmDialog.targetStatus === 'suspended'
            ? 'Suspend Operator Account'
            : 'Reactivate Operator Account'
        }
        message={
          confirmDialog.targetStatus === 'suspended'
            ? `Are you sure you want to suspend "${confirmDialog.operator?.companyName}"? Their login access and active trip sales will be halted.`
            : `Are you sure you want to reactivate "${confirmDialog.operator?.companyName}"? They will regain access to their operator dashboard.`
        }
        confirmText={
          confirmDialog.targetStatus === 'suspended' ? 'Suspend Account' : 'Reactivate'
        }
        confirmVariant={
          confirmDialog.targetStatus === 'suspended' ? 'danger' : 'primary'
        }
        loading={confirmDialog.loading}
      />
    </div>
  );
}
