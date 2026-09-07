import api from './api';

// Auth
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Departments
export const departmentService = {
  list: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Academic Years
export const academicYearService = {
  list: () => api.get('/academic-years'),
  create: (data) => api.post('/academic-years', data),
  update: (id, data) => api.put(`/academic-years/${id}`, data),
  delete: (id) => api.delete(`/academic-years/${id}`),
};

// Years of Study
export const yearOfStudyService = {
  list: () => api.get('/years-of-study'),
  create: (data) => api.post('/years-of-study', data),
  update: (id, data) => api.put(`/years-of-study/${id}`, data),
  delete: (id) => api.delete(`/years-of-study/${id}`),
};

// Sections
export const sectionService = {
  list: () => api.get('/sections'),
  create: (data) => api.post('/sections', data),
  update: (id, data) => api.put(`/sections/${id}`, data),
  delete: (id) => api.delete(`/sections/${id}`),
};

// Subjects
export const subjectService = {
  list: (params) => api.get('/subjects', { params }),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

// Students
export const studentService = {
  list: (params) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
};

// Assignments
export const assignmentService = {
  list: () => api.get('/assignments'),
  get: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  saveQuestions: (id, questions) => api.post(`/assignments/${id}/questions`, { questions }),
  saveRubrics: (id, rubrics) => api.post(`/assignments/${id}/rubrics`, { rubrics }),
  publish: (id) => api.post(`/assignments/${id}/publish`),
};

// Submissions
export const submissionService = {
  list: (params) => api.get('/submissions', { params }),
  get: (id) => api.get(`/submissions/${id}`),
  submit: (formData) => api.post('/submissions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Evaluations
export const evaluationService = {
  get: (subId) => api.get(`/evaluations/${subId}`),
  start: (subId) => api.post(`/evaluations/${subId}/start`),
  updateItem: (evalId, data) => api.put(`/evaluations/item/${evalId}`, data),
  approve: (subId, data) => api.post(`/evaluations/${subId}/approve`, data),
  publish: (subId) => api.post(`/evaluations/${subId}/publish`),
};

// Results
export const resultService = {
  list: (params) => api.get('/results', { params }),
  get: (id) => api.get(`/results/${id}`),
  exportExcel: (params) => api.get('/results/export', {
    params,
    responseType: 'blob',
  }),
};

// Dashboard
export const dashboardService = {
  get: () => api.get('/dashboard'),
};

// Audit
export const auditService = {
  list: (params) => api.get('/audit-logs', { params }),
};
