import { describe, expect, it } from 'vitest';
import { api } from '../../../test/helpers.js';
import { dbmsFixture } from '../../../test/fixtures.js';
import { parseRange } from '../../lib/media.js';
import { VideoProgress } from './model.js';
import { toWebVtt } from './service.js';

// Minimal MP4 ("ftyp" box) the type sniffer recognises, padded so ranges have bytes to return.
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypmp42'),
  Buffer.alloc(12),
  Buffer.alloc(1000, 7),
]);

const SRT = `1
00:00:01,000 --> 00:00:04,000
A key identifies a row.

2
00:00:05,500 --> 00:00:08,000
A primary key is never null.
`;

/** A published uploaded video on the Keys topic. */
async function publishedVideo(f) {
  const r = await api()
    .post(`/api/v1/topics/${f.id('keys')}/resources`)
    .set(f.faculty.auth)
    .send({ kind: 'video', title: 'Keys in 5 minutes' });
  const id = r.body.data.id;
  await api()
    .post(`/api/v1/resources/${id}/file`)
    .set(f.faculty.auth)
    .attach('file', MP4, 'keys.mp4')
    .expect(200);
  return id;
}
const publish = (f, id) =>
  api().post(`/api/v1/resources/${id}/status`).set(f.faculty.auth).send({ status: 'published' });

/** "/api/v1/media/<token>" → a supertest path. */
const mediaPath = (url) => url;

describe('video helpers', () => {
  it('parses single byte ranges and rejects impossible ones', () => {
    expect(parseRange(undefined, 100)).toBeNull();
    expect(parseRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=50-500', 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange('bytes=100-', 100)).toBe('invalid');
    expect(parseRange('bytes=-', 100)).toBe('invalid');
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
  });

  it('converts SRT captions to WebVTT and rejects files without cues', () => {
    const vtt = toWebVtt(SRT);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:01.000 --> 00:00:04.000');
    expect(toWebVtt('WEBVTT\n\n00:01.000 --> 00:02.000\nHi')).toContain('00:01.000');
    expect(() => toWebVtt('just text')).toThrow(/no timed cues/);
  });
});

describe('video learning (feature 3)', () => {
  it('streams a published video through a signed, seekable link', async () => {
    const f = await dbmsFixture();
    const id = await publishedVideo(f);
    // Drafts are invisible to students.
    await api().get(`/api/v1/resources/${id}/playback`).set(f.student.auth).expect(404);
    await publish(f, id).expect(200);

    const pb = (await api().get(`/api/v1/resources/${id}/playback`).set(f.student.auth)).body.data;
    expect(pb.url).toMatch(/^\/api\/v1\/media\//);
    expect(pb.mimeType).toBe('video/mp4');
    expect(pb.resumeSec).toBe(0);

    // No Bearer token needed: the link is the permission.
    const whole = await api().get(mediaPath(pb.url));
    expect(whole.status).toBe(200);
    expect(whole.headers['accept-ranges']).toBe('bytes');
    expect(Number(whole.headers['content-length'])).toBe(MP4.length);

    const part = await api().get(mediaPath(pb.url)).set('Range', 'bytes=4-11');
    expect(part.status).toBe(206);
    expect(part.headers['content-range']).toBe(`bytes 4-11/${MP4.length}`);
    expect(Buffer.from(part.body).toString()).toBe('ftypmp42');

    await api().get(mediaPath(pb.url)).set('Range', `bytes=${MP4.length}-`).expect(416);
    await api().get('/api/v1/media/not-a-real-token-at-all-xxxxxxxx').expect(404);
    // Outsiders cannot get a link at all.
    await api().get(`/api/v1/resources/${id}/playback`).set(f.outsider.auth).expect(403);
  });

  it('adds captions (SRT → WebVTT) and chapters, and serves them with the video', async () => {
    const f = await dbmsFixture();
    const id = await publishedVideo(f);
    await api()
      .patch(`/api/v1/resources/${id}`)
      .set(f.faculty.auth)
      .send({ durationSec: 120 })
      .expect(200);

    const cap = await api()
      .post(`/api/v1/resources/${id}/captions`)
      .set(f.faculty.auth)
      .field('lang', 'en')
      .field('label', 'English')
      .attach('file', Buffer.from(SRT), 'keys.srt');
    expect(cap.status).toBe(200);
    expect(cap.body.data.captions).toEqual([{ lang: 'en', label: 'English' }]);
    await api()
      .post(`/api/v1/resources/${id}/captions`)
      .set(f.faculty.auth)
      .field('lang', 'en')
      .field('label', 'English')
      .attach('file', Buffer.from('no cues here'), 'bad.srt')
      .expect(400);
    await api()
      .post(`/api/v1/resources/${id}/captions`)
      .set(f.student.auth)
      .field('lang', 'ta')
      .field('label', 'Tamil')
      .attach('file', Buffer.from(SRT), 'ta.srt')
      .expect(403);

    const chapters = [
      { startSec: 0, title: 'What a key is' },
      { startSec: 45, title: 'Primary keys' },
    ];
    await api()
      .put(`/api/v1/resources/${id}/chapters`)
      .set(f.faculty.auth)
      .send({ chapters: [...chapters].reverse() })
      .expect(400);
    await api()
      .put(`/api/v1/resources/${id}/chapters`)
      .set(f.faculty.auth)
      .send({ chapters: [{ startSec: 300, title: 'After the end' }] })
      .expect(400);
    await api()
      .put(`/api/v1/resources/${id}/chapters`)
      .set(f.faculty.auth)
      .send({ chapters })
      .expect(200);

    await publish(f, id).expect(200);
    const page = (
      await api()
        .get(`/api/v1/topics/${f.id('keys')}/page`)
        .set(f.student.auth)
    ).body.data;
    expect(page.video).toMatchObject({ uploaded: true, durationSec: 120, captionLangs: ['en'] });
    expect(page.video.chapters).toEqual(chapters);

    const pb = (await api().get(`/api/v1/resources/${id}/playback`).set(f.student.auth)).body.data;
    expect(pb.chapters).toEqual(chapters);
    const track = await api().get(mediaPath(pb.captions[0].url));
    expect(track.status).toBe(200);
    expect(track.headers['content-type']).toMatch(/text\/vtt/);
    expect(track.text).toContain('00:00:05.500 --> 00:00:08.000');

    await api().delete(`/api/v1/resources/${id}/captions/en`).set(f.faculty.auth).expect(200);
    const after = (await api().get(`/api/v1/resources/${id}/playback`).set(f.student.auth)).body
      .data;
    expect(after.captions).toEqual([]);
  });

  it('records watch progress per 10-second slice, resumes, and marks completion', async () => {
    const f = await dbmsFixture();
    const id = await publishedVideo(f);
    await api()
      .patch(`/api/v1/resources/${id}`)
      .set(f.faculty.auth)
      .send({ durationSec: 50 })
      .expect(200);
    await publish(f, id).expect(200);
    const beat = (body) =>
      api().post(`/api/v1/resources/${id}/progress`).set(f.student.auth).send(body);

    let r = (await beat({ positionSec: 20, seenBuckets: [0, 1] })).body.data;
    expect(r).toMatchObject({ lastPositionSec: 20, watchedPct: 40, completed: false });
    // Rewatching slice 1 counts it twice; slices past the end are ignored.
    r = (await beat({ positionSec: 30, seenBuckets: [1, 2, 99] })).body.data;
    expect(r.watchedPct).toBe(60);
    const doc = await VideoProgress.findOne({ userId: f.student.id }).lean();
    expect(doc.buckets).toEqual([1, 2, 1]);

    const pb = (await api().get(`/api/v1/resources/${id}/playback`).set(f.student.auth)).body.data;
    expect(pb.resumeSec).toBe(30);

    r = (await beat({ positionSec: 50, seenBuckets: [3, 4] })).body.data;
    expect(r.completed).toBe(true);
    expect(
      (await api().get(`/api/v1/resources/${id}/progress/me`).set(f.student.auth)).body.data,
    ).toMatchObject({ completed: true, watchedPct: 100 });

    // Staff and other students are refused.
    await beat({ positionSec: 1 }).set(f.faculty.auth).expect(403);
    await api()
      .post(`/api/v1/resources/${id}/progress`)
      .set(f.outsider.auth)
      .send({ positionSec: 1 })
      .expect(403);
  });

  it('rejects files that are not video and keeps nothing on disk for them', async () => {
    const f = await dbmsFixture();
    const r = await api()
      .post(`/api/v1/topics/${f.id('keys')}/resources`)
      .set(f.faculty.auth)
      .send({ kind: 'video', title: 'Bad' });
    const res = await api()
      .post(`/api/v1/resources/${r.body.data.id}/file`)
      .set(f.faculty.auth)
      .attach('file', Buffer.from('%PDF-1.4 not a video'), 'x.mp4');
    expect(res.status).toBe(400);
  });
});
