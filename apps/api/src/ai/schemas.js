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

export const TenMarkSchema = z.object({
  definition: str(10, 600),
  need: str(10, 800),
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
