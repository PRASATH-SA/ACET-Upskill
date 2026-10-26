import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import {
  Button,
  Chip,
  Dialog,
  IconButton,
  Input,
  Menu,
  ProgressBar,
  StepTracker,
  Tabs,
  Toaster,
  Tooltip,
  toast,
} from '.';

describe('Button', () => {
  it('is a real button with type=button and becomes busy while loading', () => {
    render(<Button loading>Save</Button>);
    const b = screen.getByRole('button', { name: 'Save' });
    expect(b).toHaveAttribute('type', 'button');
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
  });
});

describe('IconButton', () => {
  it('uses the required label as its accessible name', () => {
    render(<IconButton icon={Plus} label="Add topic" />);
    expect(screen.getByRole('button', { name: 'Add topic' })).toBeInTheDocument();
  });

  it('refuses to render without a label', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<IconButton icon={Plus} />)).toThrow(/label/);
    spy.mockRestore();
  });
});

describe('Input', () => {
  it('links the label, hint and error to the control', () => {
    const { rerender } = render(<Input label="Email" hint="College email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('College email');
    rerender(<Input label="Email" error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Required');
  });
});

describe('Tabs', () => {
  function Demo() {
    const [v, setV] = useState('a');
    return (
      <Tabs
        label="Kinds"
        value={v}
        onChange={setV}
        tabs={[
          { value: 'a', label: 'Easy', content: 'panel a' },
          { value: 'b', label: 'Ten mark', content: 'panel b' },
          { value: 'c', label: 'Cards', content: 'panel c' },
        ]}
      />
    );
  }

  it('moves with arrow keys, Home and End, and shows the matching panel', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const first = screen.getByRole('tab', { name: 'Easy' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Ten mark' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Ten mark' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel b');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Easy' })).toHaveAttribute('aria-selected', 'true');
    // Only the selected tab is in the tab order.
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('Dialog', () => {
  function Demo() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Approve items"
          footer={<button>Confirm</button>}
        >
          <input aria-label="Reason" data-autofocus />
        </Dialog>
      </>
    );
  }

  it('is a labelled modal that traps focus and closes on Escape, returning focus', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Approve items' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Reason')).toHaveFocus();

    // Tab cycles Reason → Confirm → Close → Reason (header close button comes first in DOM).
    await user.tab();
    await user.tab();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('Menu', () => {
  it('opens with ArrowDown, moves with arrows and runs the chosen item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        label="Profile menu"
        trigger="Me"
        items={[
          { label: 'Profile', onSelect: () => {} },
          { label: 'Sign out', onSelect },
        ]}
      />,
    );
    screen.getByRole('button', { name: 'Profile menu' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('Tooltip', () => {
  it('describes its trigger on focus and hides on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Needs Keys first">
        <button>Edge</button>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Edge' })).toHaveAccessibleDescription(
      'Needs Keys first',
    );
    await user.keyboard('{Escape}');
    expect(screen.getByRole('tooltip', { hidden: true })).not.toBeVisible();
  });
});

describe('feedback components', () => {
  it('ProgressBar exposes its value', () => {
    render(<ProgressBar value={62.4} label="DBMS" />);
    expect(screen.getByRole('progressbar', { name: 'DBMS' })).toHaveAttribute(
      'aria-valuenow',
      '62',
    );
  });

  it('Chip reports its pressed state', () => {
    render(
      <Chip selected onClick={() => {}}>
        Unit 3
      </Chip>,
    );
    expect(screen.getByRole('button', { name: 'Unit 3' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('toasts are announced and dismissable', async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    toast.error('Upload failed', 'File is over 25 MB');
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed');
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    // The toast slides out first (framer-motion exit), then unmounts.
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('StepTracker marks the current step and announces done steps', () => {
    render(
      <StepTracker current="remember" done={['curiosity']} available={['curiosity', 'remember']} />,
    );
    expect(screen.getByRole('button', { name: /Remember/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('button', { name: /Curiosity \(done\)/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Practice/ })).toBeDisabled();
  });
});
