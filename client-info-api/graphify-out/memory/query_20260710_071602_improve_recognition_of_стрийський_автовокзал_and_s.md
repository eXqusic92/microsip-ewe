---
type: "query"
date: "2026-07-10T07:16:02.216983+00:00"
question: "Improve recognition of Стрийський автовокзал and show the Soniox prompt before and after"
contributor: "graphify"
source_nodes: ["sonioxContext()", "SonioxClient", ".transcribeAudio()", "CallSummaryService"]
---

# Q: Improve recognition of Стрийський автовокзал and show the Soniox prompt before and after

## Answer

Expanded from graph vocabulary: [soniox, transcription, context, terms, audio, call, prompt]. sonioxContext() builds the minimal context sent by SonioxClient.transcribeAudio(). Added exact multiword station terms plus a compact transcription_focus instruction. Added SONIOX_CONTEXT_VERSION so manual reanalysis retranscribes legacy audio once, while normal background reanalysis keeps cached transcripts.

## Source Nodes

- sonioxContext()
- SonioxClient
- .transcribeAudio()
- CallSummaryService