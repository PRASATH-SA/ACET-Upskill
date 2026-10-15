import { Page } from '../../components/layout/AppShell';
import { EyebrowHeading } from '../../components/ui';

export function AdminHome() {
  return (
    <Page>
      <EyebrowHeading eyebrow="HOD" title="Department overview" level={1} />
    </Page>
  );
}
