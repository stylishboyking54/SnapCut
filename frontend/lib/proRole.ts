'use client';

import { useEffect, useState } from 'react';
import { getSession } from './auth';

export type ProKind = 'barber' | 'salon';

const ROLE_KEY = 'qb_role';

export function getProKind(): ProKind {
  if (typeof window === 'undefined') return 'barber';
  const sessionRole = getSession()?.profile.role;
  if (sessionRole === 'salon') return 'salon';
  if (sessionRole === 'barber') return 'barber';
  const saved = localStorage.getItem(ROLE_KEY);
  return saved === 'salon' ? 'salon' : 'barber';
}

export function useProKind(): ProKind {
  const [kind, setKind] = useState<ProKind>('barber');

  useEffect(() => {
    const sync = () => setKind(getProKind());
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  return kind;
}

/** Short product language that differs for barber vs salon floors */
export function proCopy(kind: ProKind) {
  if (kind === 'salon') {
    return {
      brandSub: 'Run your salon line',
      sectionLabel: 'Your salon',
      navQueue: "Today's line",
      navShop: 'My salon',
      backQueue: "← Today's line",
      eyebrowToday: 'Station 1 · today',
      inSeat: 'With client',
      seatEmpty: 'Station free',
      nobodyInSeat: 'No one at the station',
      nobodyHint: 'Next client waiting will move up here.',
      doneNext: 'Finished — call next',
      waitingSub: 'They move up when you finish the person you are with.',
      lineClear: 'Nobody is waiting. You can take a walk-in.',
      finishNotice: (name: string) => `Finished ${name}. Called the next client up.`,
      inServiceFilter: 'Being served',
      shopTitle: 'Salon',
      shopEyebrow: 'What people see when they look for you',
      shopNameLabel: 'Salon name',
      avgLabel: 'Average service length (minutes)',
      shopSaved: 'Salon details saved.',
      emergencySub: 'Stop new people from joining, and tell them why.',
    };
  }

  return {
      brandSub: 'Run your shop line',
      sectionLabel: 'Your shop',
      navQueue: "Today's line",
      navShop: 'My shop',
      backQueue: "← Today's line",
    eyebrowToday: 'Chair 1 · today',
    inSeat: 'In the chair',
    seatEmpty: 'Chair empty',
    nobodyInSeat: 'Nobody in the chair',
    nobodyHint: 'Next person waiting will move up here.',
      doneNext: 'Finished — call next',
      waitingSub: 'They move up when you finish the person in the chair.',
      lineClear: 'Nobody is waiting. You can take a walk-in.',
    finishNotice: (name: string) => `Finished ${name}. Called the next person up.`,
      inServiceFilter: 'In the chair',
    shopTitle: 'Shop',
    shopEyebrow: 'How customers find you',
    shopNameLabel: 'Shop name',
    avgLabel: 'Average cut length (minutes)',
    shopSaved: 'Shop details saved.',
      emergencySub: 'Stop new people from joining, and tell them why.',
  };
}
