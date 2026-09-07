import { useState, useEffect } from 'react';
import { departmentService } from '../../services';
import { Plus, Pencil, Trash2, Building2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    departmentService.list().then(r => setDepartments(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm({ name: '', code: '' }); setSelected(null); setModal('create'); };
  const openEdit = (d) => { setForm({ name: d.name, code: d.code }); setSelected(d); setModal('edit'); };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Name and code required');
    setSaving(true);
    try {
      if (modal === 'create') {
        await departmentService.create(form);
        toast.success('Department created');
      } else {
        await departmentService.update(selected.id, form);
        toast.success('Department updated');
      }
      load();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    try {
      await departmentService.delete(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="text-gray-400 text-sm mt-0.5">{departments.length} departments</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />Add Department
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-dark-700" />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No departments yet</p>
          <button onClick={openCreate} className="btn-primary mt-4 mx-auto">Add First Department</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <div key={d.id} className="card-hover group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
                    <Building2 size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{d.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Code: <span className="text-primary-400 font-mono">{d.code}</span></p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">{modal === 'create' ? 'Add Department' : 'Edit Department'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Department Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Computer Science and Engineering" className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Department Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="CSE" className="input-field font-mono" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={closeModal} className="btn-secondary">Cancel</button>
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
