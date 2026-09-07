import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Building2, BookOpen, Users, ClipboardList,
  FileText, BarChart3, LogOut, Menu, X, GraduationCap, Calendar,
  Layers, SplitSquareVertical, CheckSquare, ScrollText, ChevronDown
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',       icon: LayoutDashboard, path: '/faculty/dashboard' },
  { label: 'Departments',     icon: Building2,        path: '/faculty/departments' },
  { label: 'Academic Years',  icon: Calendar,         path: '/faculty/academic-years' },
  { label: 'Years & Sections',icon: Layers,           path: '/faculty/years-sections' },
  { label: 'Subjects',        icon: BookOpen,         path: '/faculty/subjects' },
  { label: 'Students',        icon: Users,            path: '/faculty/students' },
  { label: 'Assignments',     icon: ClipboardList,    path: '/faculty/assignments' },
  { label: 'Submissions',     icon: FileText,         path: '/faculty/submissions' },
  { label: 'Results',         icon: CheckSquare,      path: '/faculty/results' },
  { label: 'Analytics',       icon: BarChart3,        path: '/faculty/analytics' },
  { label: 'Audit Log',       icon: ScrollText,       path: '/faculty/audit-log' },
];

export default function FacultyLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        flex flex-col bg-dark-800 border-r border-white/5 transition-all duration-300 z-30
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-tight">RAISE</p>
              <p className="text-xs text-gray-500">Faculty Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map(({ label, icon: Icon, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-3">
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'F'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="h-14 bg-dark-800/50 backdrop-blur border-b border-white/5 flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="badge-blue">Faculty</span>
            <span className="text-gray-600">|</span>
            <span>{user?.name}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-mesh">
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
