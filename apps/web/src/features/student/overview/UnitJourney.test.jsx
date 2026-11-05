import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { UnitJourney } from './UnitJourney';

const keys = {
  fromTopic: 'Keys',
  toTopic: 'Indexing',
  type: 'prerequisite',
  reason: 'Indexes are built on keys',
};
const unit = (id, number, leadsTo = '') => ({
  id,
  number,
  title: `Unit ${number} title`,
  topics: [],
  topicCount: 0,
  leadsTo,
});

describe('unit journey', () => {
  it('shows each unit without a link card between them', () => {
    const units = [
      unit('u3', 3, 'Once tables are designed, Unit 4 makes them fast.'),
      unit('u4', 4),
    ];
    render(
      <MemoryRouter>
        <UnitJourney
          units={units}
          unitLinks={[{ fromUnitId: 'u3', toUnitId: 'u4', type: 'next', reasons: [keys] }]}
          subjectId="s1"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Unit 3 title')).toBeTruthy();
    expect(screen.getByText('Unit 4 title')).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.queryByText('Keys → Indexing')).toBeNull();
  });
});
