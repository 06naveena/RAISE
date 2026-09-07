import { useState, useEffect } from 'react';
import { subjectService, departmentService } from '../../services';
import { Plus, Pencil, Trash2, BookOpen, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ subject_code: '', subject_name: '', department_id: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    subjectService.list().then(r => setSubjects(r.data)).finally(() => setLoading(false));
    departmentService.list().then(r => setDepartments(r.data));
  };
  useEffect(load, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setForm({ subject_code: '', subject_name: '', department_id: '' }); setSelected(null); setModal('create'); };
  const openEdit = (s) => {
    setForm({ subject_code: s.subject_code, subject_name: s.subject_name, department_id: s.department_id || '' });
    setSelected(s); setModal('edit');
  };

  const handleSave = async () => {
    if (!form.subject_code || !form.subject_name) return toast.error('Code and name required');
    setSaving(true);
    try {
      if (modal === 'create') { await subjectService.create(form); toast.success('Subject created'); }
      else { await subjectService.update(selected.id, form); toast.success('Subject updated'); }
      load(); setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return;
    try { await subjectService.delete(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-gray-400 text-sm mt-0.5">{subjects.length} subjects</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} />Add Subject</button>
      </div>

      <div className="table-container">
        <table className="table-base">
          <thead>
            <tr><th>Code</th><th>Subject Name</th><th>Department</th><th>Faculty</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => <tr key={i}><td colSpan={5}><div className="h-8 bg-dark-700 animate-pulse rounded" /></td></tr>)
            ) : subjects.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-500 py-12">
                <BookOpen size={32} className="mx-auto mb-2 opacity-40" />No subjects yet
              </td></tr>
            ) : subjects.map(s => (
              <tr key={s.id}>
                <td><span className="font-mono badge-blue">{s.subject_code}</span></td>
                <td className="font-medium text-white">{s.subject_name}</td>
                <td>{s.department?.code || '—'}</td>
                <td>{s.faculty_name || '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">{modal === 'create' ? 'Add Subject' : 'Edit Subject'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject Code *</label>
                <input value={form.subject_code} onChange={e => update('subject_code', e.target.value)} placeholder="CS401" className="input-field font-mono" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject Name *</label>
                <input value={form.subject_name} onChange={e => update('subject_name', e.target.value)} placeholder="Artificial Intelligence" className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Department</label>
                <select value={form.department_id} onChange={e => update('department_id', e.target.value)} className="input-field">
                  <option value="">Select...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
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
