import PDFDocument from 'pdfkit';
import { createDbmsSubject } from '../src/db/dbmsSyllabus.js';
import { SyllabusVersion } from '../src/modules/org/model.js';
import { makeUser } from './helpers.js';

let n = 0;

/**
 * A DBMS subject in its own syllabus version with an owning faculty, a second faculty,
 * an admin, a student in the version and a student outside it.
 */
export async function dbmsFixture(status = 'approved') {
  n += 1;
  const version = await SyllabusVersion.create({
    university: 'Pondicherry University',
    regulation: 'R2023',
    branch: `CSE-${n}-${Date.now()}`,
    academicYear: '2025-26',
  });
  const faculty = await makeUser('faculty');
  const otherFaculty = await makeUser('faculty');
  const student = await makeUser('student', { syllabusVersionId: version._id });
  const outsider = await makeUser('student');
  const admin = await makeUser('admin');
  const dbms = await createDbmsSubject({
    syllabusVersionId: version._id,
    facultyIds: [faculty.id],
    status,
    code: `CS${n}`,
  });
  const id = (key) => String(dbms.topics[key]._id);
  return {
    version,
    faculty,
    otherFaculty,
    student,
    outsider,
    admin,
    ...dbms,
    id,
    sid: String(dbms.subject._id),
  };
}

/** Renders a PDF in memory. With `text`, the PDF has real text; without, only a filled box (like a scan). */
export function makePdf(text) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    if (text) doc.fontSize(12).text(text);
    else doc.rect(50, 50, 400, 600).fill('#888888');
    doc.end();
  });
}
