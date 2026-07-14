---
type: "query"
date: "2026-07-10T10:50:28.126028+00:00"
question: "Why do duplicate labels appear in Frequent Questions analytics?"
contributor: "graphify"
source_nodes: ["addCounter()", "calculateCallTypeAnalytics()", "CUSTOMER_QUESTION_TYPES", "CUSTOMER_QUESTION_LABELS"]
---

# Q: Why do duplicate labels appear in Frequent Questions analytics?

## Answer

The aggregation uses question.type as the Map key but displays question.label. The response schema independently validates type and label enums without enforcing their pairing, so historical or model-produced mismatched type/label pairs become separate counters with the same human label. The differing row colors correspond to those distinct types.

## Source Nodes

- addCounter()
- calculateCallTypeAnalytics()
- CUSTOMER_QUESTION_TYPES
- CUSTOMER_QUESTION_LABELS