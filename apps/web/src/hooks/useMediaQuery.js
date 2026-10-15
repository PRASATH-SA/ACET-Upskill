import { useEffect, useState } from 'react';

/** True while the CSS media query matches. */
export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return undefined;
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** True below the 768px mobile breakpoint (A.8). */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
