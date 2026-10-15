import { assertCanAccessUser } from '../../lib/access.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { progressFor, studentAsAuthUser } from '../practice/service.js';
import { MentorNote } from './model.js';

/** Mentors see only their own notes; admins see all notes for a student. */
export async function listNotes(user, studentId) {
  await assertCanAccessUser(user, studentId, 'mentorNotes');
  const filter = { studentId, ...(user.role === 'mentor' ? { mentorId: user.id } : {}) };
  return MentorNote.find(filter).sort({ createdAt: -1 });
}

export async function createNote(user, studentId, input) {
  await assertCanAccessUser(user, studentId, 'mentorNotes');
  return MentorNote.create({ ...input, mentorId: user.id, studentId });
}

async function loadOwnNote(user, id) {
  const note = await MentorNote.findById(id);
  if (!note) throw notFound('Note');
  if (String(note.mentorId) !== user.id) throw forbidden('You can only change your own notes');
  return note;
}

export async function updateNote(user, id, input) {
  const note = await loadOwnNote(user, id);
  note.set(input);
  return note.save();
}

export async function deleteNote(user, id) {
  const note = await loadOwnNote(user, id);
  await note.deleteOne();
}

/** Open follow-ups for the mentor, soonest first. */
export async function followUps(user, { before } = {}) {
  return MentorNote.find({
    mentorId: user.id,
    done: false,
    followUpAt: { $ne: null, ...(before ? { $lte: before } : {}) },
  })
    .sort({ followUpAt: 1 })
    .populate('studentId', 'name email batch');
}

/** Student detail for a mentor: profile, progress and the mentor's notes. Access is audited. */
export async function studentDetail(user, studentId) {
  await assertCanAccessUser(user, studentId, 'mentorDetail');
  const student = await studentAsAuthUser(studentId);
  const [progress, notes] = await Promise.all([progressFor(student), listNotes(user, studentId)]);
  return {
    student: { id: student.id, name: student.name, email: student.email, batch: student.batch },
    progress,
    notes,
  };
}
