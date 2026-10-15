import { useState } from 'react';
import {
  Award,
  BookOpen,
  Brain,
  Inbox,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { COLORS, SUPPORT_COLORS } from '@acet/shared';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  Drawer,
  EmptyState,
  EyebrowHeading,
  IconButton,
  Input,
  LoadingBlock,
  Menu,
  ProgressBar,
  Select,
  Skeleton,
  StatTile,
  StepTracker,
  Tabs,
  Textarea,
  Tooltip,
  toast,
} from '../components/ui';

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-8 first:border-t-0">
      <h2 id={id} className="mb-5 text-xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ children }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

/** Dev-only catalogue of every UI component in every state (F1). */
export function DesignPage() {
  const [tab, setTab] = useState('one');
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [chip, setChip] = useState('all');
  const [step, setStep] = useState('remember');

  const swatches = { ...COLORS, ...SUPPORT_COLORS };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <EyebrowHeading eyebrow="Design system" title="SkillUp components" level={1}>
        <p>Every component in every state. Tab through the page to check focus rings.</p>
      </EyebrowHeading>

      <Section id="ds-colors" title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(swatches).map(([name, hex]) => (
            <li key={name} className="overflow-hidden rounded-xl border border-line bg-card">
              <div className="h-14" style={{ background: hex }} />
              <div className="p-2 text-xs">
                <p className="font-semibold text-navy">{name}</p>
                <p>{hex}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="ds-type" title="Typography">
        <p className="eyebrow">Eyebrow label</p>
        <h1 className="mt-1">Heading 1 · Montserrat 800</h1>
        <h2 className="mt-3">Heading 2</h2>
        <h3 className="mt-3">Heading 3 · Montserrat 700</h3>
        <p className="mt-3 max-w-prose">
          Body text is Inter 400 at line-height 1.7. Normalization splits a table into smaller
          tables so that each fact is stored once. <strong>Strong text is navy.</strong>{' '}
          <a href="#ds-type">Links are blue.</a>
        </p>
      </Section>

      <Section id="ds-buttons" title="Buttons">
        <Row>
          <Button>Start topic</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="navy" icon={Sparkles}>
            Draft with AI
          </Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm" variant="secondary" icon={Plus}>
            Small
          </Button>
          <Button size="lg">Large</Button>
        </Row>
        <Row>
          <div className="mt-4 flex gap-2">
            <IconButton icon={Settings} label="Settings" />
            <IconButton icon={Plus} label="Add topic" variant="outline" />
            <IconButton icon={Trash2} label="Delete" variant="navy" />
            <IconButton icon={Plus} label="Disabled action" variant="outline" disabled />
          </div>
        </Row>
      </Section>

      <Section id="ds-cards" title="Cards and headings">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <EyebrowHeading eyebrow="Selected topic" title="Normalization" level={3}>
              <p className="text-sm">Default card with an eyebrow heading.</p>
            </EyebrowHeading>
          </Card>
          <Card tone="navy">
            <EyebrowHeading eyebrow="Exam insight" title="Asked 4× in 5 years" level={3} light />
            <p className="mt-2 text-sm text-white/80">Navy panel.</p>
          </Card>
          <Card tone="gold">
            <EyebrowHeading eyebrow="Achievement" title="Unit 3 mastered" level={3} />
          </Card>
        </div>
      </Section>

      <Section id="ds-badges" title="Badges and chips">
        <Row>
          <Badge>Neutral</Badge>
          <Badge tone="navy">Navy</Badge>
          <Badge tone="blue">Current</Badge>
          <Badge tone="gold" icon={Award}>
            Mastered
          </Badge>
          <Badge tone="red">Rejected</Badge>
          <Badge tone="green">Published</Badge>
          <Badge tone="orange">Needs revision</Badge>
        </Row>
        <div className="mt-4">
          <Row>
            {['all', 'unit 3', 'unit 4'].map((c) => (
              <Chip key={c} selected={chip === c} onClick={() => setChip(c)}>
                {c}
              </Chip>
            ))}
          </Row>
        </div>
      </Section>

      <Section id="ds-tabs" title="Tabs">
        <Tabs
          label="Example tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'one', label: 'Easy', content: <p>Panel one. Use arrow keys on the tabs.</p> },
            { value: 'two', label: '10-mark', count: 2, content: <p>Panel two.</p> },
            { value: 'three', label: 'Flashcards', icon: Brain, content: <p>Panel three.</p> },
          ]}
        />
      </Section>

      <Section id="ds-forms" title="Form controls">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="College email" type="email" placeholder="name@acet.edu.in" required />
          <Input label="With hint" hint="At least 8 characters with a number." />
          <Input label="With error" error="This email is not registered." defaultValue="bad@" />
          <Input label="Disabled" disabled defaultValue="Read only" />
          <Select
            label="Unit"
            placeholder="All units"
            options={[
              { value: '3', label: 'Unit 3 · Database Design' },
              { value: '4', label: 'Unit 4 · Indexing' },
            ]}
          />
          <Select
            label="Select with error"
            error="Pick a unit"
            options={[{ value: 'a', label: 'A' }]}
          />
          <Textarea
            label="Feedback"
            placeholder="Write feedback for the student"
            className="md:col-span-2"
          />
        </div>
      </Section>

      <Section id="ds-overlays" title="Dialog, drawer, menu, tooltip, toast">
        <Row>
          <Button variant="secondary" onClick={() => setDialog(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" onClick={() => setDrawer('right')}>
            Open drawer
          </Button>
          <Button variant="secondary" onClick={() => setDrawer('bottom')}>
            Open bottom sheet
          </Button>
          <Menu
            label="Example menu"
            trigger={<span className="px-3 text-sm font-semibold text-navy">Menu ▾</span>}
            items={[
              { label: 'Edit', onSelect: () => toast.info('Edit chosen') },
              { label: 'Delete', tone: 'danger', onSelect: () => toast.info('Delete chosen') },
            ]}
          />
          <Tooltip content="Prerequisite: you need Functional Dependency first">
            <Button variant="ghost">Hover or focus me</Button>
          </Tooltip>
          <Button variant="ghost" onClick={() => toast.success('Saved', 'Your changes are live.')}>
            Success toast
          </Button>
          <Button
            variant="ghost"
            onClick={() => toast.error('Upload failed', 'File is over 25 MB.')}
          >
            Error toast
          </Button>
        </Row>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Approve 20 flashcards?"
          description="They will be visible to students once published."
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialog(false)} data-autofocus>
                Approve
              </Button>
            </>
          }
        >
          <p>Focus is trapped here. Escape closes the dialog.</p>
        </Dialog>
        <Drawer
          open={drawer !== null}
          side={drawer ?? 'right'}
          onClose={() => setDrawer(null)}
          title="Ask why"
        >
          <p>Drawer content.</p>
        </Drawer>
      </Section>

      <Section id="ds-progress" title="Progress, loading and stats">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <ProgressBar value={62} label="DBMS progress" showValue />
            <ProgressBar value={100} label="Mastered" tone="gold" showValue />
            <ProgressBar value={15} label="Small" size="sm" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <LoadingBlock label="Loading topics" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatTile label="Due today" value={12} icon={Brain} hint="Across 3 topics" />
          <StatTile label="Mastered" value="8 / 14" icon={Award} tone="gold" />
          <StatTile label="Students" value={60} icon={Users} tone="navy" />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Avatar name="Priya Raman" size="sm" />
          <Avatar name="Arun Kumar" />
          <Avatar name="Dr S Lakshmi" size="lg" />
        </div>
      </Section>

      <Section id="ds-steps" title="Step tracker">
        <StepTracker
          current={step}
          done={['curiosity', 'understand', 'prepare']}
          onSelect={setStep}
        />
        <StepTracker
          className="mt-4"
          current="curiosity"
          available={['curiosity', 'understand', 'practice']}
          onSelect={setStep}
        />
      </Section>

      <Section id="ds-empty" title="Empty states">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={Inbox}
            title="All caught up"
            description="No revision is due today. Learn a new topic instead."
            action={<Button icon={BookOpen}>Open the map</Button>}
          />
          <EmptyState
            tone="error"
            icon={Sparkles}
            title="AI service offline"
            description="Drafting is paused. Everything else still works."
            action={<Button variant="secondary">Retry</Button>}
          />
        </div>
      </Section>
    </div>
  );
}
