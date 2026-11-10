export function timeGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${hello}, ${first}` : hello;
}

export function todayLabel() {
  return new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
