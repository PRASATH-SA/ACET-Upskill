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

/**
 * Screens by role. Keys are comma-separated role lists for RequireRole.
 * `shared` routes are open to every signed-in user (the API still scopes the data).
 */
export const appRoutes = {
  shared: [
    { path: 'search', element: page(student, 'SearchPage') },
    // Faculty and admins preview topic pages too; the API returns published content only.
    { path: 'topics/:topicId', element: page(student, 'TopicPage') },
    // Staff can preview a quiz; only students can submit it (enforced by the API).
    { path: 'topics/:topicId/quiz', element: page(student, 'QuizPage') },
  ],
  byRole: {
    student: [
      { path: 'learn', element: page(student, 'LearnHome') },
      { path: 'learn/:subjectId', element: page(student, 'SubjectMapPage') },
      { path: 'revision', element: page(student, 'RevisionPage') },
      { path: 'exam-prep', element: page(student, 'ExamPrepIndex') },
      { path: 'exam-prep/:subjectId', element: page(student, 'ExamPrepPage') },
      { path: 'me/progress', element: page(student, 'ProgressPage') },
    ],
    'faculty,admin': [
      { path: 'studio', element: page(faculty, 'StudioHome') },
      { path: 'studio/subjects/:subjectId', element: page(faculty, 'SubjectBuilder') },
      { path: 'studio/subjects/:subjectId/insights', element: page(faculty, 'InsightsPage') },
      { path: 'studio/topics/:topicId', element: page(faculty, 'TopicEditor') },
      { path: 'studio/review', element: page(faculty, 'ReviewQueue') },
      { path: 'studio/questions', element: page(faculty, 'QuestionBank') },
      { path: 'studio/workshops', element: page(faculty, 'WorkshopReview') },
    ],
    mentor: [{ path: 'mentor', element: page(mentor, 'MentorHome') }],
    admin: [{ path: 'admin', element: page(admin, 'AdminHome') }],
  },
};
