import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationService } from '../../services';
import {
  ChevronDown, ChevronUp, CheckCircle, Edit3, Save, AlertTriangle,
  Brain, User, FileText, Target, Lightbulb, XCircle, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

const SimilarityBar = ({ value }) => {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400 w-8">{pct}%</span>
    </div>
  );
};

export default function EvaluationReviewPage() {
  const { subId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editMarks, setEditMarks] = useState({});
  const [editComment, setEditComment] = useState('');
  const [approving, setApproving] = useState(false);
  const [facultyFeedback, setFacultyFeedback] = useState('');
  const [saving, setSaving] = useState({});

  const load = () => {
    evaluationService.get(subId)
      .then(r => { setData(r.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [subId]);

  const startEdit = (ev) => {
    setEditingId(ev.id);
    setEditMarks(m => ({ ...m, [ev.id]: ev.faculty_marks ?? ev.ai_marks ?? 0 }));
    setEditComment('');
  };

  const saveEdit = async (ev) => {
    setSaving(s => ({ ...s, [ev.id]: true }));
    try {
      await evaluationService.updateItem(ev.id, {
        faculty_marks: editMarks[ev.id],
        faculty_comment: editComment,
      });
      toast.success('Marks updated');
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(s => ({ ...s, [ev.id]: false }));
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await evaluationService.approve(subId, { faculty_feedback: facultyFeedback });
      await evaluationService.publish(subId);
      toast.success('Evaluation approved and published!');
      navigate('/faculty/submissions');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="card text-center text-gray-400 py-16">Submission not found</div>;

  const assignment = data.assignment;
  const evaluations = data.evaluations || [];
  const extractedAnswers = data.extracted_answers || [];
  const totalAI = evaluations.reduce((s, e) => s + (e.ai_marks || 0), 0);
  const totalFaculty = evaluations.reduce((s, e) => s + (e.faculty_marks ?? e.ai_marks ?? 0), 0);

  // Group evals by question
  const evalsByQuestion = {};
  evaluations.forEach(ev => {
    const qid = ev.question_id || 'general';
    if (!evalsByQuestion[qid]) evalsByQuestion[qid] = [];
    evalsByQuestion[qid].push(ev);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Evaluation Review</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {data.student_name} ({data.student_register}) •{' '}
            <span className="text-primary-400">{data.assignment_title}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">AI Total</p>
            <p className="font-bold text-amber-400">{totalAI.toFixed(1)} / {assignment?.maximum_marks}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Faculty Total</p>
            <p className="font-bold text-emerald-400">{totalFaculty.toFixed(1)} / {assignment?.maximum_marks}</p>
          </div>
        </div>
      </div>

      {/* Low confidence warning */}
      {data.ocr_confidence && data.ocr_confidence < 60 && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
          <AlertTriangle size={16} />
          <strong>Manual Review Recommended.</strong> OCR confidence is low ({Math.round(data.ocr_confidence)}%).
          Please verify extracted text carefully.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Extracted Answers */}
        <div className="space-y-4">
          <h2 className="section-title flex items-center gap-2">
            <FileText size={18} className="text-gray-400" />
            Student Submission
          </h2>
          {extractedAnswers.length === 0 ? (
            <div className="card text-gray-500 text-sm">No text extracted from submission.</div>
          ) : extractedAnswers.map(ea => {
            const q = assignment?.questions?.find(q => q.id === ea.question_id);
            return (
              <div key={ea.id} className="card border border-white/5">
                <div className="flex items-start justify-between mb-2">
                  <span className="badge-blue text-xs">Q{ea.question_number}</span>
                  {ea.needs_review && (
                    <span className="badge-yellow text-xs">Review Segmentation</span>
                  )}
                </div>
                {q && (
                  <p className="text-xs text-gray-400 mb-2 italic">{q.question_text}</p>
                )}
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {ea.extracted_text || <span className="text-gray-600">No answer extracted</span>}
                </p>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Evaluations */}
        <div className="space-y-4">
          <h2 className="section-title flex items-center gap-2">
            <Brain size={18} className="text-primary-400" />
            AI Evaluation
            <span className="text-xs text-gray-500 font-normal ml-1">(Preliminary)</span>
          </h2>

          {evaluations.length === 0 ? (
            <div className="card text-gray-500 text-sm">Evaluation not yet generated.</div>
          ) : evaluations.map(ev => {
            const isEditing = editingId === ev.id;
            const displayMarks = ev.faculty_marks ?? ev.ai_marks ?? 0;
            const modified = ev.faculty_marks !== null && ev.faculty_marks !== ev.ai_marks;

            return (
              <div key={ev.id} className="card border border-white/5 space-y-3">
                {/* Rubric header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{ev.rubric?.rubric_name}</p>
                    <p className="text-xs text-gray-500">Max: {ev.rubric?.maximum_marks} marks</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">AI Marks</p>
                      <p className="font-mono text-amber-400">{(ev.ai_marks || 0).toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      {isEditing ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Final Marks</p>
                          <input
                            type="number"
                            min="0"
                            max={ev.rubric?.maximum_marks}
                            step="0.5"
                            value={editMarks[ev.id] ?? 0}
                            onChange={e => setEditMarks(m => ({ ...m, [ev.id]: Number(e.target.value) }))}
                            className="input-field w-20 text-center font-mono text-sm py-1"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-500">Final Marks</p>
                          <p className={`font-mono font-bold ${modified ? 'text-emerald-400' : 'text-white'}`}>
                            {displayMarks.toFixed(1)}
                            {modified && ' ✎'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Semantic similarity */}
                {ev.semantic_similarity != null && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Semantic Similarity</p>
                    <SimilarityBar value={ev.semantic_similarity} />
                  </div>
                )}

                {/* Justification */}
                {ev.justification && (
                  <div className="bg-dark-700/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">AI Justification</p>
                    <p className="text-sm text-gray-300">{ev.justification}</p>
                  </div>
                )}

                {/* Concepts */}
                {(ev.identified_concepts?.length > 0 || ev.missing_concepts?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 mb-1">✓ Identified</p>
                      {ev.identified_concepts?.map((c, i) => (
                        <span key={i} className="inline-block badge-green text-xs mr-1 mb-1">{c}</span>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-1">✗ Missing</p>
                      {ev.missing_concepts?.map((c, i) => (
                        <span key={i} className="inline-block badge-red text-xs mr-1 mb-1">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {ev.errors?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-400 mb-1">Errors / Issues</p>
                    {ev.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-300">• {e}</p>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                {ev.feedback && (
                  <div className="bg-primary-600/10 border border-primary-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary-400 mb-1">AI Feedback</p>
                    <p className="text-sm text-gray-300">{ev.feedback}</p>
                  </div>
                )}

                {/* Edit Controls */}
                {isEditing && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Reason for modification</label>
                    <input value={editComment} onChange={e => setEditComment(e.target.value)}
                      placeholder="Optional reason..." className="input-field text-sm" />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {isEditing ? (
                    <>
                      <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
                      <button onClick={() => saveEdit(ev)} disabled={saving[ev.id]} className="btn-primary text-xs py-1 px-3 flex items-center gap-1">
                        <Save size={12} />
                        {saving[ev.id] ? 'Saving...' : 'Save Marks'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(ev)} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                      <Edit3 size={12} />Modify Marks
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval Section */}
      {['pending_review', 'faculty_modified'].includes(data.status) && (
        <div className="card border border-emerald-500/20">
          <h2 className="section-title mb-3">Approve & Publish Evaluation</h2>
          <p className="text-sm text-gray-400 mb-4">
            Review the AI-generated marks above. Modify any marks if needed, then approve to publish results to the student.
            Final marks: <strong className="text-emerald-400">{totalFaculty.toFixed(1)} / {assignment?.maximum_marks}</strong>
          </p>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Faculty Feedback (shown to student)</label>
            <textarea
              rows={3}
              value={facultyFeedback}
              onChange={e => setFacultyFeedback(e.target.value)}
              placeholder="Overall feedback for the student..."
              className="input-field resize-none"
            />
          </div>
          <button onClick={handleApprove} disabled={approving} className="btn-success flex items-center gap-2">
            <CheckCircle size={16} />
            {approving ? 'Approving...' : 'Approve & Publish to Student'}
          </button>
        </div>
      )}

      {data.status === 'approved' || data.status === 'published' ? (
        <div className="card border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-400">Evaluation Approved</p>
              <p className="text-sm text-gray-400">
                Final marks: {data.final_result?.total_faculty_marks?.toFixed(1)} / {assignment?.maximum_marks}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
