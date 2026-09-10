---
name: Push Notifications + Unread Badges
description: Push notifications and in-app unread reply badges are deferred — implement together
type: project
---

Push notifications are deferred to a later session. When implementing them, also add:
- In-app badge (number) on the Chat tab icon when someone replied to the current user's message
- Track last-seen timestamp per room per user in Supabase
- Query messages newer than last_seen where reply_to_name matches current user

**Why:** User explicitly asked to do push + badges together in one session.
**How to apply:** When user says "давай пуш уведомления", implement both push AND the chat unread badge in the same session.
