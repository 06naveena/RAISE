import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentService, submissionService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Clock, CheckCircle, Upload, ArrowRight } from 'lucide-react';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      assignmentService.list(),
      submissionService.list(),
    ]).then(([a, s]) => {
      setAssignments(a.data);
      setSubmissions(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const submissionMap = {};
  submissions.forEach(s => { submissionMap[s.assignment_id] = s; });

  const pending = assignments.filter(a => !submissionMap[a.id]);
  const submitted = assignments.filter(a => submissionMap[a.id]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-primary-600/20 to-accent-500/20 border-primary-500/20">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold text-white">Welcome, {user?.name}!</p>
            <p className="text-gray-400 text-sm">
              {profile?.register_number} •{' '}
              {profile?.department?.name} •{' '}
              {profile?.year_of_study?.label} •{' '}
              Section {profile?.section?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-400">{assignments.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Assignments</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-amber-400">{pending.length}</p>
          <p className="text-xs text-gray-500 mt-1">Pending Submission</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-emerald-400">{submitted.length}</p>
          <p className="text-xs text-gray-500 mt-1">Submitted</p>
        </div>
      </div>

      {/* Pending Assignments */}
      {pending.length > 0 && (
        <div>
          <h2 className="section-title mb-3 flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />Pending Submissions
          </h2>
          <div className="space-y-3">
            {pending.map(a => (
              <Link key={a.id} to={`/student/assignments/${a.id}`}
                className="card-hover flex items-center gap-4 group">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{a.title}</p>
                  <p className="text-sm text-gray-500">
                    {a.subject?.subject_name} • Max: {a.maximum_marks} marks
                    {a.deadline && ` • Due: ${new Date(a.deadline).toLocaleDateString()}`}
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Submitted */}
      {submitted.length > 0 && (
        <div>
          <h2 className="section-title mb-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-400" />Submitted Assignments
          </h2>
          <div className="space-y-3">
            {submitted.map(a => {
              const sub = submissionMap[a.id];
              return (
                <Link key={a.id} to={`/student/assignments/${a.id}`}
                  className="card-hover flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{a.title}</p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(sub.submission_date).toLocaleDateString()} •{' '}
                      <span className={`${sub.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sub.status}
                      </span>
                    </p>
                  </div>
                  {sub.status === 'published' && (
                    <Link to="/student/results" className="badge-green text-xs">View Results</Link>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && !loading && (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No assignments available yet</p>
          <p className="text-gray-500 text-sm mt-1">Your faculty will publish assignments here</p>
        </div>
      )}
    </div>
  );
}
