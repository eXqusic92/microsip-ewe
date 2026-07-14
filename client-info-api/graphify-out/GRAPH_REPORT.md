# Graph Report - .  (2026-07-09)

## Corpus Check
- 38 files · ~108,459 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1480 nodes · 3663 edges · 66 communities (58 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Telegram messaging service|Telegram messaging service]]
- [[_COMMUNITY_AI prompt generation|AI prompt generation]]
- [[_COMMUNITY_Authentication and users|Authentication and users]]
- [[_COMMUNITY_Call monitor analytics|Call monitor analytics]]
- [[_COMMUNITY_AI settings UI|AI settings UI]]
- [[_COMMUNITY_Admin API UI|Admin API UI]]
- [[_COMMUNITY_Main UI state|Main UI state]]
- [[_COMMUNITY_UI app workflow|UI app workflow]]
- [[_COMMUNITY_OpenAI analysis client|OpenAI analysis client]]
- [[_COMMUNITY_Telegram smoke tests|Telegram smoke tests]]
- [[_COMMUNITY_Manager quality UI|Manager quality UI]]
- [[_COMMUNITY_Binotel API client|Binotel API client]]
- [[_COMMUNITY_Call summary pipeline|Call summary pipeline]]
- [[_COMMUNITY_Viber read utility|Viber read utility]]
- [[_COMMUNITY_Ticket trip UI|Ticket trip UI]]
- [[_COMMUNITY_Client card data|Client card data]]
- [[_COMMUNITY_Soniox transcription|Soniox transcription]]
- [[_COMMUNITY_Call statistics formatters|Call statistics formatters]]
- [[_COMMUNITY_UI rendering helpers|UI rendering helpers]]
- [[_COMMUNITY_Call detail UI|Call detail UI]]
- [[_COMMUNITY_Viber HTML export|Viber HTML export]]
- [[_COMMUNITY_HTTP server|HTTP server]]
- [[_COMMUNITY_Viber native reader|Viber native reader]]
- [[_COMMUNITY_AI feedback storage|AI feedback storage]]
- [[_COMMUNITY_App state database|App state database]]
- [[_COMMUNITY_Binotel PostgreSQL store|Binotel PostgreSQL store]]
- [[_COMMUNITY_AI settings model|AI settings model]]
- [[_COMMUNITY_Viber messaging service|Viber messaging service]]
- [[_COMMUNITY_Demo client store|Demo client store]]
- [[_COMMUNITY_Dispatcher integration|Dispatcher integration]]
- [[_COMMUNITY_Telegram PostgreSQL store|Telegram PostgreSQL store]]
- [[_COMMUNITY_Auto client store|Auto client store]]
- [[_COMMUNITY_PostgreSQL client store|PostgreSQL client store]]
- [[_COMMUNITY_Notes summary stores|Notes summary stores]]
- [[_COMMUNITY_Booking status rules|Booking status rules]]
- [[_COMMUNITY_Recording cache|Recording cache]]
- [[_COMMUNITY_Package configuration|Package configuration]]
- [[_COMMUNITY_Runtime configuration|Runtime configuration]]
- [[_COMMUNITY_AI settings persistence|AI settings persistence]]
- [[_COMMUNITY_Audio player UI|Audio player UI]]
- [[_COMMUNITY_Cross-feature concepts|Cross-feature concepts]]
- [[_COMMUNITY_Admin feedback UI|Admin feedback UI]]
- [[_COMMUNITY_Transcript rendering|Transcript rendering]]
- [[_COMMUNITY_AI metric drag UI|AI metric drag UI]]
- [[_COMMUNITY_Notes UI|Notes UI]]
- [[_COMMUNITY_Login UI|Login UI]]
- [[_COMMUNITY_Server request helpers|Server request helpers]]
- [[_COMMUNITY_Telegram media UI|Telegram media UI]]
- [[_COMMUNITY_Telegram chat UI|Telegram chat UI]]
- [[_COMMUNITY_Audio waveform UI|Audio waveform UI]]
- [[_COMMUNITY_Chart rendering|Chart rendering]]
- [[_COMMUNITY_Custom select controls|Custom select controls]]
- [[_COMMUNITY_Admin UI chrome|Admin UI chrome]]
- [[_COMMUNITY_Analytics UI|Analytics UI]]
- [[_COMMUNITY_Product views|Product views]]
- [[_COMMUNITY_PostgreSQL recording store|PostgreSQL recording store]]
- [[_COMMUNITY_Trip assignment utilities|Trip assignment utilities]]
- [[_COMMUNITY_Ticket sorting|Ticket sorting]]
- [[_COMMUNITY_Heatmap tooltip|Heatmap tooltip]]
- [[_COMMUNITY_HTTP media helpers|HTTP media helpers]]
- [[_COMMUNITY_Profile menu|Profile menu]]
- [[_COMMUNITY_Viber database tools|Viber database tools]]
- [[_COMMUNITY_Deployment script|Deployment script]]
- [[_COMMUNITY_Viber macOS script|Viber macOS script]]
- [[_COMMUNITY_Logo asset|Logo asset]]
- [[_COMMUNITY_SVG logo asset|SVG logo asset]]

## God Nodes (most connected - your core abstractions)
1. `text()` - 61 edges
2. `AuthService` - 47 edges
3. `TelegramUserService` - 41 edges
4. `stageMotionItems()` - 41 edges
5. `apiFetch()` - 37 edges
6. `normalizePhone()` - 34 edges
7. `BinotelMonitorService` - 30 edges
8. `renderCallDetail()` - 30 edges
9. `service()` - 30 edges
10. `phoneDigits()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Trip and Ticket History Preview` --conceptually_related_to--> `Dispatcher Trip Assignments`  [INFERRED]
  client-card-preview.png → README.md
- `Binotel Call Context Preview` --conceptually_related_to--> `Binotel Real-time Monitor`  [INFERRED]
  client-card-preview.png → README.md
- `Customer Operations Dashboard Preview` --references--> `Client Card View`  [INFERRED]
  client-card-preview.png → public/index.html
- `handleRequest()` --calls--> `normalizePhone()`  [EXTRACTED]
  server.js → lib/phone.js
- `reenabledConnectedAccountStaysConnected()` --calls--> `nextTelegramAccountStatus()`  [EXTRACTED]
  scripts/telegram-smoke-test.js → lib/app-state-db.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DUMA Customer Operations System** — readme_read_only_crm, readme_app_state_postgresql, readme_binotel_monitor, readme_ai_call_pipeline [EXTRACTED 1.00]
- **Customer Card Interface** — public_index_client_card, public_index_phone_search, public_index_call_operations, public_index_analytics_views [EXTRACTED 1.00]

## Communities (66 total, 8 thin omitted)

### Community 0 - "Telegram messaging service"
Cohesion: 0.06
Nodes (46): attachTelegramReplyPreviews(), canFallbackToImportContacts(), compactError(), gramJs(), hydrateTelegramReplyPreviews(), idText(), importedContactWasCreated(), importedUser() (+38 more)

### Community 1 - "AI prompt generation"
Cohesion: 0.08
Nodes (57): analysisCallTypes(), analysisMetricKeys(), analysisOptionKeys(), averageMetricConfidence(), buildCallEvaluationSchema(), buildCallEvaluationSystemPrompt(), buildCallSummarySystemPrompt(), buildCallTypeClassificationSchema() (+49 more)

### Community 2 - "Authentication and users"
Cohesion: 0.09
Nodes (14): AuthService, crypto, hashPassword(), isValidUsername(), mapSession(), mapUser(), normalizeUsername(), nowIso() (+6 more)

### Community 3 - "Call monitor analytics"
Cohesion: 0.08
Nodes (31): addCounter(), addCustomMetric(), addMetricRating(), BinotelMonitorService, buildManagerRating(), callTimestamp(), { canHaveRecording }, createMetricRating() (+23 more)

### Community 4 - "AI settings UI"
Cohesion: 0.08
Nodes (59): addAiCallType(), addAiDraftOption(), addAiMetric(), aiColorMenuHtml(), aiColorPaletteHtml(), aiOptionRowByKey(), aiScoreOptionsHtml(), applyAiSettingsPayload() (+51 more)

### Community 5 - "Admin API UI"
Cohesion: 0.09
Nodes (52): adminUserById(), apiFetch(), clearTelegramAccountDropdown(), clearTelegramReplyTarget(), closeMetricFeedbackModal(), collectMetricPromptProposal(), deleteAdminUser(), deleteMetricFeedback() (+44 more)

### Community 6 - "Main UI state"
Cohesion: 0.04
Nodes (31): adminState, AI_COLOR_PALETTE, AI_ICON_PATHS, aiSettingsState, authState, CALL_STATS_WEEKDAYS, CALL_TYPE_COLORS, CALL_TYPE_LABELS (+23 more)

### Community 7 - "UI app workflow"
Cohesion: 0.07
Nodes (48): boot(), buildTicketOrderGroups(), callStatsApiUrl(), formatPhone(), handleMessagingTabsClick(), isDetailAudioActive(), isMonitorAudioActive(), loadAuthSession() (+40 more)

### Community 8 - "OpenAI analysis client"
Cohesion: 0.09
Nodes (30): AiPrompts, callDateForAi(), collectCriticalPromptMarkers(), collectPromptPreservationHints(), combineUsage(), compactClientContextForAi(), compactSecondaryTranscript(), compactTicketForAi() (+22 more)

### Community 9 - "Telegram smoke tests"
Cohesion: 0.10
Nodes (36): nextTelegramAccountStatus(), accountLookupRunsInBoundedParallelAndKeepsOrder(), assert, cachedContactReadsMessagesWithoutImportingAgain(), cachedConversationRelabelsServiceActions(), codeAndPasswordCanBeConfirmedInOneSubmit(), conversationFetchesMissingReplyPreview(), conversationLabelsTelegramMessageKinds() (+28 more)

### Community 10 - "Manager quality UI"
Cohesion: 0.09
Nodes (37): appendManagerModalMetric(), appendManagerModalSummary(), appendQualityMetric(), appendQualityMetricGroup(), appendQualityNoteGroup(), createManagerRatingCell(), createManagerRatingChip(), createQualityMetricElement() (+29 more)

### Community 11 - "Binotel API client"
Cohesion: 0.11
Nodes (21): BinotelApiError, BinotelClient, buildEndpoint(), callTypeInfo(), DISPOSITION_LABELS, findRecordingUrl(), integer(), { lookupVariants } (+13 more)

### Community 12 - "Call summary pipeline"
Cohesion: 0.11
Nodes (17): AiPrompts, audioExtension(), CallSummaryService, configuredTranscriptionProvider(), isCurrentAnalysisProfile(), isCurrentVersion(), isFreshProcessing(), latestRecordableCall() (+9 more)

### Community 13 - "Viber read utility"
Cohesion: 0.08
Nodes (25): args, config, dbPath(), exists(), findFile(), firstExisting(), fs, isDir() (+17 more)

### Community 14 - "Ticket trip UI"
Cohesion: 0.09
Nodes (33): appendModalTicket(), appendTicket(), applyTripAssignmentsToCard(), cardTripIds(), closeTicketsModal(), dateKey(), formatDate(), formatMoney() (+25 more)

### Community 15 - "Client card data"
Cohesion: 0.08
Nodes (22): attachTicketTransferSegments(), { BinotelClient }, BookingRules, { CallSummaryService }, compactClientContext(), compactTicketContext(), createClientStore(), { createDemoCard } (+14 more)

### Community 16 - "Soniox transcription"
Cohesion: 0.14
Nodes (21): DOMAIN_TERMS, TRANSCRIPTION_DOMAIN_PROMPT, buildTranscriptText(), { DOMAIN_TERMS, TRANSCRIPTION_DOMAIN_PROMPT }, dominantLanguages(), endpoint(), isRetryableStatus(), MINIMAL_DOMAIN_TERMS (+13 more)

### Community 17 - "Call statistics formatters"
Cohesion: 0.20
Nodes (31): callStatsAnswerTone(), callStatsCompactFocus(), callStatsDailyFocus(), callStatsDateLabel(), callStatsDecimal(), callStatsDurationFocus(), callStatsHourlyFocus(), callStatsInsightRows() (+23 more)

### Community 18 - "UI rendering helpers"
Cohesion: 0.09
Nodes (30): aiIcon(), aiSwitchHtml(), appendOrderGroup(), escapeHtml(), feedbackAppliedText(), feedbackAuthorLabel(), feedbackMetaText(), formatCallPhone() (+22 more)

### Community 19 - "Call detail UI"
Cohesion: 0.10
Nodes (30): aiStatusInfo(), appendCall(), appendDetailGroup(), appendDetailValue(), appendMonitorAlertBadge(), appendMonitorCall(), callDetailUrl(), callDirectionIconSvg() (+22 more)

### Community 20 - "Viber HTML export"
Cohesion: 0.13
Nodes (28): args, dateKey(), defaultOutput(), digitsOnly(), escapeAttr(), escapeHtml(), fileNameFromPath(), formatDay() (+20 more)

### Community 21 - "HTTP server"
Cohesion: 0.08
Nodes (25): animeBundlePath, appStateDatabase, { AuthService }, binotelMonitor, { BinotelMonitorService }, callStatsPeriod(), chartBundlePath, config (+17 more)

### Community 22 - "Viber native reader"
Cohesion: 0.25
Nodes (26): ostream, ostringstream, QSqlDatabase, QString, QVariant, string, contactNumberExpression(), containsText() (+18 more)

### Community 23 - "AI feedback storage"
Cohesion: 0.19
Nodes (8): settingsRevision(), appStateRequestError(), feedbackActor(), findMetricPromptTarget(), metricPromptBundle(), metricPromptDraftSourceHash(), normalizePromptRewriteProposal(), PostgresAiMetricFeedbackStore

### Community 24 - "App state database"
Cohesion: 0.13
Nodes (23): attachCachedTelegramReplyPreviews(), cachedTelegramReplyPreview(), callSummaryColumns(), cloneJson(), createAppStateDatabase(), createAppStatePool(), {
  createDefaultAiAnalysisSettings,
  normalizeAiAnalysisSettings,
  settingsRevision,
  settingsScoringRevision,
  settingsSemanticRevision
}, crypto (+15 more)

### Community 25 - "Binotel PostgreSQL store"
Cohesion: 0.18
Nodes (9): analysisInternalNumberEnabledClause(), binotelCallColumns(), callIdFromCall(), integer(), monitorAnalyticsRow(), optionalTimestamp(), PostgresBinotelMonitorStore, syncFromRow() (+1 more)

### Community 26 - "AI settings model"
Cohesion: 0.17
Nodes (21): booleanValue(), CALL_TYPES, clampScore(), clone(), createMetric(), crypto, DEFAULT_COLORS, finiteNumber() (+13 more)

### Community 27 - "Viber messaging service"
Cohesion: 0.15
Nodes (14): accountPhoneFromDbPath(), compactError(), contactInitialName(), { execFile }, execFileAsync, fileMessageText(), fs, messageText() (+6 more)

### Community 28 - "Demo client store"
Cohesion: 0.15
Nodes (7): decorateCardStatuses(), DemoClientStore, getBinotelCalls(), ticketStatusLabel(), createDemoCard(), normalizePhone(), userMatchesPhone()

### Community 29 - "Dispatcher integration"
Cohesion: 0.19
Nodes (10): cookieHeaderFromSetCookie(), DispatcherApiClient, extractBusAssignment(), extractBusColor(), extractBusNumber(), getSetCookieHeaders(), normalizeBaseUrl(), normalizeTripId() (+2 more)

### Community 30 - "Telegram PostgreSQL store"
Cohesion: 0.28
Nodes (4): PostgresTelegramStore, telegramAccountPayload(), telegramContactPayload(), text()

### Community 33 - "Notes summary stores"
Cohesion: 0.17
Nodes (7): normalizeLocalNoteId(), nowIso(), PostgresCallSummaryStore, PostgresLocalNotesStore, { phoneDigits }, lookupVariants(), phoneDigits()

### Community 34 - "Booking status rules"
Cohesion: 0.23
Nodes (14): eventReplacesBusReservation(), getAnnulmentStatus(), getAutoReturnStatus(), getBookingReportStatusLabel(), getManagerStatsEventGroup(), getSearchStatusLabel(), getTicketEventAmount(), getTicketStatusAfterOrderAction() (+6 more)

### Community 35 - "Recording cache"
Cohesion: 0.22
Nodes (7): audioExtension(), fs, nowIso(), path, RecordingCache, safeId(), text()

### Community 36 - "Package configuration"
Cohesion: 0.12
Nodes (15): dependencies, animejs, chart.js, pg, telegram, description, engines, node (+7 more)

### Community 37 - "Runtime configuration"
Cohesion: 0.13
Nodes (7): demoMode, fs, path, port, telegramApiId, transcriptionAudioPreprocessing, transcriptionMaxAudioBytes

### Community 38 - "AI settings persistence"
Cohesion: 0.31
Nodes (6): createDefaultAiAnalysisSettings(), normalizeAiAnalysisSettings(), settingsScoringRevision(), settingsSemanticRevision(), persistAnalysisSettings(), PostgresAiAnalysisSettingsStore

### Community 39 - "Audio player UI"
Cohesion: 0.25
Nodes (14): clampNumber(), detailAudioDisplayTime(), detailAudioDuration(), detailAudioHasBufferAhead(), formatPlaybackTime(), playDetailAudio(), playDetailAudioFrom(), positionUiConfirmPopover() (+6 more)

### Community 40 - "Cross-feature concepts"
Cohesion: 0.15
Nodes (13): Binotel Call Context Preview, Trip and Ticket History Preview, User Profile Menu, Login Form, Custom AI Analysis Settings, AI Call Analysis Pipeline, App-state PostgreSQL, Authenticated Access (+5 more)

### Community 41 - "Admin feedback UI"
Cohesion: 0.21
Nodes (13): adminMetricFeedbackById(), appendMetricPromptDiffField(), closeMetricPromptModal(), deleteAdminMetricFeedback(), handleAdminMetricFeedbackClick(), loadMetricPromptUpdate(), metricPromptFieldValue(), metricPromptOptionMeta() (+5 more)

### Community 42 - "Transcript rendering"
Cohesion: 0.21
Nodes (12): findTranscriptSpeaker(), inferredSpeakerRoles(), normalizeSpeakerRole(), renderTranscript(), segmentTimestamp(), speakerAliasKey(), speakerLabel(), speakerOrdinal() (+4 more)

### Community 43 - "AI metric drag UI"
Cohesion: 0.25
Nodes (11): aiMetricDropPosition(), aiMetricRowFromPoint(), clearAiMetricDragState(), clearAiMetricDragTargets(), handleAiMetricPointerCancel(), handleAiMetricPointerDown(), handleAiMetricPointerMove(), handleAiMetricPointerUp() (+3 more)

### Community 44 - "Notes UI"
Cohesion: 0.24
Nodes (10): applyUpdatedNote(), canonicalNoteId(), createNoteIconButton(), deleteNote(), isEditableNote(), removeCurrentNote(), renderNotes(), sameNoteId() (+2 more)

### Community 45 - "Login UI"
Cohesion: 0.24
Nodes (8): currentTheme(), form, message, passwordInput, setTheme(), themeToggle, updateThemeControl(), usernameInput

### Community 46 - "Server request helpers"
Cohesion: 0.29
Nodes (10): handleRequest(), loginRedirect(), redirect(), requirePageAdmin(), requirePageAuth(), safeLoginTarget(), safeNextPath(), sendDiskFile() (+2 more)

### Community 47 - "Telegram media UI"
Cohesion: 0.22
Nodes (9): appendTelegramMedia(), createTelegramMediaCard(), currentTelegramPhone(), shouldRenderTelegramMessage(), telegramMediaIcon(), telegramMediaSubtitle(), telegramMediaTitle(), telegramMediaUrl() (+1 more)

### Community 48 - "Telegram chat UI"
Cohesion: 0.22
Nodes (9): appendTelegramReplyPreview(), handleTelegramChatClick(), openTelegramPhotoModal(), renderTelegramMessages(), selectedTelegramMatch(), setTelegramReplyTarget(), telegramMessageById(), telegramMessageSummary() (+1 more)

### Community 49 - "Audio waveform UI"
Cohesion: 0.25
Nodes (9): audioCssVar(), buildSyntheticDetailPeaks(), drawDetailAudioCanvas(), drawRoundedRect(), placeholderAudioPeaks(), rebuildDetailAudioBarRoles(), refreshDetailAudioPalette(), resizeDetailAudioCanvas() (+1 more)

### Community 50 - "Chart rendering"
Cohesion: 0.25
Nodes (9): callStatsBaseChartOptions(), callStatsChartInteraction(), callStatsChartPalette(), callStatsCssVar(), currentTheme(), renderCallStatsChart(), renderCallStatsCharts(), setTheme() (+1 more)

### Community 51 - "Custom select controls"
Cohesion: 0.29
Nodes (8): chooseCustomSelectValue(), closeCustomSelect(), closeCustomSelects(), enhanceCustomSelect(), enhanceCustomSelects(), openCustomSelect(), selectedCustomSelectOption(), syncCustomSelect()

### Community 52 - "Admin UI chrome"
Cohesion: 0.29
Nodes (7): animateUiConfirmPopover(), handleAdminTabsClick(), prefersReducedMotion(), renderAdminChrome(), renderAiSettingsTabs(), replayMotion(), setAdminTab()

### Community 53 - "Analytics UI"
Cohesion: 0.33
Nodes (7): appendAnalyticsDistributionRow(), formatApiUsd(), formatMinutesFromSeconds(), loadAnalyticsPage(), loadMonitorAnalytics(), renderCallTypeAnalytics(), renderCallTypeAnalyticsError()

### Community 54 - "Product views"
Cohesion: 0.33
Nodes (6): Customer Operations Dashboard Preview, Call Statistics and AI Analytics, Call Operations Views, Client Card View, Phone Search, Primary Application Navigation

### Community 57 - "Ticket sorting"
Cohesion: 0.50
Nodes (4): firstTimestampValue(), ticketDepartSortValue(), ticketOrderRecency(), timestampValue()

### Community 58 - "Heatmap tooltip"
Cohesion: 0.83
Nodes (4): getCallStatsHeatmapTooltipElement(), hideCallStatsHeatmapTooltip(), positionCallStatsHeatmapTooltip(), showCallStatsHeatmapTooltip()

### Community 59 - "HTTP media helpers"
Cohesion: 0.50
Nodes (4): parseRange(), safeHeaderFilename(), sendAudio(), sendTelegramMedia()

### Community 60 - "Profile menu"
Cohesion: 0.67
Nodes (3): openChangePasswordModal(), setProfileMenuOpen(), toggleProfileMenu()

### Community 61 - "Viber database tools"
Cohesion: 0.67
Nodes (3): Local Viber Desktop Database, Native Viber Database Reader, Viber Production Collector

## Knowledge Gaps
- **163 isolated node(s):** `deploy.sh script`, `crypto`, `DEFAULT_COLORS`, `METRIC_TEMPLATES`, `CALL_TYPES` (+158 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phoneDigits()` connect `Notes summary stores` to `Telegram messaging service`, `Call summary pipeline`, `Client card data`, `App state database`, `Binotel PostgreSQL store`, `Viber messaging service`, `Demo client store`, `Telegram PostgreSQL store`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `normalizePhone()` connect `Demo client store` to `PostgreSQL client store`, `Notes summary stores`, `Telegram messaging service`, `Server request helpers`, `Client card data`, `HTTP server`, `App state database`, `Viber messaging service`, `Telegram PostgreSQL store`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `TelegramUserService` connect `Telegram messaging service` to `Telegram smoke tests`, `HTTP server`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `deploy.sh script`, `crypto`, `DEFAULT_COLORS` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Telegram messaging service` be split into smaller, more focused modules?**
  _Cohesion score 0.059097127222982215 - nodes in this community are weakly interconnected._
- **Should `AI prompt generation` be split into smaller, more focused modules?**
  _Cohesion score 0.07514124293785311 - nodes in this community are weakly interconnected._
- **Should `Authentication and users` be split into smaller, more focused modules?**
  _Cohesion score 0.08870056497175141 - nodes in this community are weakly interconnected._