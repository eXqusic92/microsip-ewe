---
type: "optimization"
date: "2026-07-10T07:01:15.061460+00:00"
question: "Why does the AI analytics tab load slowly?"
contributor: "graphify"
source_nodes: ["app.js", "server.js", "binotel-monitor-service.js", "monitorAnalyticsRow", "BinotelMonitorService"]
---

# Q: Why does the AI analytics tab load slowly?

## Answer

The analytics route blocked on oversized PostgreSQL payloads, a duplicate manager-rating query, and live Soniox/OpenAI cost APIs. The fix uses one compact shared analytics snapshot, derives manager ratings from it, caches stable period keys, and refreshes provider costs in the background.

## Source Nodes

- app.js
- server.js
- binotel-monitor-service.js
- monitorAnalyticsRow
- BinotelMonitorService