import { lazy } from 'react';

/** Lazy-loads a named export so each role's screens are a separate chunk. */
const page = (load, name) => {
  const C = lazy(() => load().then((m) => ({ default: m[name] })));
  return <C />;
};

const student = () => import('../features/student');
const faculty = () => import('../features/studio');
const mentor = () => import('../features/mentor');
const admin = () => import('../features/admin');
const progress = () => import('../features/progress');
const forms = () => import('../features/forms');

/**
 * Screens by role. Keys are comma-separated role lists for RequireRole.
 * `shared` routes are open to every signed-in user (the API still scopes the data).
 */
export const appRoutes = {
  shared: [
    { path: 'search', element: page(student, 'SearchPage') },
    // Subject root page: why, prerequisites, the unit journey and outcomes (staff preview drafts).
    { path: 'subjects/:subjectId', element: page(student, 'SubjectOverviewPage') },
    // Faculty and admins preview topic pages too; the API returns published content only.
    { path: 'topics/:topicId', element: page(student, 'TopicPage') },
    // Staff can preview a quiz; only students can submit it (enforced by the API).
    { path: 'topics/:topicId/quiz', element: page(student, 'QuizPage') },
    // Code lab problem; staff see drafts as a preview, and their submissions are not recorded.
    { path: 'code/:challengeId', element: page(student, 'CodeLabPage') },
    // Practical (lab) subject on its theory roadmap (ADR 0012); staff preview it as students see it.
    { path: 'labs/:subjectId', element: page(student, 'LabPage') },
    // Every role; the API ranks only the viewer's own cohort (ADR 0013).
    { path: 'leaderboard', element: page(progress, 'LeaderboardPage') },
    // The shareable form link (ADR 0015): students in the audience fill it, editors preview it.
    { path: 'forms/:formId', element: page(forms, 'FormFillPage') },
  ],
  byRole: {
    student: [
      { path: 'learn', element: page(student, 'LearnHome') },
      { path: 'learn/:subjectId', element: page(student, 'SubjectMapPage') },
      { path: 'revision', element: page(student, 'RevisionPage') },
      { path: 'exam-prep', element: page(student, 'ExamPrepIndex') },
      { path: 'exam-prep/:subjectId', element: page(student, 'ExamPrepPage') },
      { path: 'me/progress', element: page(student, 'ProgressPage') },
      { path: 'code-lab', element: page(student, 'CodeLabIndex') },
      { path: 'code-lab/:subjectId', element: page(student, 'SubjectCodeLabPage') },
      { path: 'forms', element: page(forms, 'MyFormsPage') },
    ],
    'faculty,admin': [
      { path: 'studio', element: page(faculty, 'StudioHome') },
      { path: 'studio/subjects/:subjectId', element: page(faculty, 'SubjectBuilder') },
      { path: 'studio/subjects/:subjectId/insights', element: page(faculty, 'InsightsPage') },
      { path: 'studio/subjects/:subjectId/overview', element: page(faculty, 'OverviewEditor') },
      { path: 'studio/subjects/:subjectId/content', element: page(faculty, 'ContentCsvPage') },
      { path: 'studio/labs/:subjectId', element: page(faculty, 'LabEditor') },
      { path: 'studio/topics/:topicId', element: page(faculty, 'TopicEditor') },
      { path: 'studio/review', element: page(faculty, 'ReviewQueue') },
      { path: 'studio/questions', element: page(faculty, 'QuestionBank') },
      { path: 'studio/workshops', element: page(faculty, 'WorkshopReview') },
      { path: 'studio/students', element: page(progress, 'ClassProgressPage') },
      { path: 'studio/students/:id', element: page(progress, 'StudentReportPage') },
      { path: 'studio/forms', element: page(forms, 'FormStudioPage') },
      { path: 'studio/forms/:formId', element: page(forms, 'FormEditor') },
    ],
    // Admins may open a mentor's view of a student too (the API audits it).
    'mentor,admin': [
      { path: 'mentor', element: page(mentor, 'MentorHome') },
      { path: 'mentor/students/:id', element: page(mentor, 'MentorStudent') },
      { path: 'mentor/follow-ups', element: page(mentor, 'FollowUps') },
    ],
    admin: [
      { path: 'admin', element: page(admin, 'AdminHome') },
      { path: 'admin/users', element: page(admin, 'UsersPage') },
      { path: 'admin/syllabus', element: page(admin, 'SyllabusPage') },
      { path: 'admin/progress', element: page(progress, 'DepartmentProgressPage') },
      { path: 'admin/co-po', element: page(admin, 'CoPoPage') },
      { path: 'admin/ai', element: page(admin, 'AiSettingsPage') },
    ],
    // Only the Academic Coordinator creates and edits departments.
    coordinator: [{ path: 'admin/departments', element: page(admin, 'DepartmentsPage') }],
  },
};
