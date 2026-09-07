import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { assignmentService, submissionService } from '../../services';
import { Upload, FileText, CheckCircle, X, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      assignmentService.get(id),
      submissionService.list({ assignment_id: id }),
    ]).then(([a, s]) => {
      setAssignment(a.data);
      if (s.data.length > 0) setSubmission(s.data[0]);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleFile = (f) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpg', 'image/jpeg', 'image/png'];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|docx|jpg|jpeg|png)$/i)) {
      toast.error('Only PDF, DOCX, JPG, JPEG, PNG allowed');
      return;
    }
    if (f.size > 16 * 1024 * 1024) {
      toast.error('File too large (max 16MB)');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('assignment_id', id);
      const res = await submissionService.submit(fd);
      setSubmission(res.data);
      setFile(null);
      toast.success('Assignment submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const isDeadlinePassed = assignment?.deadline && new Date() > new Date(assignment.deadline);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-dark-700" />)}
    </div>
  );

  if (!assignment) return <div className="card text-gray-400 text-center py-16">Assignment not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Assignment Info */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{assignment.title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {assignment.subject?.subject_name} ({assignment.subject?.subject_code})
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-400">{assignment.maximum_marks}</p>
            <p className="text-xs text-gray-500">Max marks</p>
          </div>
        </div>

        {assignment.description && (
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{assignment.description}</p>
        )}

        {assignment.deadline && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
            isDeadlinePassed ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                             : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
          }`}>
            <Clock size={16} />
            <span>{isDeadlinePassed ? 'Deadline passed: ' : 'Due: '}</span>
            <span className="font-semibold">{new Date(assignment.deadline).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Questions */}
      {assignment.questions?.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Questions</h2>
          <div className="space-y-4">
            {assignment.questions.map(q => (
              <div key={q.id} className="bg-dark-700/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="badge-blue">Q{q.question_number}</span>
                  <span className="text-xs text-gray-500">{q.maximum_marks} marks</span>
                </div>
                <p className="text-gray-200">{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission */}
      <div className="card">
        <h2 className="section-title mb-4">Your Submission</h2>

        {submission ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle size={20} className="text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-400">Submitted Successfully</p>
                <p className="text-sm text-gray-400">
                  {submission.original_filename} • {formatBytes(submission.file_size || 0)} •{' '}
                  {new Date(submission.submission_date).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <span className="text-sm text-gray-400">Evaluation Status</span>
              <span className={`text-sm font-semibold ${
                submission.status === 'published' ? 'text-emerald-400' :
                submission.status === 'pending_review' ? 'text-amber-400' : 'text-primary-400'
              }`}>
                {submission.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            {submission.status === 'published' && (
              <div className="p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg text-center">
                <p className="text-primary-400 text-sm">✓ Results published! <a href="/student/results" className="underline">View your results</a></p>
              </div>
            )}
          </div>
        ) : isDeadlinePassed && !assignment.allow_late ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-red-400">Submission deadline has passed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drag & Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragOver ? 'border-primary-500 bg-primary-500/10' :
                file ? 'border-emerald-500 bg-emerald-500/10' : 'border-dark-500 hover:border-primary-600 hover:bg-primary-600/5'
              }`}
            >
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <FileText size={36} className="mx-auto text-emerald-400 mb-2" />
                  <p className="font-semibold text-emerald-400">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatBytes(file.size)}</p>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-gray-500 hover:text-red-400 text-xs flex items-center gap-1 mx-auto"
                  >
                    <X size={12} />Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={36} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-400">Drag & drop your file here, or <span className="text-primary-400 underline">browse</span></p>
                  <p className="text-xs text-gray-600 mt-1">PDF, DOCX, JPG, JPEG, PNG • Max 16MB</p>
                </div>
              )}
            </div>

            {file && (
              <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Upload size={18} />Submit Assignment</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
