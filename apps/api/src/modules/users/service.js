import bcrypt from 'bcryptjs';

import { badRequest, notFound, unauthorized } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { hashPassword, revokeAllSessions } from '../auth/service.js';
import { User, toPublicUser } from './model.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listUsers(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.syllabusVersionId) filter.syllabusVersionId = query.syllabusVersionId;
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

export async function adminUpdateUser(id, input, actorId) {
  const user = await User.findById(id);
  if (!user) throw notFound('User');
  if (String(user._id) === actorId && input.role && input.role !== 'admin') {
    throw badRequest('You cannot remove your own admin role');
  }
  if (String(user._id) === actorId && input.isActive === false) {
    throw badRequest('You cannot deactivate your own account');
  }
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

export async function deactivateUser(id, actorId) {
  if (id === actorId) throw badRequest('You cannot deactivate your own account');
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  ).lean();
  if (!user) throw notFound('User');
  await revokeAllSessions(id);
  await audit({ actorId, action: 'user.deactivate', target: { type: 'user', id } });
  return toPublicUser(user);
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
