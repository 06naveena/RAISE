import { useState, useEffect } from 'react';
import { academicYearService, yearOfStudyService, sectionService } from '../../services';
import { Plus, Pencil, Trash2, X, Check, Calendar, Layers, Columns } from 'lucide-react';
import toast from 'react-hot-toast';

function CRUDCard({ title, icon: Icon, items, fields, service, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setForm(Object.fromEntries(fields.map(f => [f.key, '']))); setSelected(null); setModal('create'); };
  const openEdit = (item) => {
    setForm(Object.fromEntries(fields.map(f => [f.key, item[f.key] ?? ''])));
    setSelected(item); setModal('edit');
  };

  const handleSave = async () => {
    if (fields.some(f => f.required && !form[f.key])) return toast.error('All required fields needed');
    setSaving(true);
    try {
      if (modal === 'create') { await onCreate(form); toast.success(`${title} created`); }
      else { await onUpdate(selected.id, form); toast.success(`${title} updated`); }
      setModal(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete this ${title.toLowerCase()}?`)) return;
    try { await onDelete(id); toast.success('Deleted'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title flex items-center gap-2">
          <Icon size={18} className="text-primary-400" />{title}
        </h2>
        <button onClick={openCreate} className="btn-secondary text-sm flex items-center gap-1.5 py-1.5 px-3">
          <Plus size={14} />Add
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No {title.toLowerCase()}s yet</p>
        ) : items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg group">
            <p className="text-sm text-gray-200">{fields.map(f => item[f.key]).join(' — ')}</p>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(item)} className="p-1 text-gray-500 hover:text-white rounded"><Pencil size={13} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-500 hover:text-red-400 rounded"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">{modal === 'create' ? `Add ${title}` : `Edit ${title}`}</h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}{f.required && ' *'}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] || ''}
                    onChange={e => setForm(fm => ({ ...fm, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    placeholder={f.placeholder}
                    className="input-field"
                  />
                </div>
              ))}
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

export default function AcademicManagementPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);

  const loadAll = () => {
    academicYearService.list().then(r => setAcademicYears(r.data));
    yearOfStudyService.list().then(r => setYears(r.data));
    sectionService.list().then(r => setSections(r.data));
  };
  useEffect(loadAll, []);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Academic Management</h1>
      <p className="text-gray-400 text-sm">Manage academic years, years of study, and sections.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CRUDCard
          title="Academic Years" icon={Calendar}
          items={academicYears}
          fields={[{ key: 'year_name', label: 'Year Name', placeholder: '2026-2027', required: true }]}
          service={academicYearService}
          onCreate={async (d) => { await academicYearService.create(d); loadAll(); }}
          onUpdate={async (id, d) => { await academicYearService.update(id, d); loadAll(); }}
          onDelete={async (id) => { await academicYearService.delete(id); loadAll(); }}
        />
        <CRUDCard
          title="Years of Study" icon={Layers}
          items={years}
          fields={[
            { key: 'year_number', label: 'Year Number', type: 'number', placeholder: '4', required: true },
            { key: 'label', label: 'Label', placeholder: 'IV Year', required: true },
          ]}
          service={yearOfStudyService}
          onCreate={async (d) => { await yearOfStudyService.create(d); loadAll(); }}
          onUpdate={async (id, d) => { await yearOfStudyService.update(id, d); loadAll(); }}
          onDelete={async (id) => { await yearOfStudyService.delete(id); loadAll(); }}
        />
        <CRUDCard
          title="Sections" icon={Columns}
          items={sections}
          fields={[{ key: 'name', label: 'Section Name', placeholder: 'A', required: true }]}
          service={sectionService}
          onCreate={async (d) => { await sectionService.create(d); loadAll(); }}
          onUpdate={async (id, d) => { await sectionService.update(id, d); loadAll(); }}
          onDelete={async (id) => { await sectionService.delete(id); loadAll(); }}
        />
      </div>
    </div>
  );
}


