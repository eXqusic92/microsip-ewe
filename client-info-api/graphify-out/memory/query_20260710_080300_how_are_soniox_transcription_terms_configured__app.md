---
type: "query"
date: "2026-07-10T08:03:00.438485+00:00"
question: "How are Soniox transcription terms configured, applied, and cost-previewed for administrators?"
contributor: "graphify"
source_nodes: ["SonioxClient", "CallSummaryService", "PostgresAiAnalysisSettingsStore", "buildSonioxContext"]
---

# Q: How are Soniox transcription terms configured, applied, and cost-previewed for administrators?

## Answer

AI settings now persist a validated transcriptionTerms list. Soniox receives that list dynamically in context.terms for new transcriptions, with a hashed context version so manual reanalysis refreshes audio only after terms change. The admin preview compares the draft context size with cached 30-day Soniox async usage logs to estimate per-call and period cost changes.

## Source Nodes

- SonioxClient
- CallSummaryService
- PostgresAiAnalysisSettingsStore
- buildSonioxContext