import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// Lazy route chunks compile on first use, which can take over the 1 s default.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => cleanup());

// jsdom has no matchMedia; components that read breakpoints get "desktop".
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
