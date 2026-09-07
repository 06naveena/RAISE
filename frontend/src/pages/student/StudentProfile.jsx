import { useAuth } from '../../context/AuthContext';
import { User, Mail, Hash, Building2, Calendar, BookOpen } from 'lucide-react';

export default function StudentProfile() {
  const { user, profile } = useAuth();

  const fields = [
    { icon: User,      label: 'Full Name',     value: user?.name },
    { icon: Mail,      label: 'Email',         value: user?.email },
    { icon: Hash,      label: 'Register No.',  value: profile?.register_number },
    { icon: Building2, label: 'Department',    value: profile?.department?.name },
    { icon: Calendar,  label: 'Academic Year', value: profile?.academic_year?.year_name },
    { icon: BookOpen,  label: 'Year of Study', value: profile?.year_of_study?.label },
    { icon: User,      label: 'Section',       value: profile?.section?.name },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="page-title">My Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-4xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{user?.name}</p>
            <p className="text-gray-400">{profile?.register_number}</p>
            <span className="badge-blue mt-1">Student</span>
          </div>
        </div>

        <div className="space-y-3">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
              <Icon size={16} className="text-gray-500 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm text-white font-medium">{value || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
