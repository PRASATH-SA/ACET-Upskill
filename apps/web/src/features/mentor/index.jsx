import { Page } from '../../components/layout/AppShell';
import { EyebrowHeading } from '../../components/ui';

export function MentorHome() {
  return (
    <Page>
      <EyebrowHeading eyebrow="Mentor" title="My students" level={1} />
    </Page>
  );
}
