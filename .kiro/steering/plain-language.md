---
inclusion: always
---

# Plain language

Every sentence a rider reads follows these rules. This covers UI text, API reasons, and the output of `/api/explain` (both the AI prompt and `lib/ai/fallback-templates.ts`).

- **Grade 6 reading level.** Short sentences. One idea each. Everyday words.
- **No agency jargon.** Say "an elevator is out of service", not "elevator closure, ELEVATOR_CLOSURE effect". Say "the train does not stop here", not "service alteration". Do not show alert codes, route ids, or stop ids to riders.
- **Always say what to do next.** Every problem message ends with an action: pick another station, ask a station worker, check again before you leave, press Refresh.
- **Say what it means for this rider.** Use the profile: "If you use a wheelchair...", "If you have a stroller...", "If you cannot use stairs...".
- **Say what is broken first**, then what it means, then what to do.
- **Never claim more than we know.** Do not say a station is accessible or step-free unless the status is `STEP_FREE`. Do not add phone numbers, times, or station names that are not in the data.
- **Be calm and direct.** No blame, no jokes, no all-caps, no exclamation marks.
- Write "step-free" with a hyphen. Write times like "3:05 PM".

## Examples

Bad: `ELEVATOR_CLOSURE at place-alfcl; platform unverified.`
Good: `An elevator at Alewife is out of service. We could not check if another elevator reaches the same platform. Ask a station worker, or check again before you leave.`
