import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ClipboardList, Award, User, LogOut, GraduationCap, Menu
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',    icon: LayoutDashboard, path: '/student/dashboard' },
  { label: 'Assignments',  icon: ClipboardList,   path: '/student/assignments' },
  { label: 'My Results',   icon: Award,           path: '/student/results' },
  { label: 'Profile',      icon: User,            path: '/student/profile' },
];

export default function StudentLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      <aside className={`
        flex flex-col bg-dark-800 border-r border-white/5 transition-all duration-300 z-30
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} className="text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-white text-sm">RAISE</p>
              <p className="text-xs text-gray-500">Student Portal</p>
            </div>
          )}
        </div>

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

        <div className="border-t border-white/5 p-3">
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.register_number}</p>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-dark-800/50 backdrop-blur border-b border-white/5 flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="badge-green">Student</span>
            <span className="text-gray-600">|</span>
            <span>{profile?.register_number}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-mesh">
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
