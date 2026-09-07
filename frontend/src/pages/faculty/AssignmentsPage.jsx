import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentService } from '../../services';
import { Plus, ClipboardList, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';

const statusBadge = (s) => {
  const map = {
    draft: 'badge-gray', published: 'badge-green', closed: 'badge-red'
  };
  return <span className={map[s] || 'badge-gray'}>{s}</span>;
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentService.list()
      .then(r => setAssignments(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="text-gray-400 text-sm mt-0.5">{assignments.length} assignments total</p>
        </div>
        <Link to="/faculty/assignments/create" className="btn-primary flex items-center gap-2">
          <Plus size={16} />Create Assignment
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-dark-700" />
        ))}</div>
      ) : assignments.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No assignments yet</p>
          <Link to="/faculty/assignments/create" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} />Create First Assignment
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="card-hover group flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardList size={20} className="text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{a.title}</p>
                  {statusBadge(a.status)}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {a.subject?.subject_name} ({a.subject?.subject_code}) •
                  Max: {a.maximum_marks} marks •
                  {a.deadline ? ` Due: ${new Date(a.deadline).toLocaleDateString()}` : ' No deadline'}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to={`/faculty/submissions?assignment_id=${a.id}`} className="btn-secondary text-xs flex items-center gap-1 py-1.5">
                  <Eye size={13} />Submissions
                </Link>
                <Link to={`/faculty/assignments/${a.id}`} className="btn-secondary text-xs flex items-center gap-1 py-1.5">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
