import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Page } from '../../components/layout/AppShell';
import { Button, EmptyState, EyebrowHeading, Select } from '../../components/ui';
import { useSubjectMap, useSubjects } from '../student/api';
import { QuestionsTab } from './content/editors';

/** Pick a subject and topic (used by the question bank and workshops screens). */
export function SubjectTopicPicker({
  subjectId,
  topicId,
  onSubject,
  onTopic,
  allowAllTopics,
  lockSubject,
}) {
  const subjects = useSubjects();
  const map = useSubjectMap(subjectId);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select
        label="Subject"
        value={subjectId ?? ''}
        onChange={(e) => onSubject?.(e.target.value || null)}
        disabled={lockSubject}
        placeholder="Choose a subject"
        options={(subjects.data ?? []).map((s) => ({
          value: s.id,
          label: `${s.code} · ${s.name}`,
        }))}
      />
      {onTopic && (
        <Select
          label="Topic"
          value={topicId ?? ''}
          onChange={(e) => onTopic(e.target.value || null)}
          placeholder={allowAllTopics ? 'All topics' : 'Choose a topic'}
          disabled={!map.data}
          options={(map.data?.topics ?? []).map((t) => ({ value: t.id, label: t.title }))}
        />
      )}
    </div>
  );
}

/** /studio/questions — quiz questions per topic, with editing and approval (F6.5). */
export function QuestionBank() {
  const [subjectId, setSubjectId] = useState(null);
  const [topicId, setTopicId] = useState(null);
  return (
    <Page>
      <EyebrowHeading eyebrow="Question bank" title="Quiz questions" level={1}>
        <p className="text-sm">Edit, approve and publish the MCQs students see in topic quizzes.</p>
      </EyebrowHeading>
      <div className="mt-5">
        <SubjectTopicPicker
          subjectId={subjectId}
          topicId={topicId}
          onSubject={(id) => {
            setSubjectId(id);
            setTopicId(null);
          }}
          onTopic={setTopicId}
        />
      </div>
      <div className="mt-6">
        {topicId ? (
          <QuestionsTab topicId={topicId} />
        ) : (
          <EmptyState
            icon={FileQuestion}
            title="Choose a topic"
            description="Pick a subject and topic to see its questions."
            action={
              <Button as={Link} to="/studio/review?kind=question" variant="secondary">
                Review question drafts
              </Button>
            }
          />
        )}
      </div>
    </Page>
  );
}
