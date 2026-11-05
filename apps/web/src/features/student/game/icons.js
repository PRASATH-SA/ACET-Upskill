import {
  CalendarCheck,
  CheckCheck,
  Crown,
  Flame,
  Footprints,
  Hand,
  Medal,
  Rocket,
  Star,
  Trophy,
} from 'lucide-react';

/** Lucide components for the icon names in ACHIEVEMENTS (@acet/shared). */
export const ACHIEVEMENT_ICONS = {
  CalendarCheck,
  CheckCheck,
  Crown,
  Flame,
  Footprints,
  Hand,
  Medal,
  Rocket,
  Star,
};

export const achievementIcon = (name) => ACHIEVEMENT_ICONS[name] ?? Trophy;
