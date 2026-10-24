import { MessageSquareText } from "lucide-react";
import { feedbackHref, type FeedbackContext } from "@/lib/client/feedback";

interface Props {
  context: FeedbackContext;
  /** Defaults to NEXT_PUBLIC_FEEDBACK_EMAIL (inlined at build time). */
  email?: string | undefined;
}

/** "Was this right?" Opens the rider's email app or a GitHub issue with the trip filled in. Nothing is sent automatically. */
export default function FeedbackLink({ context, email = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL }: Props) {
  const { href, kind } = feedbackHref(context, email);
  const external = kind === "github";
  return (
    <section aria-labelledby="feedback-h" className="card p-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-brand-800" aria-hidden="true" />
        <h3 id="feedback-h" className="text-base font-bold text-ink">
          Was this right?
        </h3>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        If the station did not match what we said, tell us. {kind === "email" ? "This opens your email app" : "This opens a GitHub issue"} with
        your trip filled in. You choose whether to send it.
      </p>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="btn-secondary mt-3 min-h-[44px] w-full"
      >
        Tell us what was different
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    </section>
  );
}
