import { ListUsersQuerySchema } from '@acet/shared';
import { assertCanAccessUser } from '../../lib/access.js';
import { ok, pageMeta, q } from '../../lib/http.js';
import { currentUser } from '../../middleware/auth.js';
import * as users from './service.js';

export async function list(req, res) {
  const query = q(req, ListUsersQuerySchema);
  const { items, total } = await users.listUsers(query);
  ok(res, items, pageMeta(query.page, query.limit, total));
}

export async function get(req, res) {
  const actor = currentUser(req);
  await assertCanAccessUser(actor, req.params.id, 'profile');
  ok(res, await users.getUser(req.params.id));
}

export async function update(req, res) {
  ok(res, await users.adminUpdateUser(req.params.id, req.body, currentUser(req).id));
}

export async function deactivate(req, res) {
  ok(res, await users.deactivateUser(req.params.id, currentUser(req).id));
}

export async function updateMe(req, res) {
  ok(res, await users.updateProfile(currentUser(req).id, req.body.name));
}

export async function changePassword(req, res) {
  await users.changePassword(currentUser(req).id, req.body.currentPassword, req.body.newPassword);
  ok(res, { changed: true, message: 'Password changed. Other sessions were logged out.' });
}
