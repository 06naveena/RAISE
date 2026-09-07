import { useState, useEffect } from 'react';
import { resultService } from '../../services';
import { Download, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    resultService.list({ page, per_page: 20, search })
      .then(r => {
        setResults(r.data.results);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await resultService.exportExcel();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'results.xlsx';
      link.click();
      toast.success('Excel exported!');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Get all unique rubric names
  const allRubrics = [...new Set(results.flatMap(r => Object.keys(r.rubric_marks || {})))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Results</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} approved results</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-success flex items-center gap-2">
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by student name or register number..."
          className="input-field pl-10"
        />
      </div>

      <div className="table-container">
        <table className="table-base">
          <thead>
            <tr>
              <th>Reg. No.</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Assignment</th>
              {allRubrics.slice(0, 5).map(r => <th key={r} className="max-w-[80px] truncate" title={r}>{r.slice(0, 12)}</th>)}
              <th>Total</th>
              <th>Max</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={9}><div className="h-8 bg-dark-700 animate-pulse rounded" /></td></tr>
              ))
            ) : results.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-500 py-12">No approved results yet</td></tr>
            ) : results.map(r => (
              <tr key={r.submission_id}>
                <td><span className="font-mono text-primary-400">{r.register_number}</span></td>
                <td className="font-medium text-white">{r.student_name}</td>
                <td className="text-gray-400">{r.subject_code}</td>
                <td className="text-gray-400 max-w-[120px] truncate" title={r.assignment_title}>{r.assignment_title}</td>
                {allRubrics.slice(0, 5).map(rn => (
                  <td key={rn} className="text-center">
                    <span className="font-mono text-sm">
                      {r.rubric_marks?.[rn]?.final_marks?.toFixed(1) ?? '—'}
                    </span>
                  </td>
                ))}
                <td>
                  <span className="font-bold text-emerald-400">
                    {r.total_faculty_marks?.toFixed(1) ?? '—'}
                  </span>
                </td>
                <td className="text-gray-500">{r.maximum_marks}</td>
                <td>
                  <span className={r.status === 'published' ? 'badge-green' : 'badge-yellow'}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {pages} ({total} results)</p>
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
