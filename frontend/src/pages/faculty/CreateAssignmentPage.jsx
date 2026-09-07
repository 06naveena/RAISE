import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  assignmentService, departmentService, academicYearService,
  yearOfStudyService, sectionService, subjectService
} from '../../services';
import {
  CheckCircle, ArrowLeft, ArrowRight, Plus, Trash2,
  Tag, Lightbulb, Layers, ClipboardList, BookOpen, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = [
  { label: 'Context',    icon: BookOpen },
  { label: 'Details',   icon: ClipboardList },
  { label: 'Questions', icon: Layers },
  { label: 'Concepts',  icon: Lightbulb },
  { label: 'Keywords',  icon: Tag },
  { label: 'Rubrics',   icon: CheckCircle },
];

const emptyQuestion = () => ({
  question_number: 1, question_text: '', maximum_marks: 20, reference_answer: '',
  concepts: [''], keywords: ['']
});

export default function CreateAssignmentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [assignmentId, setAssignmentId] = useState(null);

  // Step 1 data
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [ctx, setCtx] = useState({
    department_id: '', academic_year_id: '', year_of_study_id: '', section_id: '', subject_id: ''
  });

  // Step 2 data
  const [details, setDetails] = useState({
    title: '', description: '', maximum_marks: 100, deadline: '', allow_late: false
  });

  // Step 3 questions
  const [questions, setQuestions] = useState([emptyQuestion()]);

  // Step 6 rubrics
  const [rubrics, setRubrics] = useState([
    { rubric_name: 'Conceptual Correctness', description: '', maximum_marks: 40 },
    { rubric_name: 'Problem-Solving Method', description: '', maximum_marks: 24 },
    { rubric_name: 'Explanation Quality',    description: '', maximum_marks: 15 },
    { rubric_name: 'Presentation',           description: '', maximum_marks: 11 },
    { rubric_name: 'Completeness',           description: '', maximum_marks: 10 },
  ]);

  useEffect(() => {
    Promise.all([
      departmentService.list(), academicYearService.list(),
      yearOfStudyService.list(), sectionService.list()
    ]).then(([d, ay, y, s]) => {
      setDepartments(d.data); setAcademicYears(ay.data);
      setYears(y.data); setSections(s.data);
    });
  }, []);

  useEffect(() => {
    if (ctx.department_id) {
      subjectService.list({ department_id: ctx.department_id }).then(r => setSubjects(r.data));
    }
  }, [ctx.department_id]);

  const rubricTotal = rubrics.reduce((s, r) => s + Number(r.maximum_marks || 0), 0);
  const rubricMismatch = Math.abs(rubricTotal - Number(details.maximum_marks)) > 0.01;

  // Add/remove questions
  const addQuestion = () => setQuestions(q => [...q, { ...emptyQuestion(), question_number: q.length + 1 }]);
  const removeQuestion = (i) => setQuestions(q => q.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, question_number: idx + 1 })));
  const updateQuestion = (i, k, v) => setQuestions(q => q.map((qi, idx) => idx === i ? { ...qi, [k]: v } : qi));

  // Concepts/keywords per question
  const addConcept = (qi) => setQuestions(q => q.map((item, idx) =>
    idx === qi ? { ...item, concepts: [...item.concepts, ''] } : item
  ));
  const updateConcept = (qi, ci, v) => setQuestions(q => q.map((item, idx) =>
    idx === qi ? { ...item, concepts: item.concepts.map((c, ci2) => ci2 === ci ? v : c) } : item
  ));
  const removeConcept = (qi, ci) => setQuestions(q => q.map((item, idx) =>
    idx === qi ? { ...item, concepts: item.concepts.filter((_, ci2) => ci2 !== ci) } : item
  ));

  const addKeyword = (qi) => setQuestions(q => q.map((item, idx) =>
    idx === qi ? { ...item, keywords: [...item.keywords, ''] } : item
  ));
  const updateKeyword = (qi, ki, v) => setQuestions(q => q.map((item, idx) =>
    idx === qi ? { ...item, keywords: item.keywords.map((k, ki2) => ki2 === ki ? v : k) } : item
  ));
  const removeKeyword = (qi, ki) => setQuestions(q => q.map((item, idx) =>
    idx === qi ? { ...item, keywords: item.keywords.filter((_, ki2) => ki2 !== ki) } : item
  ));

  // Add/remove rubrics
  const addRubric = () => setRubrics(r => [...r, { rubric_name: '', description: '', maximum_marks: 0 }]);
  const removeRubric = (i) => setRubrics(r => r.filter((_, idx) => idx !== i));
  const updateRubric = (i, k, v) => setRubrics(r => r.map((ri, idx) => idx === i ? { ...ri, [k]: v } : ri));

  const handleNext = async () => {
    // Validate and create assignment at step 2→3
    if (step === 1 && !assignmentId) {
      if (!details.title || !ctx.subject_id) return toast.error('Title and subject required');
      setSaving(true);
      try {
        const res = await assignmentService.create({
          ...details, ...ctx,
          maximum_marks: Number(details.maximum_marks),
        });
        setAssignmentId(res.data.id);
        setStep(2);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to create assignment');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Save questions at step 3→4
    if (step === 2 && assignmentId) {
      const valid = questions.every(q => q.question_text && q.reference_answer);
      if (!valid) return toast.error('All questions need text and reference answers');
      setSaving(true);
      try {
        await assignmentService.saveQuestions(assignmentId, questions.map(q => ({
          ...q,
          concepts: q.concepts.filter(Boolean),
          keywords: q.keywords.filter(Boolean),
        })));
        setStep(3);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Steps 4,5 just advance (concepts/keywords are part of questions)
    if (step === 3) { setStep(4); return; }
    if (step === 4) { setStep(5); return; }

    // Step 5 → 6: Save rubrics
    if (step === 5) {
      if (rubricMismatch) return toast.error(`Rubric total (${rubricTotal}) must equal max marks (${details.maximum_marks})`);
      setSaving(true);
      try {
        await assignmentService.saveRubrics(assignmentId, rubrics);
        await assignmentService.publish(assignmentId);
        toast.success('Assignment published!');
        navigate('/faculty/assignments');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed');
      } finally {
        setSaving(false);
      }
      return;
    }

    setStep(s => s + 1);
  };

  const canProceed = () => {
    if (step === 0) return ctx.subject_id;
    if (step === 1) return details.title;
    if (step === 2) return questions.every(q => q.question_text);
    if (step === 5) return !rubricMismatch;
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Create Assignment</h1>
        <p className="text-gray-400 text-sm mt-0.5">6-step wizard to set up an AI-evaluated assignment</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <div key={i} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                active ? 'bg-primary-600/20 text-primary-400' :
                done ? 'text-emerald-400' : 'text-gray-600'
              }`}>
                {done ? <CheckCircle size={16} className="text-emerald-400" /> : <Icon size={16} />}
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-emerald-500' : 'bg-dark-600'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card animate-fade-in">
        {/* Step 0: Context */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="section-title">Step 1: Select Context</h2>
            <p className="text-gray-400 text-sm">Choose the department, academic year, year of study, section and subject for this assignment.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Department', 'department_id', departments, 'name'],
                ['Academic Year', 'academic_year_id', academicYears, 'year_name'],
                ['Year of Study', 'year_of_study_id', years, 'label'],
                ['Section', 'section_id', sections, 'name'],
              ].map(([label, key, opts, optLabel]) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <select value={ctx[key]} onChange={e => setCtx(c => ({ ...c, [key]: e.target.value }))} className="input-field">
                    <option value="">Select {label}...</option>
                    {opts.map(o => <option key={o.id} value={o.id}>{o[optLabel]}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Subject *</label>
              <select value={ctx.subject_id} onChange={e => setCtx(c => ({ ...c, subject_id: e.target.value }))} className="input-field">
                <option value="">Select Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="section-title">Step 2: Assignment Details</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Assignment Title *</label>
              <input value={details.title} onChange={e => setDetails(d => ({ ...d, title: e.target.value }))}
                placeholder="Unit I – Artificial Intelligence Assignment" className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea rows={3} value={details.description} onChange={e => setDetails(d => ({ ...d, description: e.target.value }))}
                placeholder="Assignment instructions..." className="input-field resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Maximum Marks</label>
                <input type="number" min="1" value={details.maximum_marks}
                  onChange={e => setDetails(d => ({ ...d, maximum_marks: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deadline</label>
                <input type="datetime-local" value={details.deadline}
                  onChange={e => setDetails(d => ({ ...d, deadline: e.target.value }))} className="input-field" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={details.allow_late} onChange={e => setDetails(d => ({ ...d, allow_late: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-400">Allow late submissions</span>
            </label>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Step 3: Questions</h2>
              <button onClick={addQuestion} className="btn-secondary flex items-center gap-2 text-sm">
                <Plus size={14} />Add Question
              </button>
            </div>
            {questions.map((q, qi) => (
              <div key={qi} className="bg-dark-700/50 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge-blue">Question {q.question_number}</span>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qi)} className="p-1 text-gray-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Question Text *</label>
                  <textarea rows={2} value={q.question_text} onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                    placeholder="Enter question..." className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Maximum Marks</label>
                  <input type="number" min="0" value={q.maximum_marks}
                    onChange={e => updateQuestion(qi, 'maximum_marks', Number(e.target.value))} className="input-field w-32" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Reference / Model Answer *</label>
                  <textarea rows={4} value={q.reference_answer} onChange={e => updateQuestion(qi, 'reference_answer', e.target.value)}
                    placeholder="The ideal answer the AI will use for evaluation..." className="input-field resize-none" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Concepts */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="section-title">Step 4: Expected Concepts</h2>
            <p className="text-gray-400 text-sm">Define the key concepts the AI should look for in each answer.</p>
            {questions.map((q, qi) => (
              <div key={qi} className="bg-dark-700/50 border border-white/5 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-white">Q{q.question_number}: <span className="text-gray-400 font-normal">{q.question_text.slice(0, 80)}...</span></p>
                {q.concepts.map((c, ci) => (
                  <div key={ci} className="flex gap-2">
                    <input value={c} onChange={e => updateConcept(qi, ci, e.target.value)}
                      placeholder={`Concept ${ci + 1} e.g. "inheritance"`} className="input-field flex-1" />
                    {q.concepts.length > 1 && (
                      <button onClick={() => removeConcept(qi, ci)} className="text-gray-500 hover:text-red-400 p-2"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => addConcept(qi)} className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1">
                  <Plus size={14} />Add Concept
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Keywords */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="section-title">Step 5: Important Keywords</h2>
            <p className="text-gray-400 text-sm">Keywords that should appear in correct answers (used as supporting evidence).</p>
            {questions.map((q, qi) => (
              <div key={qi} className="bg-dark-700/50 border border-white/5 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-white">Q{q.question_number}: <span className="text-gray-400 font-normal">{q.question_text.slice(0, 80)}...</span></p>
                <div className="flex flex-wrap gap-2">
                  {q.keywords.map((k, ki) => (
                    <div key={ki} className="flex items-center gap-1 bg-dark-600 border border-white/10 rounded-lg px-2 py-1">
                      <input value={k} onChange={e => updateKeyword(qi, ki, e.target.value)}
                        placeholder="keyword" className="bg-transparent text-sm text-gray-300 outline-none w-24" />
                      {q.keywords.length > 1 && (
                        <button onClick={() => removeKeyword(qi, ki)} className="text-gray-600 hover:text-red-400"><X size={12} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addKeyword(qi)} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 px-2 py-1 border border-dashed border-primary-600/30 rounded-lg">
                    <Plus size={12} />Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Rubrics */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Step 6: Evaluation Rubrics</h2>
              <button onClick={addRubric} className="btn-secondary flex items-center gap-2 text-sm">
                <Plus size={14} />Add Rubric
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              Define rubric criteria. Total marks must equal assignment maximum ({details.maximum_marks}).
            </p>

            {rubricMismatch && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
                <AlertTriangle size={16} />
                Rubric total ({rubricTotal}) ≠ max marks ({details.maximum_marks}). Difference: {Math.abs(rubricTotal - Number(details.maximum_marks))}
              </div>
            )}

            <div className="space-y-3">
              {rubrics.map((r, ri) => (
                <div key={ri} className="flex gap-3 items-start bg-dark-700/50 border border-white/5 rounded-xl p-3">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input value={r.rubric_name} onChange={e => updateRubric(ri, 'rubric_name', e.target.value)}
                        placeholder="Rubric name" className="input-field" />
                    </div>
                    <div>
                      <input type="number" min="0" value={r.maximum_marks}
                        onChange={e => updateRubric(ri, 'maximum_marks', Number(e.target.value))}
                        placeholder="Max marks" className="input-field" />
                    </div>
                    <div className="col-span-3">
                      <input value={r.description} onChange={e => updateRubric(ri, 'description', e.target.value)}
                        placeholder="Description (optional)" className="input-field text-sm" />
                    </div>
                  </div>
                  {rubrics.length > 1 && (
                    <button onClick={() => removeRubric(ri)} className="text-gray-500 hover:text-red-400 p-2 mt-1"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              rubricMismatch ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <span className="text-sm text-gray-400">Total Rubric Marks</span>
              <span className={`font-bold text-lg ${rubricMismatch ? 'text-red-400' : 'text-emerald-400'}`}>
                {rubricTotal} / {details.maximum_marks}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/faculty/assignments')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft size={16} />{step === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}</div>
        <button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : step === STEPS.length - 1 ? (
            <><CheckCircle size={16} />Publish Assignment</>
          ) : (
            <>Next<ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}

// Need X for keywords
function X({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
