---
type: "query"
date: "2026-07-10T08:39:29.825483+00:00"
question: "How is ordinary-user access to call statistics and AI analytics enforced?"
contributor: "graphify"
source_nodes: ["requirePageTeamAnalytics", "canViewTeamAnalytics", "renderProfileMenu"]
---

# Q: How is ordinary-user access to call statistics and AI analytics enforced?

## Answer

Ordinary users are redirected from the call-statistics and AI-analytics pages, receive 403 from their aggregate analytics APIs, and do not see those header tabs. Admin-only profile entries are grouped so ordinary users see neither unavailable buttons nor orphaned dividers; department heads and admins retain analytics access.

## Source Nodes

- requirePageTeamAnalytics
- canViewTeamAnalytics
- renderProfileMenu