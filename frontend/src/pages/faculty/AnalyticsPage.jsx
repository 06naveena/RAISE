import { useState, useEffect } from 'react';
import { resultService, dashboardService } from '../../services';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [dashData, setDashData] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.get(),
      resultService.list({ per_page: 200 }),
    ]).then(([d, r]) => {
      setDashData(d.data);
      setResults(r.data.results);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card h-64 animate-pulse bg-dark-700" />)}
    </div>
  );

  const stats = dashData?.stats || {};
  const distribution = dashData?.score_distribution || [];
  const assignmentPerf = dashData?.assignment_performance || [];

  // Per-student score data from results
  const studentScores = results.map(r => ({
    name: r.student_name?.split(' ')[0] || 'Unknown',
    marks: r.total_faculty_marks || 0,
    max: r.maximum_marks || 100,
    pct: r.maximum_marks ? Math.round((r.total_faculty_marks || 0) / r.maximum_marks * 100) : 0,
  }));

  // Rubric-wise averages
  const rubricMap = {};
  results.forEach(r => {
    Object.entries(r.rubric_marks || {}).forEach(([name, data]) => {
      if (!rubricMap[name]) rubricMap[name] = { total: 0, count: 0, max: data.maximum_marks };
      rubricMap[name].total += data.final_marks || 0;
      rubricMap[name].count++;
    });
  });
  const rubricAverages = Object.entries(rubricMap).map(([name, d]) => ({
    name: name.slice(0, 15),
    average: Math.round(d.total / d.count * 10) / 10,
    maximum: d.max,
  }));

  // Summary stats
  const scores = results.map(r => r.total_faculty_marks || 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const pass = scores.filter(s => s >= 40).length;
  const passRate = scores.length ? Math.round(pass / scores.length * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Performance Analytics</h1>
        <p className="text-gray-400 text-sm mt-0.5">Insights across {results.length} approved evaluations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Average',  value: `${avgScore}` },
          { label: 'Highest',  value: `${maxScore}` },
          { label: 'Lowest',   value: `${minScore}` },
          { label: 'Median',   value: `${median}` },
          { label: 'Pass Rate',value: `${passRate}%` },
          { label: 'Total',    value: results.length },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-3xl font-bold text-primary-400">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Assignment Averages */}
        <div className="card">
          <h2 className="section-title mb-4">Assignment-wise Average</h2>
          {assignmentPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assignmentPerf}>
                <XAxis dataKey="assignment" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No data</div>}
        </div>

        {/* Score Distribution */}
        <div className="card">
          <h2 className="section-title mb-4">Score Distribution</h2>
          {distribution.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={distribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={75} label>
                  {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No approved results</div>}
        </div>

        {/* Rubric-wise Averages */}
        <div className="card">
          <h2 className="section-title mb-4">Rubric-wise Performance</h2>
          {rubricAverages.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rubricAverages} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} width={120} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="average" fill="#f97316" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fill: '#9ca3af', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No data</div>}
        </div>

        {/* Student Scores Line */}
        <div className="card">
          <h2 className="section-title mb-4">Student Score Overview</h2>
          {studentScores.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={studentScores}>
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="pct" fill="#22c55e" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fill: '#9ca3af', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No student data</div>}
        </div>
      </div>
    </div>
  );
}
