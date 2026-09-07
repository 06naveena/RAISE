import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services';
import {
  Users, BookOpen, ClipboardList, Clock, CheckCircle, TrendingUp,
  ArrowRight, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="card-hover">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400 font-medium">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  </div>
);

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.get()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card animate-pulse h-24 bg-dark-700" />
      ))}
    </div>
  );

  const stats = data?.stats || {};
  const assignmentPerf = data?.assignment_performance || [];
  const distribution = data?.score_distribution || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Faculty Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">AI-Powered Assignment Evaluation System</p>
        </div>
        <Link to="/faculty/assignments/create" className="btn-primary flex items-center gap-2">
          <Zap size={16} />
          New Assignment
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Students" value={stats.total_students ?? 0} icon={Users} color="bg-primary-600" />
        <StatCard label="Subjects" value={stats.total_subjects ?? 0} icon={BookOpen} color="bg-indigo-600" />
        <StatCard label="Active Assignments" value={stats.active_assignments ?? 0} icon={ClipboardList} color="bg-blue-600" />
        <StatCard label="Pending Review" value={stats.pending_evaluations ?? 0} icon={Clock} color="bg-amber-600" />
        <StatCard label="Completed" value={stats.completed_evaluations ?? 0} icon={CheckCircle} color="bg-emerald-600" />
        <StatCard label="Avg. Score" value={`${stats.average_score ?? 0}%`} icon={TrendingUp} color="bg-accent-600" sub="across approved results" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Assignment Performance */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Assignment Performance</h2>
            <span className="text-xs text-gray-500">Average marks per assignment</span>
          </div>
          {assignmentPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={assignmentPerf} barSize={32}>
                <XAxis dataKey="assignment" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fill: '#9ca3af', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-500 text-sm">
              No data yet. Approve some evaluations to see results.
            </div>
          )}
        </div>

        {/* Score Distribution */}
        <div className="card">
          <h2 className="section-title mb-4">Score Distribution</h2>
          {distribution.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={distribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80} label>
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-500 text-sm">
              No approved results yet.
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Manage Students', path: '/faculty/students', color: 'from-primary-600 to-primary-800' },
          { label: 'Create Assignment', path: '/faculty/assignments/create', color: 'from-indigo-600 to-indigo-800' },
          { label: 'Review Submissions', path: '/faculty/submissions', color: 'from-amber-600 to-orange-800' },
          { label: 'Export Results', path: '/faculty/results', color: 'from-emerald-600 to-emerald-800' },
        ].map(({ label, path, color }) => (
          <Link key={path} to={path}
            className={`bg-gradient-to-br ${color} rounded-xl p-4 flex items-center justify-between hover:opacity-90 transition-opacity group`}>
            <span className="font-medium text-white text-sm">{label}</span>
            <ArrowRight size={16} className="text-white/70 group-hover:translate-x-1 transition-transform" />
          </Link>
        ))}
      </div>
    </div>
  );
}
