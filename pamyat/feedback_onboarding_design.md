---
name: feedback-onboarding-design
description: UI preference confirmed on Nur Hayat onboarding redesign — big self-explanatory screens beat small interactive hints with pointer arrows
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7b232c9b-4271-42b4-8039-26aeef78b182
  modified: 2026-08-05T07:57:37.271Z
---

User strongly prefers big, bold, self-explanatory UI screens over small dense interactive mockups with coachmark-style pointer arrows/tooltips.

**Why:** First onboarding redesign attempt used small interactive card grids (tap-to-expand, tap-to-reveal) with animated "👆 tap here" coachmark arrows guiding the user. User rejected it hard: "Все как то мелко... меня бесят эти стрелки которые ты поставил, они не в тех метах, не указывают куда именно нажимать и после нажатия не исчезают." Positioning arrows correctly relative to dynamic content is fragile and not worth the complexity — better to make the target obvious through size/layout instead of pointing at it.

**How to apply:** For onboarding/marketing-style screens in this app (and likely others), default to: one big icon/emoji header, a bold large title (~28-30px), a short vertical list of large feature rows (icon + text, ~16-18px, generous padding) — no small grids, no coachmark arrows/tooltips. If interactivity is wanted, make the tap target self-evidently large (e.g. big level-picker cards) rather than adding a hint system to point at small ones. After applying this, user response was enthusiastic: "Вот прям хорошо теперь стало!!!" — confirms this is the right direction for [[project_nur_hayat]] onboarding and similar screens.

Also confirmed: onboarding content should branch by user-selected persona from step 1 onward (e.g. "seeker" vs "growing/practicing" tracks with different feature copy/messaging), not generic content — this personalization was explicitly requested as a differentiator.
