/**
 * zod schemas for every generation task (A.7.3). They mirror prompts/<task>.v1.schema.json,
 * which is what the model is asked to follow; these are what the output is validated against.
 * Refinements here catch what JSON schema can't (e.g. one explanation per option).
 */
import { z } from 'zod';

const str = (min, max) => z.string().trim().min(min).max(max);

export const SyllabusTopicsSchema = z.object({
  topics: z
    .array(
      z.object({
        title: str(2, 120),
        summary: z.string().trim().max(300),
        subtopics: z
          .array(z.object({ title: str(2, 120), summary: z.string().trim().max(300) }))
          .max(8),
      }),
    )
    .min(1)
    .max(15),
});

const linkItem = z.object({
  from: z.number().int().min(1),
  to: z.number().int().min(1),
  reason: str(3, 240),
  confidence: z.number().min(0).max(1),
});
export const PrereqLinksSchema = z.object({ links: z.array(linkItem).max(40) });
export const CrossLinksSchema = z.object({ links: z.array(linkItem).max(8) });

export const EasySchema = z.object({ text: str(40, 1600), analogy: str(10, 400) });

/**
 * Exam study material (kind `tenMark`). v2 adds key terms, short answers and exam tips; they are
 * optional here so v1 outputs still validate.
 */
export const TenMarkSchema = z.object({
  definition: str(10, 600),
  need: str(10, 800),
  keyTerms: z
    .array(z.object({ term: str(2, 300), meaning: str(2, 800) }))
    .max(10)
    .optional(),
  shortAnswers: z
    .array(z.object({ question: str(2, 300), answer: str(2, 800) }))
    .max(6)
    .optional(),
  examTips: z.array(str(5, 300)).max(5).optional(),
  points: z
    .array(z.object({ heading: str(2, 100), text: str(10, 800) }))
    .min(3)
    .max(10),
  example: str(10, 1500),
  advantages: z.array(str(3, 300)).min(2).max(6),
  conclusion: str(10, 600),
});

export const FlashcardsSchema = z.object({
  cards: z
    .array(z.object({ front: str(5, 300), back: str(2, 600) }))
    .min(1)
    .max(5),
});

const distinct = (arr) => new Set(arr.map((s) => s.toLowerCase())).size === arr.length;

export const McqsSchema = z.object({
  questions: z
    .array(
      z
        .object({
          stem: str(5, 600),
          options: z.array(str(1, 300)).length(4),
          correctIndex: z.number().int().min(0).max(3),
          explanation: str(5, 800),
          optionExplanations: z.array(z.string().trim().max(500)).length(4),
          difficulty: z.enum(['easy', 'medium', 'hard']),
        })
        .refine((q) => distinct(q.options), {
          message: 'options must be different',
          path: ['options'],
        }),
    )
    .min(1)
    .max(5),
});

export const CuriositySchema = z
  .object({
    title: str(3, 120),
    scenario: str(20, 1200),
    question: str(5, 400),
    options: z.array(str(1, 300)).length(3),
    correctIndex: z.number().int().min(0).max(2),
    explanation: str(5, 800),
    optionExplanations: z.array(z.string().trim().max(500)).length(3),
  })
  .refine((q) => distinct(q.options), { message: 'options must be different', path: ['options'] });

export const RealWorldSchema = z.object({
  uses: z.array(str(5, 300)).min(3).max(5),
  workshop: z.object({ title: str(3, 120), brief: str(20, 2000), deliverable: str(5, 300) }),
});

export const SelfCheckSchema = z.object({ answerIndex: z.number().int().min(-1).max(5) });

/** mcq.variants: same item shape as topic.mcqs. */
export const McqVariantsSchema = McqsSchema;

export const ExplainScoreSchema = z.object({
  perCriterion: z
    .array(
      z.object({
        criterionId: str(1, 40),
        score: z.number().int().min(0).max(10),
        evidence: z.string().trim().max(400),
        missing: z.string().trim().max(300),
      }),
    )
    .min(1)
    .max(6),
  feedback: str(10, 600),
});

export const RubricDraftSchema = z
  .object({
    prompt: str(10, 300),
    criteria: z
      .array(
        z.object({
          text: str(3, 300),
          points: z.number().int().min(1).max(3),
          keyIdeas: z.array(str(1, 120)).min(1).max(4),
        }),
      )
      .min(2)
      .max(4),
    passScore: z.number().int().min(1).max(12),
  })
  .refine((r) => r.passScore <= r.criteria.reduce((n, c) => n + c.points, 0), {
    message: 'passScore cannot exceed the total points',
    path: ['passScore'],
  });

export const PyqTagSchema = z.object({
  picks: z
    .array(
      z.object({
        candidate: z.number().int().min(1).max(10),
        confidence: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(3),
});

/** subject.overview.v1: the written part of a subject's root page, from the syllabus only. */
export const SubjectOverviewDraftSchema = z.object({
  tagline: str(5, 160),
  why: str(20, 800),
  prerequisites: z.array(z.object({ title: str(2, 80), why: z.string().trim().max(240) })).max(5),
  outcomes: z.array(str(5, 200)).min(1).max(6),
  applications: z
    .array(z.object({ title: str(2, 80), description: z.string().trim().max(240) }))
    .max(5),
  units: z
    .array(
      z.object({
        number: z.number().int().min(1).max(20),
        summary: z.string().trim().max(300),
        youWillBeAbleTo: z.string().trim().max(240),
        leadsTo: z.string().trim().max(240),
      }),
    )
    .max(20),
});
