import bcrypt from 'bcryptjs';
import { SUPER_ROLES } from '@acet/shared';

import { sameId } from '../../db/mongoose.js';
import { badRequest, forbidden, notFound, unauthorized } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { hashPassword, revokeAllSessions } from '../auth/service.js';
import { User, toPublicUser } from './model.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- HOD / coordinator scope ----------
// The Academic Coordinator manages every department. A HOD (`admin`) manages only users of
// their own department, and never HOD or coordinator accounts other than their own.

const isCoordinator = (actor) => actor.role === 'coordinator';

/** The department a HOD is limited to; throws if the HOD has none. Null for the coordinator. */
export function hodDepartment(actor) {
  if (isCoordinator(actor)) return null;
  if (!actor.departmentId) {
    throw forbidden('Your HOD account has no department. Ask the Academic Coordinator to set it.');
  }
  return actor.departmentId;
}

/** Throws unless the actor may edit or deactivate `user`. */
function assertCanManage(actor, user) {
  if (isCoordinator(actor) || sameId(user._id, actor.id)) return;
  const dept = hodDepartment(actor);
  if (!sameId(user.departmentId, dept)) throw forbidden('This user is not in your department');
  if (SUPER_ROLES.includes(user.role)) {
    throw forbidden('Only the Academic Coordinator can manage HOD and coordinator accounts');
  }
}

/**
 * Throws unless the actor may give a user these fields (role, department). Shared by create,
 * update and CSV import so a HOD cannot place users outside their department.
 */
export function assertCanAssign(actor, input) {
  if (isCoordinator(actor)) return;
  const dept = hodDepartment(actor);
  if (input.role && SUPER_ROLES.includes(input.role)) {
    throw forbidden('Only the Academic Coordinator can create HOD or coordinator accounts');
  }
  if (input.departmentId !== undefined && !sameId(input.departmentId, dept)) {
    throw forbidden('You can only place users in your own department');
  }
}

function assertTerm(yearOfStudy, semester) {
  if (yearOfStudy != null && semester != null && Math.ceil(semester / 2) !== yearOfStudy) {
    throw badRequest(
      `Semester ${semester} is not in year ${yearOfStudy} (year y → semester 2y−1 or 2y)`,
    );
  }
}

// ---------- users ----------

export async function listUsers(actor, query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (!isCoordinator(actor)) {
    filter.departmentId = hodDepartment(actor);
    filter.role =
      query.role === 'coordinator' ? { $in: [] } : (query.role ?? { $ne: 'coordinator' });
  }
  if (query.syllabusVersionId) filter.syllabusVersionId = query.syllabusVersionId;
  if (query.yearOfStudy) filter.yearOfStudy = query.yearOfStudy;
  if (query.semester) filter.semester = query.semester;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return { items: items.map(toPublicUser), total };
}

export async function getUser(id) {
  const user = await User.findById(id).lean();
  if (!user) throw notFound('User');
  return toPublicUser(user);
}

export async function adminUpdateUser(id, input, actor) {
  const actorId = actor.id;
  const user = await User.findById(id);
  if (!user) throw notFound('User');
  assertCanManage(actor, user);
  const self = String(user._id) === actorId;
  if (self && input.role && input.role !== user.role) {
    throw badRequest('You cannot change your own role');
  }
  if (self && input.isActive === false) {
    throw badRequest('You cannot deactivate your own account');
  }
  if (!self) assertCanAssign(actor, input);
  else if (
    !isCoordinator(actor) &&
    input.departmentId !== undefined &&
    !sameId(input.departmentId, user.departmentId)
  ) {
    throw forbidden('Only the Academic Coordinator can move a HOD to another department');
  }
  assertTerm(
    input.yearOfStudy !== undefined ? input.yearOfStudy : user.yearOfStudy,
    input.semester !== undefined ? input.semester : user.semester,
  );
  const previousRole = user.role;
  user.set(input);
  await user.save();
  if (input.role && input.role !== previousRole) {
    await audit({
      actorId,
      action: 'user.roleChange',
      target: { type: 'user', id },
      meta: { from: previousRole, to: input.role },
    });
  }
  if (input.isActive === false) await revokeAllSessions(id);
  await audit({
    actorId,
    action: 'user.update',
    target: { type: 'user', id },
    meta: { fields: Object.keys(input) },
  });
  return toPublicUser(user.toObject());
}

export async function deactivateUser(id, actor) {
  if (id === actor.id) throw badRequest('You cannot deactivate your own account');
  const target = await User.findById(id).select('role departmentId').lean();
  if (!target) throw notFound('User');
  assertCanManage(actor, target);
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  ).lean();
  await revokeAllSessions(id);
  await audit({ actorId: actor.id, action: 'user.deactivate', target: { type: 'user', id } });
  return toPublicUser(user);
}

/**
 * POST /users/term — the HOD sets the year of study and semester of many students at once.
 * Ids that are not students of the HOD's department are skipped and counted.
 */
export async function setStudentTerm(actor, { userIds, yearOfStudy, semester }) {
  const dept = hodDepartment(actor);
  const filter = {
    _id: { $in: userIds },
    role: 'student',
    ...(dept ? { departmentId: dept } : {}),
  };
  const res = await User.updateMany(filter, { $set: { yearOfStudy, semester } });
  await audit({
    actorId: actor.id,
    action: 'user.setTerm',
    target: { type: 'user' },
    meta: { yearOfStudy, semester, updated: res.matchedCount },
  });
  return { updated: res.matchedCount, skipped: new Set(userIds).size - res.matchedCount };
}

export async function updateProfile(id, name) {
  const user = await User.findByIdAndUpdate(id, { $set: { name } }, { new: true }).lean();
  if (!user) throw notFound('User');
  return toPublicUser(user);
}

export async function changePassword(id, currentPassword, newPassword) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user) throw notFound('User');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw unauthorized('Current password is incorrect');
  if (currentPassword === newPassword) throw badRequest('New password must be different');
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await revokeAllSessions(id);
  await audit({ actorId: id, action: 'user.passwordChange', target: { type: 'user', id } });
}
