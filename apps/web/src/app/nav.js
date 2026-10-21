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
  Users,
  Wrench,
} from 'lucide-react';

/**
 * Role-based navigation (F1). `mobile: true` items appear in the bottom tab bar (max 4).
 * `end` makes the link active only on an exact match.
 */
export const NAV = {
  student: [
    { to: '/learn', label: 'Learn', icon: Map, mobile: true },
    { to: '/revision', label: 'Revision', icon: Brain, mobile: true },
    { to: '/exam-prep', label: 'Exam prep', icon: Target, mobile: true },
    { to: '/me/progress', label: 'Progress', icon: Activity, mobile: true },
    { to: '/code-lab', label: 'Code lab', icon: Code2 },
  ],
  faculty: [
    { to: '/studio', label: 'Studio', icon: LayoutDashboard, mobile: true, end: true },
    { to: '/studio/review', label: 'Review queue', icon: ClipboardCheck, mobile: true },
    { to: '/studio/questions', label: 'Question bank', icon: FileQuestion, mobile: true },
    { to: '/studio/workshops', label: 'Workshops', icon: Wrench, mobile: true },
  ],
  mentor: [
    { to: '/mentor', label: 'My students', icon: GraduationCap, mobile: true, end: true },
    { to: '/mentor/follow-ups', label: 'Follow-ups', icon: ListChecks, mobile: true },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: BarChart3, mobile: true, end: true },
    { to: '/admin/users', label: 'Users', icon: Users, mobile: true },
    { to: '/admin/syllabus', label: 'Syllabus', icon: BookOpen, mobile: true },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/co-po', label: 'CO–PO', icon: Target },
    { to: '/admin/ai', label: 'AI settings', icon: Bot, mobile: true },
  ],
};
