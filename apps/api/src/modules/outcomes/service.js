import PDFDocument from 'pdfkit';
import { env } from '../../config/env.js';
import { withTransaction } from '../../db/connect.js';
import { sameId } from '../../db/mongoose.js';
import { loadSubject } from '../../lib/access.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { audit } from '../audit/service.js';
import { Attempt } from '../practice/model.js';
import { Topic } from '../syllabus/model.js';
import { User } from '../users/model.js';
import { attainmentCsv, computeAttainment } from './attainment.js';
import { CourseOutcome, TopicCO } from './model.js';

export async function listCos(user, subjectId) {
  await loadSubject(user, subjectId, 'write');
  const cos = await CourseOutcome.find({ subjectId }).sort({ code: 1 }).lean();
  const links = await TopicCO.find({ coId: { $in: cos.map((c) => c._id) } }).lean();
  return cos.map(({ _id, __v: _v, ...c }) => ({
    id: String(_id),
    ...c,
    topicIds: links.filter((l) => sameId(l.coId, _id)).map((l) => String(l.topicId)),
  }));
}

export async function createCo(user, subjectId, input) {
  await loadSubject(user, subjectId, 'write');
  const co = await CourseOutcome.create({ ...input, subjectId });
  await audit({
    actorId: user.id,
    action: 'co.create',
    target: { type: 'courseOutcome', id: String(co._id) },
  });
  return co;
}

async function loadCo(user, id) {
  const co = await CourseOutcome.findById(id);
  if (!co) throw notFound('Course outcome');
  await loadSubject(user, String(co.subjectId), 'write');
  return co;
}

export async function updateCo(user, id, input) {
  const co = await loadCo(user, id);
  co.set(input);
  return co.save();
}

export async function deleteCo(user, id) {
  const co = await loadCo(user, id);
  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await TopicCO.deleteMany({ coId: co._id }, opts);
    await co.deleteOne(opts);
  });
}

/** PUT /course-outcomes/:id/topics — replaces the CO's topic mapping. */
export async function setCoTopics(user, id, topicIds) {
  const co = await loadCo(user, id);
  const count = await Topic.countDocuments({ _id: { $in: topicIds }, subjectId: co.subjectId });
  if (count !== new Set(topicIds).size)
    throw badRequest('Every topicId must be a topic of this subject');
  await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    await TopicCO.deleteMany({ coId: co._id }, opts);
    if (topicIds.length)
      await TopicCO.insertMany(
        [...new Set(topicIds)].map((topicId) => ({ topicId, coId: co._id })),
        opts,
      );
  });
  await audit({
    actorId: user.id,
    action: 'co.mapTopics',
    target: { type: 'courseOutcome', id },
    meta: { topics: topicIds.length },
  });
  return { coId: id, topicIds: [...new Set(topicIds)] };
}

/** GET /subjects/:id/co-attainment — attainment per CO and PO for the subject's students. */
export async function attainment(user, subjectId, threshold = env().CO_ATTAINMENT_THRESHOLD) {
  const subject = await loadSubject(user, subjectId, 'write');
  const cos = await CourseOutcome.find({ subjectId }).sort({ code: 1 }).lean();
  const links = await TopicCO.find({ coId: { $in: cos.map((c) => c._id) } }).lean();
  const coTopics = new Map();
  for (const l of links) {
    const k = String(l.coId);
    if (!coTopics.has(k)) coTopics.set(k, []);
    coTopics.get(k).push(String(l.topicId));
  }
  // Only students of this subject's syllabus version count.
  const studentIds = await User.distinct('_id', {
    role: 'student',
    syllabusVersionId: subject.syllabusVersionId,
  });
  const topicIds = [...new Set(links.map((l) => l.topicId))];
  const attempts = await Attempt.find({
    subjectId,
    topicId: { $in: topicIds },
    userId: { $in: studentIds },
  })
    .select('userId topicId questionId correct answeredAt')
    .lean();
  const report = computeAttainment({
    cos: cos.map((c) => ({
      id: String(c._id),
      code: c.code,
      text: c.text,
      poMappings: c.poMappings ?? [],
    })),
    coTopics,
    attempts: attempts.map((a) => ({
      userId: String(a.userId),
      topicId: String(a.topicId),
      questionId: String(a.questionId),
      correct: a.correct,
      answeredAt: a.answeredAt,
    })),
    threshold,
  });
  return {
    subject: {
      id: String(subject._id),
      code: subject.code,
      name: subject.name,
      semester: subject.semester,
    },
    generatedAt: new Date(),
    ...report,
  };
}

export function toCsv(report) {
  return attainmentCsv(report, report.subject);
}

/** Renders the attainment report as a simple A4 PDF. */
export function toPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: { Title: `CO-PO attainment ${report.subject.code}` },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const navy = '#0F2D5C';
    doc
      .fillColor('#E0262B')
      .fontSize(9)
      .text('ACET SKILLUP · CO–PO ATTAINMENT', { characterSpacing: 2 });
    doc
      .moveDown(0.3)
      .fillColor(navy)
      .fontSize(18)
      .text(`${report.subject.code} — ${report.subject.name}`);
    doc
      .moveDown(0.2)
      .fillColor('#5B6577')
      .fontSize(10)
      .text(
        `Semester ${report.subject.semester} · threshold ${report.threshold}% · generated ${report.generatedAt.toISOString().slice(0, 10)}`,
      );
    doc.moveDown(1);

    const row = (cells, widths, opts = {}) => {
      const y = doc.y;
      let x = doc.page.margins.left;
      cells.forEach((c, i) => {
        doc
          .fillColor(opts.header ? navy : '#1F2937')
          .fontSize(opts.header ? 9 : 9)
          .font(opts.header ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(c), x, y, { width: widths[i] - 6 });
        x += widths[i];
      });
      doc.moveDown(0.6);
      doc.x = doc.page.margins.left;
    };

    doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text('Course outcomes');
    doc.moveDown(0.4);
    const w = [44, 220, 60, 60, 60, 40];
    row(['CO', 'Statement', 'Assessed', 'Attained', 'Attain %', 'Level'], w, { header: true });
    for (const c of report.cos)
      row(
        [
          c.code,
          c.text,
          c.studentsAssessed,
          c.studentsAttained,
          c.attainmentPercent ?? '—',
          c.level ?? '—',
        ],
        w,
      );

    doc.moveDown(1).fillColor(navy).fontSize(12).font('Helvetica-Bold').text('Programme outcomes');
    doc.moveDown(0.4);
    row(['PO', 'Attainment (0–3)'], [60, 120], { header: true });
    for (const p of report.pos) row([p.po, p.attainment], [60, 120]);

    doc
      .moveDown(1)
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#5B6577')
      .text(
        'Method: a student attains a CO when their latest answers to its topic questions are at or above the threshold. ' +
          'Level 3 ≥ 70 % of assessed students, 2 ≥ 60 %, 1 ≥ 50 %. PO attainment is the correlation-weighted mean of CO levels.',
      );
    doc.end();
  });
}
