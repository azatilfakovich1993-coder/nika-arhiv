---
name: user-project-motivation
description: "What sustains vs kills the user's motivation on side projects — favor fast, visible-in-a-day results over long infra-heavy builds"
metadata: 
  node_type: memory
  type: user
  originSessionId: 7535351c-65ff-4a6b-be71-174e44baed78
  modified: 2026-07-28T06:36:23.706Z
---

The user runs several side projects in parallel (Нур Хаят PWA, [[project_good_vahta]], budget-app, client-finder-bot/Ai Click cold-outreach pipeline) and repeatedly loses motivation on projects once they hit real complexity or an unclear differentiation story — e.g. dropped a planned recruit-bot (SMS+voice-AI screening for Good·Вахта candidates) mid-plan the moment it became clear it needed Voximplant/SMS-gateway/VPS signups and weeks of integration, and separately admitted burnout on Good·Вахта itself partly because "чем я буду глобально отличаться не понятно" (unclear how it differs from hh.ru-style competitors).

**Why:** explicitly said (2026-07-28) they want "быстрый результат, который видно сразу" — a result within a day or two they can actually use/show, not a multi-week integration project — when asked directly what makes a project feel worth doing right now. In the same breath also said "и хочется на этом заработать" — they're not just after a fun toy, the fast result specifically needs a believable path to real income, so the sweet spot is "quick to build AND monetizable," not either alone.

**How to apply:** when brainstorming new project ideas with this user, default to proposing things buildable and demoable in a day or two with minimal external-account/infra dependencies (Claude Artifacts, a single self-contained script, a small personal utility) over anything requiring multiple paid third-party signups, lengthy approval processes, or an unclear competitive angle. If a bigger/infra-heavy idea is the only fit, name the complexity and let the user opt in explicitly rather than assuming they'll stick with it — check early (after the architecture is clear, before deep implementation) whether the scope still feels worth it, since that's the point where past projects got dropped.
