---
type: "query"
date: "2026-07-10T10:53:39.931565+00:00"
question: "How were duplicate Frequent Questions labels fixed?"
contributor: "graphify"
source_nodes: ["enrichCallEvaluation", "normalizeCustomerQuestionType", "customerQuestionLabel", "calculateCallTypeAnalytics"]
---

# Q: How were duplicate Frequent Questions labels fixed?

## Answer

Analytics now derives each question label from a canonical type-to-label map before grouping, so old mismatched labels collapse into the correct type row without a reanalysis. New summaries normalize customerQuestions after AI evaluation and the strict schema permits at most one main question, preventing future mismatched or multiple-question entries.

## Source Nodes

- enrichCallEvaluation
- normalizeCustomerQuestionType
- customerQuestionLabel
- calculateCallTypeAnalytics