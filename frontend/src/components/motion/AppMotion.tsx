/* eslint-disable react-refresh/only-export-components */

import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  type Transition,
  type Variants,
} from 'framer-motion';
import type { PropsWithChildren } from 'react';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

export type MotionSurface = 'default' | 'marketing' | 'auth' | 'dashboard';

export const baseMotionTransition: Transition = {
  duration: 0.44,
  ease: EASE_OUT,
};

export const fastMotionTransition: Transition = {
  duration: 0.24,
  ease: EASE_OUT,
};

export const exitMotionTransition: Transition = {
  duration: 0.22,
  ease: EASE_IN,
};

export const marketingMotionTransition: Transition = {
  duration: 0.54,
  ease: EASE_OUT,
};

export const marketingExitMotionTransition: Transition = {
  duration: 0.3,
  ease: EASE_IN,
};

export const authMotionTransition: Transition = {
  duration: 0.34,
  ease: EASE_OUT,
};

export const authExitMotionTransition: Transition = {
  duration: 0.2,
  ease: EASE_IN,
};

export const dashboardMotionTransition: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 24,
  mass: 0.9,
};

export const dashboardExitMotionTransition: Transition = {
  duration: 0.22,
  ease: EASE_IN,
};

interface MotionSurfaceProfile {
  enter: Transition;
  exit: Transition;
  distance: number;
}

const MOTION_SURFACE_PROFILES: Record<MotionSurface, MotionSurfaceProfile> = {
  default: {
    enter: baseMotionTransition,
    exit: exitMotionTransition,
    distance: 10,
  },
  marketing: {
    enter: marketingMotionTransition,
    exit: marketingExitMotionTransition,
    distance: 16,
  },
  auth: {
    enter: authMotionTransition,
    exit: authExitMotionTransition,
    distance: 10,
  },
  dashboard: {
    enter: dashboardMotionTransition,
    exit: dashboardExitMotionTransition,
    distance: 8,
  },
};

export type DashboardSettingsPage =
  | 'team'
  | 'billing'
  | 'profile'
  | 'business'
  | 'api-keys'
  | 'webhooks'
  | 'branches'
  | 'audit';

interface DashboardSettingsMotionTuning {
  staggerChildren: number;
  delayChildren: number;
  heroDistance: number;
  utilityDistance: number;
  contentDistance: number;
  deepContentDistance: number;
}

const DASHBOARD_SETTINGS_MOTION_TUNINGS: Record<
  DashboardSettingsPage,
  DashboardSettingsMotionTuning
> = {
  team: {
    staggerChildren: 0.05,
    delayChildren: 0.015,
    heroDistance: 6,
    utilityDistance: 8,
    contentDistance: 9,
    deepContentDistance: 10,
  },
  billing: {
    staggerChildren: 0.048,
    delayChildren: 0.018,
    heroDistance: 6,
    utilityDistance: 8,
    contentDistance: 9,
    deepContentDistance: 11,
  },
  profile: {
    staggerChildren: 0.044,
    delayChildren: 0.012,
    heroDistance: 5,
    utilityDistance: 7,
    contentDistance: 8,
    deepContentDistance: 9,
  },
  business: {
    staggerChildren: 0.046,
    delayChildren: 0.014,
    heroDistance: 6,
    utilityDistance: 8,
    contentDistance: 9,
    deepContentDistance: 10,
  },
  'api-keys': {
    staggerChildren: 0.04,
    delayChildren: 0.01,
    heroDistance: 5,
    utilityDistance: 7,
    contentDistance: 8,
    deepContentDistance: 9,
  },
  webhooks: {
    staggerChildren: 0.04,
    delayChildren: 0.01,
    heroDistance: 5,
    utilityDistance: 7,
    contentDistance: 8,
    deepContentDistance: 9,
  },
  branches: {
    staggerChildren: 0.047,
    delayChildren: 0.014,
    heroDistance: 6,
    utilityDistance: 8,
    contentDistance: 9,
    deepContentDistance: 11,
  },
  audit: {
    staggerChildren: 0.038,
    delayChildren: 0.008,
    heroDistance: 5,
    utilityDistance: 7,
    contentDistance: 8,
    deepContentDistance: 9,
  },
};

const REDUCED_MOTION_SETTINGS_TUNING = {
  staggerChildren: 0.012,
  delayChildren: 0,
};

export function getSurfaceMotionProfile(surface: MotionSurface = 'default'): MotionSurfaceProfile {
  return MOTION_SURFACE_PROFILES[surface];
}

export function getDashboardSettingsMotionTuning(
  page: DashboardSettingsPage,
  shouldReduceMotion: boolean
): DashboardSettingsMotionTuning {
  const tuning = DASHBOARD_SETTINGS_MOTION_TUNINGS[page];

  if (!shouldReduceMotion) {
    return tuning;
  }

  return {
    ...tuning,
    ...REDUCED_MOTION_SETTINGS_TUNING,
  };
}

export function fadeUp(
  distance = 16,
  delay = 0,
  transition: Transition = baseMotionTransition
): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ...transition,
        delay,
      },
    },
  };
}

export function staggerContainer(staggerChildren = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        when: 'beforeChildren',
        staggerChildren,
        delayChildren,
      },
    },
  };
}

export function pagePresenceVariants(
  shouldReduceMotion: boolean,
  surface: MotionSurface = 'default'
): Variants {
  const profile = getSurfaceMotionProfile(surface);
  const hiddenDistance =
    surface === 'dashboard' ? Math.max(4, profile.distance - 2) : profile.distance;
  const exitDistance =
    surface === 'dashboard'
      ? -Math.max(4, profile.distance - 3)
      : -Math.max(6, profile.distance - 2);

  if (shouldReduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: fastMotionTransition,
      },
      exit: {
        opacity: 0,
        transition: profile.exit,
      },
    };
  }

  return {
    hidden: { opacity: 0, y: hiddenDistance },
    visible: {
      opacity: 1,
      y: 0,
      transition: profile.enter,
    },
    exit: {
      opacity: 0,
      y: exitDistance,
      transition: profile.exit,
    },
  };
}

export function surfaceRevealVariants(
  shouldReduceMotion: boolean,
  distance = 12,
  surface: MotionSurface = 'default'
): Variants {
  const profile = getSurfaceMotionProfile(surface);

  if (shouldReduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: fastMotionTransition,
      },
    };
  }

  return fadeUp(distance, 0, profile.enter);
}

export function AppMotionProvider({ children }: PropsWithChildren) {
  return (
    <MotionConfig transition={baseMotionTransition} reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

export { m };
