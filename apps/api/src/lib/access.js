/**
 * Ownership checks (A.6, B1). Route middleware handles roles; these helpers enforce
 * "faculty only for their subjects, mentor only for their students, student only for self".
 */

import { isAdminRole } from '@acet/shared';
import { audit } from '../modules/audit/service.js';
import { STUDENT_MAP_STATUSES, Subject, Topic } from '../modules/syllabus/model.js';
import { User } from '../modules/users/model.js';
import { forbidden, notFound } from './errors.js';
import { sameId } from '../db/mongoose.js';

export function isStaff(user) {
  return user.role === 'faculty' || isAdminRole(user.role);
}

/** Admin, or a faculty member assigned to the subject. */
export function canWriteSubject(user, subject) {
  if (isAdminRole(user.role)) return true;
  if (user.role !== 'faculty') return false;
  return (subject.facultyIds ?? []).some((f) => sameId(f, user.id));
}

/** Versions a mentor's students follow. */
async function mentorSyllabusVersions(mentorId) {
  const ids = await User.distinct('syllabusVersionId', { mentorId, role: 'student' });
  return ids.filter(Boolean).map(String);
}

export async function canReadSubject(user, subject) {
  switch (user.role) {
    case 'admin':
    case 'coordinator':
      return true;
    case 'faculty':
      return canWriteSubject(user, subject);
    case 'student':
      return sameId(subject.syllabusVersionId, user.syllabusVersionId);
    case 'mentor':
      return (await mentorSyllabusVersions(user.id)).includes(String(subject.syllabusVersionId));
    default:
      return false;
  }
}

export async function loadSubject(user, subjectId, mode) {
  const subject = await Subject.findById(subjectId);
  if (!subject) throw notFound('Subject');
  const allowed =
    mode === 'write' ? canWriteSubject(user, subject) : await canReadSubject(user, subject);
  if (!allowed) throw forbidden('You do not have access to this subject');
  return subject;
}

/**
 * Loads a topic and its subject with the same rules. Students get 404 for topics that are
 * not approved, so drafts are never revealed.
 */
export async function loadTopic(user, topicId, mode) {
  const topic = await Topic.findById(topicId);
  if (!topic) throw notFound('Topic');
  if (user.role === 'student' && !STUDENT_MAP_STATUSES.includes(topic.status)) {
    throw notFound('Topic');
  }
  const subject = await loadSubject(user, String(topic.subjectId), mode);
  return { topic, subject };
}

/** Subject ids a faculty member teaches. */
export async function facultySubjectIds(facultyId) {
  return (await Subject.distinct('_id', { facultyIds: facultyId })).map(String);
}

/**
 * Whether `actor` may see student `studentId`'s data:
 * self; admin; the student's mentor; or faculty teaching a subject in the student's syllabus version.
 */
export async function canAccessStudent(actor, studentId) {
  if (sameId(actor.id, studentId)) return true;
  if (isAdminRole(actor.role)) return true;
  const student = await User.findById(studentId).select('role mentorId syllabusVersionId').lean();
  if (!student || student.role !== 'student') return false;
  if (actor.role === 'mentor') return sameId(student.mentorId, actor.id);
  if (actor.role === 'faculty') {
    if (!student.syllabusVersionId) return false;
    return Boolean(
      await Subject.exists({ facultyIds: actor.id, syllabusVersionId: student.syllabusVersionId }),
    );
  }
  return false;
}

/**
 * Throws 403 unless the actor may access the user. Access to another user's data is audited (B1).
 */
export async function assertCanAccessUser(actor, userId, purpose) {
  if (sameId(actor.id, userId)) return;
  const exists = await User.exists({ _id: userId });
  if (!exists) throw notFound('User');
  if (!(await canAccessStudent(actor, userId)))
    throw forbidden('You do not have access to this user');
  await audit({
    actorId: actor.id,
    action: 'user.dataAccess',
    target: { type: 'user', id: userId },
    meta: { purpose },
  });
}
