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
  ChevronRight,
  ShieldAlert,
  Server
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

  const actionBadgeColors = (action = '') => {
    if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('SUCCESS')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (action.includes('REJECTED') || action.includes('SUSPENDED') || action.includes('DELETED')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (action.includes('UPDATE') || action.includes('MODIFIED')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-slate-900">
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
            className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black border tracking-wide uppercase ${actionBadgeColors(
              row.action
            )}`}
          >
            {row.action}
          </span>
          {row.entityType && (
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Target: <span className="font-bold text-slate-800">{row.entityType}</span>{' '}
              {row.entityId ? <span className="font-mono text-slate-400">({String(row.entityId).slice(-6)})</span> : ''}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Actor / Identity',
      key: 'userId',
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold text-slate-900">
            {row.userId?.name || 'System / Daemon'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {row.userId?.email || 'internal'} <span className="text-slate-400">({row.userId?.role || 'automated'})</span>
          </div>
        </div>
      )
    },
    {
      header: 'Audit Description',
      key: 'description',
      render: (row) => (
        <div className="text-xs text-slate-700 max-w-sm font-medium line-clamp-2" title={row.description}>
          {row.description || '—'}
        </div>
      )
    },
    {
      header: 'Host IP',
      key: 'ipAddress',
      render: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
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
          className="text-slate-600 hover:text-[#D92D3A]"
          title="Inspect Complete Audit Object"
        >
          View
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold tracking-wide uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D92D3A]" />
            BusGo Governance &amp; Compliance
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            System Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cryptographically logged events of user registrations, operator vetting, route edits, and simulated payments.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          icon={RefreshCw}
          onClick={fetchLogs}
          loading={loading}
          className="self-start sm:self-auto font-bold border-slate-300"
        >
          Refresh Log
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-3.5 py-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] cursor-pointer"
          >
            <option value="">All Audit Action Types</option>
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

        <div className="text-xs text-slate-500 font-medium">
          Showing page <span className="font-black text-slate-900">{page}</span> of{' '}
          <span className="font-black text-slate-900">{totalPages}</span>{' '}
          <span className="text-slate-400">({totalCount} logged events)</span>
        </div>
      </div>

      {/* Logs Table */}
      <Card noPadding className="overflow-hidden border-slate-200 rounded-2xl shadow-xs">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyTitle="No Audit Events Recorded"
          emptyMessage="No system audit logs match your filter criteria."
        />

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="font-bold border-slate-300"
            >
              Previous
            </Button>
            <span className="text-xs text-slate-700 font-bold">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="font-bold border-slate-300"
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
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Action Event</span>
                <span className="font-black text-slate-900 text-sm">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider">Timestamp</span>
                <span className="font-mono font-semibold text-slate-800 text-[11px]">
                  {new Date(selectedLog.createdAt).toISOString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider mb-1">Actor Identity</span>
                <p className="font-bold text-slate-900">{selectedLog.userId?.name || 'System / Service'}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{selectedLog.userId?.email || 'automated'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                  Role: {selectedLog.userId?.role || 'SYSTEM'}
                </span>
              </div>

              <div className="p-3.5 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider mb-1">Network &amp; Client</span>
                <p className="font-mono font-bold text-slate-800">IP: {selectedLog.ipAddress || '127.0.0.1'}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2" title={selectedLog.userAgent}>
                  UA: {selectedLog.userAgent || 'Antigravity Internal Client'}
                </p>
              </div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-xl bg-white">
              <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider mb-1">Event Summary</span>
              <p className="text-slate-900 font-medium leading-relaxed">{selectedLog.description}</p>
            </div>

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <span className="text-slate-400 block text-[10px] font-black uppercase tracking-wider mb-1.5">
                  Payload Metadata (JSON)
                </span>
                <div className="p-4 bg-[#171C2B] rounded-xl text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-52 border border-slate-800">
                  <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setInspectModalOpen(false)}
                className="font-bold border-slate-300"
              >
                Close Audit Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
