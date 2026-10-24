import type { AccessStatus, UserProfile } from "@/lib/types";

// "Was this right?" goes to an email address (NEXT_PUBLIC_FEEDBACK_EMAIL) or, if none is set, to a new
// GitHub issue on the project repo. Nothing is sent by the app itself: the rider sees the message and
// decides whether to send it. No tracking, no ids, no location.
export const FEEDBACK_REPO_ISSUES = "https://github.com/tanishq-007/Stepfree-T/issues/new";

export interface FeedbackContext {
  route: string | undefined;
  profile: UserProfile;
  status: AccessStatus;
  dataTime: string;
  dataSource: string;
}

const STATUS_WORDS: Record<AccessStatus, string> = {
  STEP_FREE: "Step-free",
  NOT_STEP_FREE: "Not step-free",
  UNKNOWN: "Cannot confirm",
};

export function feedbackBody(ctx: FeedbackContext): string {
  return [
    `Trip: ${ctx.route ?? "not set"}`,
    `Profile: ${ctx.profile}`,
    `AccessPath said: ${STATUS_WORDS[ctx.status]}`,
    `MBTA data from: ${ctx.dataTime} (${ctx.dataSource})`,
    "",
    "What was different at the station?",
    "",
  ].join("\n");
}

export function feedbackHref(ctx: FeedbackContext, email: string | undefined): { href: string; kind: "email" | "github" } {
  const subject = `AccessPath feedback: ${STATUS_WORDS[ctx.status]}${ctx.route ? `, ${ctx.route}` : ""}`;
  const body = feedbackBody(ctx);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { href: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, kind: "email" };
  }
  const params = new URLSearchParams({ title: subject, body });
  return { href: `${FEEDBACK_REPO_ISSUES}?${params.toString()}`, kind: "github" };
}
