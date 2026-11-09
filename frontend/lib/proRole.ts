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
      brandSub: 'Neighborhood salon queues',
      sectionLabel: 'Salon floor',
      navQueue: 'Line',
      navShop: 'Salon',
      backQueue: '← Line',
      eyebrowToday: 'Station 1 · today',
      inSeat: 'With client',
      seatEmpty: 'Station free',
      nobodyInSeat: 'No one at the station',
      nobodyHint: 'Next client waiting will move up here.',
      doneNext: 'Done · next client',
      waitingSub: 'Tickets update when you finish a service.',
      lineClear: 'Line is clear — open for walk-ins.',
      finishNotice: (name: string) => `Finished ${name}. Called the next client up.`,
      inServiceFilter: 'In service',
      shopTitle: 'Salon',
      shopEyebrow: 'How clients find you',
      shopNameLabel: 'Salon name',
      avgLabel: 'Average service length (minutes)',
      shopSaved: 'Salon details saved.',
      emergencySub: 'Pause walk-ins and push the line when something goes wrong.',
    };
  }

  return {
    brandSub: 'Neighborhood barber queues',
    sectionLabel: 'Shop floor',
    navQueue: 'Queue',
    navShop: 'Shop',
    backQueue: '← Queue',
    eyebrowToday: 'Chair 1 · today',
    inSeat: 'In the chair',
    seatEmpty: 'Chair empty',
    nobodyInSeat: 'Nobody in the chair',
    nobodyHint: 'Next person waiting will move up here.',
    doneNext: 'Done · call next',
    waitingSub: 'Their tickets update when you finish a cut.',
    lineClear: 'Line is clear — open for walk-ins.',
    finishNotice: (name: string) => `Finished ${name}. Called the next person up.`,
    inServiceFilter: 'In chair',
    shopTitle: 'Shop',
    shopEyebrow: 'How customers find you',
    shopNameLabel: 'Shop name',
    avgLabel: 'Average cut length (minutes)',
    shopSaved: 'Shop details saved.',
    emergencySub: 'Pause walk-ins and push the line when something goes wrong.',
  };
}
