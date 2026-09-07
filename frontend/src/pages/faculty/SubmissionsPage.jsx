import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { submissionService, evaluationService } from '../../services';
import { FileText, Play, Eye, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  submitted:        { label: 'Submitted',       cls: 'badge-blue',   icon: FileText },
  processing:       { label: 'Processing',      cls: 'badge-yellow', icon: Loader },
  ocr_processing:   { label: 'OCR Processing',  cls: 'badge-yellow', icon: Loader },
  ai_evaluating:    { label: 'AI Evaluating',   cls: 'badge-purple', icon: Loader },
  pending_review:   { label: 'Pending Review',  cls: 'badge-orange', icon: Clock },
  faculty_modified: { label: 'Faculty Modified',cls: 'badge-orange', icon: Clock },
  approved:         { label: 'Approved',        cls: 'badge-green',  icon: CheckCircle },
  published:        { label: 'Published',       cls: 'badge-green',  icon: CheckCircle },
  evaluation_failed:{ label: 'Eval Failed',     cls: 'badge-red',    icon: AlertCircle },
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState({});
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignment_id');

  const load = () => {
    const params = assignmentId ? { assignment_id: assignmentId } : {};
    submissionService.list(params)
      .then(r => setSubmissions(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [assignmentId]);

  const startEval = async (subId) => {
    setStarting(s => ({ ...s, [subId]: true }));
    try {
      await evaluationService.start(subId);
      toast.success('AI evaluation started');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start evaluation');
    } finally {
      setStarting(s => ({ ...s, [subId]: false }));
    }
  };

  const canStart = (status) => ['submitted', 'evaluation_failed'].includes(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Submissions</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          {assignmentId ? ' for selected assignment' : ''}
        </p>
      </div>

      <div className="table-container">
        <table className="table-base">
          <thead>
            <tr>
              <th>Student</th><th>Register No.</th><th>Assignment</th>
              <th>Submitted</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="h-8 bg-dark-700 animate-pulse rounded" /></td></tr>
              ))
            ) : submissions.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 py-12">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                No submissions yet
              </td></tr>
            ) : submissions.map(s => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.submitted;
              return (
                <tr key={s.id}>
                  <td className="font-medium text-white">{s.student_name}</td>
                  <td><span className="font-mono text-primary-400">{s.student_register}</span></td>
                  <td className="text-gray-400 max-w-[200px] truncate">{s.assignment_title}</td>
                  <td className="text-gray-400 text-xs">{new Date(s.submission_date).toLocaleString()}</td>
                  <td>
                    <span className={cfg.cls}>
                      {['processing', 'ocr_processing', 'ai_evaluating'].includes(s.status) && (
                        <Loader size={10} className="animate-spin mr-1 inline" />
                      )}
                      {cfg.label}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {canStart(s.status) && (
                        <button
                          onClick={() => startEval(s.id)}
                          disabled={starting[s.id]}
                          className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                        >
                          {starting[s.id] ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                          Evaluate
                        </button>
                      )}
                      {['pending_review', 'faculty_modified', 'approved', 'published'].includes(s.status) && (
                        <Link to={`/faculty/evaluate/${s.id}`} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                          <Eye size={12} />Review
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
