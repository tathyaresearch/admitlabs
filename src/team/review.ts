// Words for the team's review. Pure.

/** How long something has waited: "3 hours", "1 day", "4 days". */
export function waitedFor(since: string, now: Date): string {
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / 3_600_000));
  if (hours < 1) return 'under an hour';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
