import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Building2,
  ClipboardCheck,
  Code2,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Map,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';

/**
 * Role-based navigation (F1). `mobile: true` items appear in the bottom tab bar (max 4).
 * `end` makes the link active only on an exact match.
 */
export const NAV = {
  // Ordered by the learner's need: take in something new, keep it (revision is due daily),
  // apply it, aim it at the exam, then reflect on own progress. Comparison with classmates
  // comes last, so it motivates without being the first thing a struggling student sees.
  student: [
    { to: '/learn', label: 'Learn', icon: Map, mobile: true },
    { to: '/revision', label: 'Revision', icon: Brain, mobile: true },
    { to: '/code-lab', label: 'Code lab', icon: Code2 },
    { to: '/exam-prep', label: 'Exam prep', icon: Target, mobile: true },
    { to: '/me/progress', label: 'Progress', icon: Activity, mobile: true },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ],
  faculty: [
    { to: '/studio', label: 'Studio', icon: LayoutDashboard, mobile: true, end: true },
    { to: '/studio/review', label: 'Review queue', icon: ClipboardCheck, mobile: true },
    { to: '/studio/questions', label: 'Question bank', icon: FileQuestion, mobile: true },
    { to: '/studio/workshops', label: 'Workshops', icon: Wrench, mobile: true },
    { to: '/studio/students', label: 'Student progress', icon: TrendingUp },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ],
  mentor: [
    { to: '/mentor', label: 'My students', icon: GraduationCap, mobile: true, end: true },
    { to: '/mentor/follow-ups', label: 'Follow-ups', icon: ListChecks, mobile: true },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, mobile: true },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: BarChart3, mobile: true, end: true },
    { to: '/admin/users', label: 'Users', icon: Users, mobile: true },
    { to: '/admin/progress', label: 'Department progress', icon: TrendingUp, mobile: true },
    { to: '/admin/syllabus', label: 'Syllabus', icon: BookOpen, mobile: true },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/admin/co-po', label: 'CO–PO', icon: Target },
    { to: '/admin/ai', label: 'AI settings', icon: Bot },
  ],
  // Academic Coordinator: the HOD screens across every department, plus departments.
  coordinator: [
    { to: '/admin', label: 'Overview', icon: BarChart3, mobile: true, end: true },
    { to: '/admin/users', label: 'Users', icon: Users, mobile: true },
    { to: '/admin/departments', label: 'Departments', icon: Building2, mobile: true },
    { to: '/admin/progress', label: 'Department progress', icon: TrendingUp, mobile: true },
    { to: '/admin/syllabus', label: 'Syllabus', icon: BookOpen },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/admin/co-po', label: 'CO–PO', icon: Target },
    { to: '/admin/ai', label: 'AI settings', icon: Bot },
  ],
};
