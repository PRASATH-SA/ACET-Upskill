import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setAccessToken } from '../../api/client';
import { json, mockApi, renderApp, users } from '../../test/render';
import { useSession } from '../auth/session';

const map = {
  subject: { id: 's1', code: 'BOT26105', name: 'Biology for Computer Engineers', semester: 1 },
  units: [
    { id: 'u1', number: 1, title: 'Cell Biology' },
    { id: 'u2', number: 2, title: 'Biomolecules and Enzymes' },
  ],
  topics: [
    { id: 't1', unitId: 'u1', title: 'Cell Membrane', order: 0, status: 'approved' },
    { id: 't2', unitId: 'u2', title: 'Proteins', order: 1, status: 'approved' },
  ].map((t) => ({
    parentTopicId: null,
    summary: '',
    position: { x: 0, y: 0 },
    source: 'faculty',
    ...t,
  })),
  links: [],
};

describe('content & quiz CSV page', () => {
  let imports;
  beforeEach(() => {
    imports = [];
    useSession.setState({ status: 'authenticated', user: users.faculty, expired: false });
    setAccessToken('tok');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('uploads a CSV for one unit and reports the result', async () => {
    mockApi({
      'GET /subjects/s1/map': map,
      'POST /subjects/s1/content-import': (url) => {
        imports.push(String(url));
        return json(200, {
          data: { summary: { created: 4, updated: 1, unchanged: 0, skipped: 2, published: 5 } },
        });
      },
    });
    renderApp('/studio/subjects/s1/content');
    expect(
      await screen.findByRole('heading', { name: 'Biology for Computer Engineers' }),
    ).toBeInTheDocument();
    const unit2 = screen.getByText('Biomolecules and Enzymes').closest('li');
    expect(within(unit2).getByText(/1 topic: Proteins/)).toBeInTheDocument();
    await userEvent.click(within(unit2).getByRole('button', { name: 'Upload CSV' }));

    const dialog = await screen.findByRole('dialog');
    const file = new File(
      ['unit,topic,type,body\n2,Proteins,easy,Chains of amino acids'],
      'u2.csv',
      {
        type: 'text/csv',
      },
    );
    await userEvent.upload(within(dialog).getByLabelText('Content CSV'), file);
    await userEvent.click(within(dialog).getByRole('checkbox'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

    expect(await within(dialog).findByText('4 added')).toBeInTheDocument();
    expect(within(dialog).getByText('5 published')).toBeInTheDocument();
    expect(imports[0]).toMatch(/unitId=u2/);
    expect(imports[0]).toMatch(/publish=true/);
  });

  it('downloads the format file for the unit being uploaded', async () => {
    const downloads = [];
    mockApi({
      'GET /subjects/s1/map': map,
      'GET /subjects/s1/content.csv': (url) => {
        downloads.push(String(url));
        return new Response('unit,topic,type\n', { headers: { 'Content-Type': 'text/csv' } });
      },
    });
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
    );
    // jsdom cannot follow the download link; the request above is what matters.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderApp('/studio/subjects/s1/content');
    const unit2 = (await screen.findByText('Biomolecules and Enzymes')).closest('li');
    await userEvent.click(within(unit2).getByRole('button', { name: 'Upload CSV' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Download format' }));
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]).toMatch(/unitId=u2/);
    expect(downloads[0]).toMatch(/template=true/);
  });

  it('lists every bad row when the upload is rejected', async () => {
    mockApi({
      'GET /subjects/s1/map': map,
      'POST /subjects/s1/content-import': () =>
        json(422, {
          error: {
            code: 'UNPROCESSABLE',
            message: '2 rows need fixing; nothing was imported',
            details: {
              errors: [
                { row: 3, topic: 'Nowhere', message: 'topic "Nowhere" is not in this unit' },
                { row: 5, topic: 'Proteins', message: 'correct must be the answer letter' },
              ],
            },
          },
        }),
    });
    renderApp('/studio/subjects/s1/content');
    const unit1 = (await screen.findByText('Cell Biology')).closest('li');
    await userEvent.click(within(unit1).getByRole('button', { name: 'Upload CSV' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.upload(
      within(dialog).getByLabelText('Content CSV'),
      new File(['x'], 'bad.csv', { type: 'text/csv' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }));
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('2 rows need fixing');
    expect(alert).toHaveTextContent('Row 3 (Nowhere): topic "Nowhere" is not in this unit');
    expect(alert).toHaveTextContent('Row 5 (Proteins)');
  });
});
