import { WeekPoint } from '@/components/ui/WeekCard';

export type WeekSummary = {
  visits: number;
  minutes: number;
  spend: number;
  days: WeekPoint[];
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function summarizeWeek(rows: any[]): WeekSummary {
  const today = startOfDay(new Date());
  const days: { key: string; label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      key: d.toDateString(),
      label: d.toLocaleDateString([], { weekday: 'narrow' }),
      value: 0,
    });
  }
  const from = new Date(today);
  from.setDate(today.getDate() - 6);

  let visits = 0;
  let minutes = 0;
  let spend = 0;

  for (const row of rows || []) {
    if (row.status === 'cancelled') continue;
    const when = new Date(row.scheduled_at || row.created_at || 0);
    if (Number.isNaN(when.getTime()) || when < from) continue;
    const counted = row.status === 'completed' || row.status === 'in_progress' || row.status === 'confirmed' || row.status === 'pending';
    if (!counted) continue;
    visits += 1;
    minutes += Number(row.services?.duration || row.service_duration || row.estimated_wait_minutes || 0);
    spend += Number(row.services?.price || row.price || 0);
    const bucket = days.find((d) => d.key === startOfDay(when).toDateString());
    if (bucket) bucket.value += 1;
  }

  return { visits, minutes, spend, days };
}
