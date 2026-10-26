# SkillUp faculty guide

You build each subject's concept map, upload your material, let the local AI draft content from
it, and approve what students see. **Nothing reaches students until you publish it.**

## 1. Build the map

**Studio → your subject → Build the map.**

1. Upload the **syllabus PDF** (a text PDF; scanned PDFs can't be read yet).
2. **Draft map with AI.** Progress shows live; you can leave the page and come back.
3. Check the draft: drag topics, add or delete links. A *prerequisite* link (solid) means "learn
   this first"; a *related* link (dashed) is a useful connection. Every link has a one-line reason
   students can read.
4. **Approve map.** Students now see the topics, still without content.

You can also build or fix the map by hand: add units, topics and links in the same screen.

## 2. Add material and draft content

Open a topic (**Edit content**).

1. Upload your **notes** (PDF works best; PPTX/DOCX are stored but not read by the AI yet).
   Wait for **Ready for AI**.
2. Choose what to draft (easy explanation, exam study material, flashcards, quiz MCQs, curiosity
   question, real-world uses) and press **Draft with AI**.
3. The AI writes **only from your uploaded notes**. If there isn't enough material, it says so and
   creates nothing: upload more and try again.

Drafts appear in each tab marked **AI draft**. MCQs the AI's self-check disagrees with are marked
**Needs attention**.

## 3. Review and publish

- In a topic's tabs: edit a draft, then **Approve & publish**. **Unpublish** takes it back.
- **Review queue** (menu) lists every draft across your subjects, with the source passages from
  your notes next to each one. Approve, edit or reject; select several to approve at once.
- Only faculty assigned to the subject can approve or publish. Every change is logged.

## 4. Videos, quizzes and code problems

- **Video:** in a topic's **Video** tab, paste a YouTube (or Vimeo) link.
- **Quiz:** add MCQs by hand or with AI in the **Quiz** tab; the **Question bank** lists them all.
- **Code lab:** write SQL problems: tables with sample rows, a problem statement, your reference
  query, optional hidden rows (catch hard-coded answers) and hints. Saving runs your query first,
  so a broken problem can't be published. **Try it** opens the problem as a student sees it.

## 5. Workshops and outcomes

- **Workshops** (menu): **New workshop** gives a topic a brief and a due date; grade the
  submissions on the same screen.
- **Course outcomes:** the HOD maps COs to POs and topics to COs under **CO–PO**. The attainment
  report is calculated from students' quiz results.

## Not in the app yet

The server already supports these, but they have no screen yet; your administrator can use them
through the API (`docs/api.md`) until they do:

- uploading an MP4 video file, with captions and chapters;
- AI **question variants** (more questions on the same idea, so neighbours get different ones);
- entering **previous-year questions** and tagging them to topics with AI;
- **explain-it-back** rubrics, student answers and spot-checks.

## 6. Insights

**Studio → subject → Insights** shows, per topic, the average quiz score, how many students
haven't started, who needs revision, and the questions students most often ask the tutor. Use it
to decide what to re-teach in class.

## Good to know

- The AI runs on the college server; student data never goes to an outside service.
- If the AI is offline, everything else keeps working and AI buttons show *AI service offline*.
- You only see your own subjects and classes.
