import { ListSubjectsQuerySchema, SearchQuerySchema } from '@acet/shared';
import { loadSubject } from '../../lib/access.js';
import { created, ok, q } from '../../lib/http.js';
import { currentUser } from '../../middleware/auth.js';
import * as s from './service.js';

const id = (req) => req.params.id;

export const listSubjects = async (req, res) =>
  ok(res, await s.listSubjects(currentUser(req), q(req, ListSubjectsQuerySchema)));
export const getSubject = async (req, res) =>
  ok(res, await loadSubject(currentUser(req), id(req), 'read'));
export const createSubject = async (req, res) =>
  created(res, await s.createSubject(req.body, currentUser(req)));
export const updateSubject = async (req, res) =>
  ok(res, await s.updateSubject(id(req), req.body, currentUser(req)));
export const deleteSubject = async (req, res) => {
  await s.deleteSubject(id(req), currentUser(req));
  ok(res, { deleted: true });
};

export const listUnits = async (req, res) => ok(res, await s.listUnits(currentUser(req), id(req)));
export const createUnit = async (req, res) =>
  created(res, await s.createUnit(currentUser(req), id(req), req.body));
export const updateUnit = async (req, res) =>
  ok(res, await s.updateUnit(currentUser(req), id(req), req.body));
export const deleteUnit = async (req, res) => {
  await s.deleteUnit(currentUser(req), id(req));
  ok(res, { deleted: true });
};

export const createTopic = async (req, res) =>
  created(res, await s.createTopic(currentUser(req), id(req), req.body));
export const updateTopic = async (req, res) =>
  ok(res, await s.updateTopic(currentUser(req), id(req), req.body));
export const deleteTopic = async (req, res) => {
  await s.deleteTopic(currentUser(req), id(req));
  ok(res, { deleted: true });
};

export const createLink = async (req, res) =>
  created(res, await s.createLink(currentUser(req), id(req), req.body));
export const updateLink = async (req, res) =>
  ok(res, await s.updateLink(currentUser(req), id(req), req.body));
export const deleteLink = async (req, res) => {
  await s.deleteLink(currentUser(req), id(req));
  ok(res, { deleted: true });
};

export const getMap = async (req, res) => ok(res, await s.getMap(currentUser(req), id(req)));
export const saveMap = async (req, res) =>
  ok(res, await s.saveMap(currentUser(req), id(req), req.body));
export const approveMap = async (req, res) =>
  ok(res, await s.approveMap(currentUser(req), id(req)));
export const learningOrder = async (req, res) =>
  ok(res, await s.learningOrder(currentUser(req), id(req)));
export const crossUnitLinks = async (req, res) =>
  ok(res, await s.crossUnitLinks(currentUser(req), id(req)));
export const prerequisites = async (req, res) =>
  ok(res, await s.prerequisitesOf(currentUser(req), id(req)));
export const unlocks = async (req, res) => ok(res, await s.unlocks(currentUser(req), id(req)));

export const search = async (req, res) => {
  const { q: term, limit } = q(req, SearchQuerySchema);
  ok(res, await s.search(currentUser(req), term, limit));
};
