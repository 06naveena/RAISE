import { useState, useEffect } from 'react';
import { resultService } from '../../services';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';

export default function StudentResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    resultService.list()
      .then(r => setResults(r.data.results || []))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  if (loading) return (
    <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-dark-700" />)}</div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Results</h1>
        <p className="text-gray-400 text-sm mt-0.5">{results.length} approved result{results.length !== 1 ? 's' : ''}</p>
      </div>

      {results.length === 0 ? (
        <div className="card text-center py-16">
          <Award size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No results available yet</p>
          <p className="text-gray-500 text-sm mt-1">Results will appear here once your faculty approves your evaluation</p>
        </div>
      ) : results.map(r => (
        <div key={r.submission_id} className="card space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-white">{r.assignment_title}</p>
              <p className="text-sm text-gray-400">{r.subject_name} ({r.subject_code})</p>
              <p className="text-xs text-gray-600 mt-1">
                Approved: {r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-400">{r.total_faculty_marks?.toFixed(1)}</p>
              <p className="text-sm text-gray-500">/ {r.maximum_marks}</p>
              <p className="text-xs text-gray-600">
                {r.maximum_marks ? Math.round((r.total_faculty_marks / r.maximum_marks) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Score bar */}
          <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
              style={{ width: `${r.maximum_marks ? (r.total_faculty_marks / r.maximum_marks) * 100 : 0}%` }}
            />
          </div>

          {/* Rubric breakdown toggle */}
          <button
            onClick={() => toggle(r.submission_id)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {expanded[r.submission_id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded[r.submission_id] ? 'Hide' : 'Show'} rubric-wise breakdown
          </button>

          {expanded[r.submission_id] && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              {Object.entries(r.rubric_marks || {}).map(([name, data]) => (
                <div key={name} className="flex items-center gap-3">
                  <p className="text-sm text-gray-400 flex-1">{name}</p>
                  <div className="w-40 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${data.maximum_marks ? (data.final_marks / data.maximum_marks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-white w-14 text-right">
                    {data.final_marks?.toFixed(1)} / {data.maximum_marks}
                  </span>
                </div>
              ))}

              {/* Faculty Feedback */}
              {r.faculty_feedback && (
                <div className="mt-4 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
                  <p className="text-xs font-semibold text-primary-400 mb-1">Faculty Feedback</p>
                  <p className="text-sm text-gray-300">{r.faculty_feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
