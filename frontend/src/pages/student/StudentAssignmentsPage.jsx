import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentService, submissionService } from '../../services';
import { ClipboardList, ArrowRight, CheckCircle, Upload } from 'lucide-react';

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([assignmentService.list(), submissionService.list()])
      .then(([a, s]) => {
        setAssignments(a.data);
        setSubmissions(s.data);
      }).finally(() => setLoading(false));
  }, []);

  const subMap = {};
  submissions.forEach(s => { subMap[s.assignment_id] = s; });

  return (
    <div className="space-y-6">
      <h1 className="page-title">My Assignments</h1>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-dark-700" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No assignments published yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const sub = subMap[a.id];
            const isPast = a.deadline && new Date() > new Date(a.deadline);
            return (
              <Link key={a.id} to={`/student/assignments/${a.id}`}
                className="card-hover flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  sub ? 'bg-emerald-500/20' : isPast ? 'bg-red-500/20' : 'bg-amber-500/20'
                }`}>
                  {sub ? <CheckCircle size={18} className="text-emerald-400" /> : <Upload size={18} className={isPast ? 'text-red-400' : 'text-amber-400'} />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{a.title}</p>
                  <p className="text-sm text-gray-500">
                    {a.subject?.subject_name} • {a.maximum_marks} marks
                    {a.deadline && ` • Due ${new Date(a.deadline).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {sub ? (
                    <span className={`badge text-xs ${sub.status === 'published' ? 'badge-green' : 'badge-yellow'}`}>
                      {sub.status}
                    </span>
                  ) : isPast ? (
                    <span className="badge-red text-xs">Overdue</span>
                  ) : (
                    <span className="badge-yellow text-xs">Pending</span>
                  )}
                  <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
