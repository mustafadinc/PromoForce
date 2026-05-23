export function addDaysToDate(startDate: string, daysToAdd: number) {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

export function formatScheduledLabel(startDate: string, day: number, time: string) {
  const date = addDaysToDate(startDate, day - 1);
  return `${date} · ${time}`;
}

export function buildCalendarExport(
  startDate: string,
  posts: Array<{
    day: number;
    scheduledTime: string;
    platform: string;
    headline: string;
    hook: string;
    caption: string;
    hashtags: string[];
    screenshotRationale: string;
  }>,
) {
  return {
    exportedAt: new Date().toISOString(),
    startDate,
    posts: posts.map((post) => ({
      day: post.day,
      scheduledDate: addDaysToDate(startDate, post.day - 1),
      scheduledTime: post.scheduledTime,
      platform: post.platform,
      headline: post.headline,
      hook: post.hook,
      caption: post.caption,
      hashtags: post.hashtags,
      screenshotRationale: post.screenshotRationale,
      copy: [post.hook, "", post.caption, "", post.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")].join("\n"),
    })),
  };
}
