import { useState, useEffect } from 'react';
import { auditService } from '../../services';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    auditService.list({ page, per_page: 30 })
      .then(r => {
        setLogs(r.data.logs);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Audit Log</h1>
        <p className="text-gray-400 text-sm mt-0.5">{total} total audit events</p>
      </div>

      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="card h-14 animate-pulse bg-dark-700" />)
        ) : logs.length === 0 ? (
          <div className="card text-center py-16">
            <ScrollText size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No audit events yet</p>
          </div>
        ) : logs.map(log => (
          <div key={log.id} className="card py-3 flex items-start gap-4">
            <div className="w-9 h-9 bg-dark-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <ScrollText size={16} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200">{log.action}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{log.user_name || 'System'}</span>
                <span>•</span>
                <span>{new Date(log.timestamp).toLocaleString()}</span>
                {log.previous_value && log.new_value && (
                  <>
                    <span>•</span>
                    <span className="text-red-400">{log.previous_value}</span>
                    <span>→</span>
                    <span className="text-emerald-400">{log.new_value}</span>
                  </>
                )}
              </div>
              {log.reason && <p className="text-xs text-gray-500 mt-1 italic">Reason: {log.reason}</p>}
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary p-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
