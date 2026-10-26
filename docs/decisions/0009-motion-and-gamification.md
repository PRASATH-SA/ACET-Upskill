# ADR 0009 — framer-motion animation and a gamified student experience

- Status: accepted (2026-10-23)
- Builds on: ADR 0008 (E-Learning Kit design system)

## Context

The user asked for framer-motion animation on every component and for the app to feel gamified.

## Decision

### Motion

- `framer-motion@11.11.17` in `apps/web`. Shared presets live in `apps/web/src/lib/motion.js`
  (`spring`, `bouncy`, `soft`, `press`, `fadeUp`, `popIn`, `stagger`/`item`, `shake`, `motionOf`).
  Components use these instead of their own timings.
- Every shared primitive animates: Button/IconButton/Chip (spring hover and press), Card and
  EmptyState (rise in), Badge (pop), Tabs (a sliding pill via `layoutId`, panels slide in),
  Dialog/Drawer/Menu/Tooltip (spring in), Toast (spring in, slide out), Field (shake on error),
  ProgressBar/ProgressRing (fill from zero), StatTile (lift, count-up via `AnimatedNumber`),
  StepTracker (quest path: steps pop in, finished steps flip to gold, the track fills), Avatar.
- App shell: the logo wiggles, the sidebar and bottom-tab highlights slide between items
  (`layoutId`), and each section fades in. The page wrapper is keyed on the first path segment
  only, so moving inside a section (topic to topic) does not remount the page or lose state.
- Overlays animate in only. They still unmount immediately on close, so focus return and
  `useOverlay` behave exactly as before. Toasts are the exception and slide out.
- Accessibility: `<MotionConfig reducedMotion="user">` at the root turns movement into fades for
  people who ask for less motion; confetti is not drawn at all then, and `AnimatedNumber` shows
  the final value immediately. Decorative motion is `aria-hidden`.
- Tests: `MotionGlobalConfig.skipAnimations = true` in `src/test/setup.js`, and the `matchMedia`
  stub gained the legacy `addListener`/`removeListener` that framer-motion calls. The toast test
  now waits for the slide-out before checking removal.

### Gamification

- `packages/shared/src/gamification.js` (unit-tested): `gamify(progress)` derives XP, level,
  title and achievements from the existing `GET /me/progress` payload. **Nothing is stored or
  invented**, so the game always agrees with the mastery data.
  - XP per topic by mastery state: learning 10, practising 25, needs revision 30, mastered 50.
    A topic that decays to needs revision loses 20 XP, which nudges revision.
  - Levels follow a triangular curve (0, 100, 300, 600, 1000 … XP) with titles from Explorer
    to Legend.
  - Nine achievements (first steps, first mastery, 5 and 10 mastered, a whole subject, 3/7/30-day
    streaks, inbox zero), each with visible progress while locked.
- Web (`features/student/game/`): a level/XP/streak badge in the top bar for students, a level
  card on Home and Progress, an achievement grid on Progress, confetti (`celebrate()` and
  `<CelebrationLayer />`), star ratings, a combo meter and floating points.
- Level ups and new achievements are celebrated once per device (`localStorage`, wrapped in
  try/catch). The first visit only records the current state, so nobody gets a pile of toasts.
- Quiz: options slide in, wrong picks shake, correct answers bounce with a confetti burst, a
  combo meter counts consecutive correct answers during review, and the summary awards 0–3
  stars (from 40/70/90%).
- Revision: each reviewed card earns **the same** 10 session points whatever the rating, so the
  score never rewards rating "Easy" after forgetting (that would corrupt the FSRS schedule).
  The session ends with confetti.
- Code lab: an accepted solution celebrates (bigger on a first solve); a failed one shakes.

## Consequences

- No API or data-model change. Faculty, mentor and admin screens get the motion but not the
  game layer.
- Session points (quiz combo, revision points) are per session and are not saved; only XP and
  achievements, which come from real mastery, persist.
