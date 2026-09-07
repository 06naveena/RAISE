import { useState, useEffect } from 'react';
import { studentService, departmentService, academicYearService, yearOfStudyService, sectionService } from '../../services';
import { Plus, Pencil, Trash2, Users, Search, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', email: '', password: '', register_number: '',
  department_id: '', academic_year_id: '', year_of_study_id: '', section_id: ''
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    Promise.all([
      departmentService.list(), academicYearService.list(),
      yearOfStudyService.list(), sectionService.list()
    ]).then(([d, ay, y, s]) => {
      setDepartments(d.data); setAcademicYears(ay.data);
      setYears(y.data); setSections(s.data);
    });
  }, []);

  const load = () => {
    setLoading(true);
    studentService.list({ page, per_page: 15, search })
      .then(r => {
        setStudents(r.data.students);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setModal('create'); };
  const openEdit = (s) => {
    setForm({
      name: s.name, email: s.email, password: '', register_number: s.register_number,
      department_id: s.department_id || '', academic_year_id: s.academic_year_id || '',
      year_of_study_id: s.year_of_study_id || '', section_id: s.section_id || ''
    });
    setSelected(s); setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        await studentService.create(form);
        toast.success('Student created');
      } else {
        const { password, ...rest } = form;
        await studentService.update(selected.id, rest);
        toast.success('Student updated');
      }
      load(); setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await studentService.delete(id);
      toast.success('Deleted'); load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} students enrolled</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />Add Student
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, register number, or email..."
          className="input-field pl-10"
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table-base">
          <thead>
            <tr>
              <th>Register No.</th><th>Name</th><th>Email</th>
              <th>Department</th><th>Year</th><th>Section</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-8 bg-dark-700 animate-pulse rounded" /></td></tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-500 py-12">
                <Users size={32} className="mx-auto mb-2 opacity-40" />
                No students found
              </td></tr>
            ) : students.map(s => (
              <tr key={s.id}>
                <td><span className="font-mono text-primary-400">{s.register_number}</span></td>
                <td className="font-medium text-white">{s.name}</td>
                <td className="text-gray-400">{s.email}</td>
                <td>{s.department?.code || '—'}</td>
                <td>{s.year_of_study?.label || '—'}</td>
                <td>{s.section?.name || '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary p-2">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary p-2">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">{modal === 'create' ? 'Add Student' : 'Edit Student'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                  <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Name" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Register No. *</label>
                  <input value={form.register_number} onChange={e => update('register_number', e.target.value)} placeholder="23CSE001" className="input-field font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Email" className="input-field" />
              </div>
              {modal === 'create' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password *</label>
                  <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Password" className="input-field" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Department</label>
                  <select value={form.department_id} onChange={e => update('department_id', e.target.value)} className="input-field">
                    <option value="">Select...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Academic Year</label>
                  <select value={form.academic_year_id} onChange={e => update('academic_year_id', e.target.value)} className="input-field">
                    <option value="">Select...</option>
                    {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Year of Study</label>
                  <select value={form.year_of_study_id} onChange={e => update('year_of_study_id', e.target.value)} className="input-field">
                    <option value="">Select...</option>
                    {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Section</label>
                  <select value={form.section_id} onChange={e => update('section_id', e.target.value)} className="input-field">
                    <option value="">Select...</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                  <Check size={16} />{saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
