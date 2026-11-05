import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ClipboardList, Copy, FilePlus2, Link2, MoreVertical, Trash2, Trophy } from 'lucide-react';
import { isAdminRole } from '@acet/shared';
import { errorMessage, post } from '../../api/client';
import { Page } from '../../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  EyebrowHeading,
  LoadingBlock,
  Menu,
  toast,
} from '../../components/ui';
import { QueryError } from '../../components/QueryError';
import { cn } from '../../lib/cn';
import { item, stagger } from '../../lib/motion';
import { fkeys, useFormAction, useForms } from './api';
import { CLOSED_REASON, HEADER_BG, fmtDateTime } from './common';
import { ShareDialog } from './editor/FormEditor';
import { useSession } from '../auth/session';

function StatusBadge({ f }) {
  if (f.status !== 'published') return <Badge>Draft</Badge>;
  return f.open.open ? (
    <Badge tone="green">Accepting responses</Badge>
  ) : (
    <Badge tone="orange">{CLOSED_REASON[f.open.reason]}</Badge>
  );
}

/** /studio/forms — every form the user can edit, with quick share, duplicate and delete. */
export function FormStudioPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const forms = useForms();
  const action = useFormAction();
  const [share, setShare] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const canDeleteAny = useSession((s) => isAdminRole(s.user.role));
  const create = useMutation({
    mutationFn: () => post('/forms', {}),
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: fkeys.list });
      navigate(`/studio/forms/${f.id}`);
    },
    onError: (e) => toast.error('Could not create the form', errorMessage(e)),
  });

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EyebrowHeading eyebrow="Form studio" title="Forms, surveys and quizzes" level={1}>
          <p className="mt-2 max-w-2xl">
            Build a form, choose which students get it, and publish. They are notified at once and
            find it on their Forms page; you can also share the link.
          </p>
        </EyebrowHeading>
        <Button icon={FilePlus2} loading={create.isPending} onClick={() => create.mutate()}>
          New form
        </Button>
      </div>

      <div className="mt-6">
        {forms.isPending ? (
          <LoadingBlock />
        ) : forms.isError ? (
          <QueryError query={forms} what="your forms" />
        ) : !forms.data.length ? (
          <EmptyState
            icon={ClipboardList}
            title="No forms yet"
            description="Start with a blank form: feedback, registrations, attendance checks or a quick quiz."
            action={
              <Button icon={FilePlus2} loading={create.isPending} onClick={() => create.mutate()}>
                Create your first form
              </Button>
            }
          />
        ) : (
          <motion.ul {...stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.data.map((f) => (
              <motion.li key={f.id} {...item}>
                <Card padded={false} interactive className="flex h-full flex-col overflow-hidden">
                  <div className={cn('h-2', HEADER_BG[f.headerColor])} aria-hidden />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/studio/forms/${f.id}`}
                        className="font-heading text-lg font-bold text-navy hover:text-brand"
                      >
                        {f.title}
                      </Link>
                      <Menu
                        label={`Actions for ${f.title}`}
                        trigger={<MoreVertical className="h-5 w-5 text-navy" aria-hidden />}
                        items={[
                          { label: 'Get link', icon: Link2, onSelect: () => setShare(f) },
                          {
                            label: 'Make a copy',
                            icon: Copy,
                            onSelect: () =>
                              action.mutate(
                                { id: f.id, action: 'duplicate' },
                                { onSuccess: (c) => navigate(`/studio/forms/${c.id}`) },
                              ),
                          },
                          ...(f.isOwner || canDeleteAny
                            ? [
                                {
                                  label: 'Delete',
                                  icon: Trash2,
                                  tone: 'danger',
                                  onSelect: () => setToDelete(f),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                    {f.description && <p className="line-clamp-2 text-sm">{f.description}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      <StatusBadge f={f} />
                      {f.isQuiz && (
                        <Badge tone="gold" icon={Trophy}>
                          Quiz
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs">
                      {f.questionCount} question{f.questionCount === 1 ? '' : 's'} ·{' '}
                      <strong className="text-navy">{f.responseCount}</strong> response
                      {f.responseCount === 1 ? '' : 's'}
                      {f.closesAt && ` · closes ${fmtDateTime(f.closesAt)}`}
                    </p>
                    {!f.isOwner && <p className="text-xs">By {f.ownerName}</p>}
                  </div>
                </Card>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      {share && (
        <ShareDialog open onClose={() => setShare(null)} formId={share.id} status={share.status} />
      )}
      <Dialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={`Delete “${toDelete?.title}”?`}
        description="The form, all its responses and uploaded files are removed for good."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              loading={action.isPending}
              onClick={() =>
                action.mutate(
                  { id: toDelete.id, action: 'delete' },
                  {
                    onSuccess: () => {
                      toast.success('Form deleted');
                      setToDelete(null);
                    },
                  },
                )
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </Page>
  );
}
