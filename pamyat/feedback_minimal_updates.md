---
name: feedback-minimal-updates
description: "Don't narrate every small step or intermediate sub-agent notification — only report substantive results."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4d960e16-5b5b-4f2e-be42-0105e5f9ca5e
  modified: 2026-08-10T05:33:11.582Z
---

Don't ask/update the user about every minor step, including intermediate background sub-agent notifications (e.g. one of several parallel review agents finishing). Only surface things when there's a real result, decision point, or something worth their attention.

**Why:** User explicitly said "не надо меня спрашивать прям о каждом своем мельчайшем шаге" after being pinged about a single sub-check ("Angle Conventions" agent) finishing mid-way through a larger multi-agent code review.
**How to apply:** When running multi-step or multi-agent tasks (e.g. `/code-review`, background Agent calls), stay quiet through intermediate notifications and only message the user once the overall task completes or something actionable/notable comes up.
