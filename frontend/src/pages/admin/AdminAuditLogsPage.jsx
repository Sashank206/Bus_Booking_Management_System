import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  User,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import InputField from '../../components/forms/InputField';
import EmptyState from '../../components/ui/EmptyState';
import useToast from '../../hooks/useToast';
import api from '../../services/api';

export default function AdminAuditLogsPage() {
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (actionFilter) {
        params.action = actionFilter;
      }

      const res = await api.get('/admin/audit-logs', { params });
      if (res && res.data) {
        setLogs(res.data.logs || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.pages || 1);
          setTotalCount(res.data.pagination.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openInspectModal = (log) => {
    setSelectedLog(log);
    setInspectModalOpen(true);
  };

  const actionBadgeColors = (action) => {
    if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('SUCCESS')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('REJECTED') || action.includes('SUSPENDED') || action.includes('DELETED')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('UPDATE') || action.includes('MODIFIED')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">
            {new Date(row.createdAt).toLocaleDateString()}
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            {new Date(row.createdAt).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      header: 'Action & Entity',
      key: 'action',
      render: (row) => (
        <div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${actionBadgeColors(
              row.action
            )}`}
          >
            {row.action}
          </span>
          {row.entityType && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Target: <span className="font-semibold">{row.entityType}</span>{' '}
              {row.entityId ? `(#${String(row.entityId).slice(-6)})` : ''}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Actor / User',
      key: 'userId',
      render: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-900">
            {row.userId?.name || 'System / Service'}
          </div>
          <div className="text-[11px] text-slate-500">
            {row.userId?.email || 'internal'} ({row.userId?.role || 'automated'})
          </div>
        </div>
      )
    },
    {
      header: 'Summary / Description',
      key: 'description',
      render: (row) => (
        <div className="text-xs text-slate-700 max-w-sm truncate" title={row.description}>
          {row.description || '—'}
        </div>
      )
    },
    {
      header: 'IP Address',
      key: 'ipAddress',
      render: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {row.ipAddress || '127.0.0.1'}
        </span>
      )
    },
    {
      header: 'Inspect',
      key: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Eye}
          onClick={() => openInspectModal(row)}
          title="Inspect Complete Audit Object"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            System Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable chronicle of critical user registrations, administrative approvals, route creations, and financial simulations.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={fetchLogs}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Action Types</option>
            <option value="USER_REGISTERED">User Registered</option>
            <option value="OPERATOR_REGISTERED">Operator Registered</option>
            <option value="OPERATOR_APPROVED">Operator Approved</option>
            <option value="OPERATOR_REJECTED">Operator Rejected</option>
            <option value="USER_STATUS_UPDATED">Account Status Updated</option>
            <option value="BUS_CREATED">Bus Created</option>
            <option value="STOP_CREATED">Stop Created</option>
            <option value="ROUTE_CREATED">Route Created</option>
            <option value="TRIP_CREATED">Trip Created</option>
            <option value="TRIP_CANCELLED">Trip Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing page <span className="font-bold text-slate-800">{page}</span> of{' '}
          <span className="font-bold text-slate-800">{totalPages}</span> ({totalCount} total events)
        </div>
      </div>

      {/* Logs Table */}
      <Card noPadding>
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyTitle="No Audit Events Recorded"
          emptyMessage="No system audit logs match your filter criteria."
        />

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-slate-600 font-semibold">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Inspect Modal */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title="Audit Event Details"
        subtitle="Cryptographically verified activity record"
        maxWidth="max-w-xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-slate-500 block text-[11px]">Action</span>
                <span className="font-bold text-slate-900">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Timestamp</span>
                <span className="font-mono text-slate-800">
                  {new Date(selectedLog.createdAt).toISOString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Actor</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.userId?.name || 'System'} ({selectedLog.userId?.email || 'N/A'})
                </span>
              </div>
              <div className="p-3 border border-slate-100 rounded-lg">
                <span className="text-slate-500 block mb-0.5">IP &amp; User Agent</span>
                <span className="font-mono text-slate-700">
                  {selectedLog.ipAddress || '127.0.0.1'}
                </span>
              </div>
            </div>

            <div className="p-3 border border-slate-100 rounded-lg">
              <span className="text-slate-500 block mb-1">Event Summary</span>
              <p className="text-slate-800 leading-relaxed">{selectedLog.description}</p>
            </div>

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setInspectModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
