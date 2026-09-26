import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { departmentService, academicYearService, yearOfStudyService, sectionService } from '../../services';
import { GraduationCap, User, Mail, Lock, Hash, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', register_number: '',
    department_id: '', academic_year_id: '', year_of_study_id: '', section_id: ''
  });

  useEffect(() => {
    Promise.all([
      departmentService.list(),
      academicYearService.list(),
      yearOfStudyService.list(),
      sectionService.list(),
    ]).then(([d, ay, y, s]) => {
      setDepartments(d.data || []);
      setAcademicYears(ay.data || []);
      setYears(y.data || []);
      setSections(s.data || []);
    }).catch(() => { });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful!');
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-dark-900 bg-mesh flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-glow">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">RAISE</h1>
          <p className="text-gray-400 text-sm">Student Registration</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Create Student Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle size={16} />{error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label>
                <input value={form.name} onChange={e => update('name', e.target.value)}
                  placeholder="Your name" className="input-field" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Register Number *</label>
                <input value={form.register_number} onChange={e => update('register_number', e.target.value)}
                  placeholder="23CSE001" className="input-field" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                placeholder="student@example.com" className="input-field" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                placeholder="Min 8 characters" className="input-field" required minLength={6} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Department</label>
                <select value={form.department_id} onChange={e => update('department_id', e.target.value)} className="input-field">
                  <option value="">Select...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Academic Year</label>
                <select value={form.academic_year_id} onChange={e => update('academic_year_id', e.target.value)} className="input-field">
                  <option value="">Select...</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Year of Study</label>
                <select value={form.year_of_study_id} onChange={e => update('year_of_study_id', e.target.value)} className="input-field">
                  <option value="">Select...</option>
                  {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Section</label>
                <select value={form.section_id} onChange={e => update('section_id', e.target.value)} className="input-field">
                  <option value="">Select...</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
