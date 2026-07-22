---
target: public
total_score: 24
p0_count: 0
p1_count: 3
timestamp: 2026-07-08T12-47-31Z
slug: client-info-api-public
---
Method: dual-agent (A: 019f41c0-c168-7b73-94bb-32662369196b · B: 019f41c0-efc7-7263-a5b8-620bbd011de1)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good loading/status labels, monitor sync, AI status; generic spinners still appear where skeletons would preserve layout. |
| 2 | Match System / Real World | 3 | Strong DUMA call-center vocabulary; English/API copy weakens an otherwise Ukrainian operator UI. |
| 3 | User Control and Freedom | 2 | Back links and modals exist, but costly/destructive actions use inconsistent exits and confirmation patterns. |
| 4 | Consistency and Standards | 2 | Main DUMA UI and AI settings use visibly different component languages. |
| 5 | Error Prevention | 2 | Some safeguards exist, but AI reanalysis and several deletes rely on weak or inconsistent confirmation. |
| 6 | Recognition Rather Than Recall | 3 | Key sections and filters are visible; settings/admin discoverability is uneven. |
| 7 | Flexibility and Efficiency | 3 | Persistent phone search, filters, pagination, and async extras help; keyboard accelerators are not obvious. |
| 8 | Aesthetic and Minimalist Design | 2 | Repeated cards, section labels, shadows, gradients, and side accents flatten priority. |
| 9 | Error Recovery | 3 | Inline messages and fallbacks exist; many failures stop at plain text instead of next-step recovery. |
| 10 | Help and Documentation | 1 | Help dots and empty states do not yet teach the harder AI/settings flows. |
| **Total** | | **24/40** | **Acceptable: strong domain foundation, significant product-UI refinement needed.** |

## Anti-Patterns Verdict

Does this look AI-generated? Not as a whole. The core client card, call monitor, stats, notes, and call detail flows feel like a real internal operator tool with domain-specific work to do. The risk is localized but important: AI settings reads like a separate AI-product surface rather than a native DUMA configuration area.

**LLM assessment**: The main surface is credible because it is dense, concrete, and workflow-shaped. The AI settings section introduces `.ai-soldly-*`, purple gradient buttons, decorative AI iconography, and a separate motion/color vocabulary. That makes the most sensitive configuration screen feel stitched into the product.

**Deterministic scan**: The detector found 15 findings: 12 `side-tab`, 1 `broken-image`, 1 `em-dash-overuse`, and 1 `overused-font`. Locations include `client-info-api/public/styles.css:1633`, `2808`, `2990`, `3144`, `4735`, `4833`, `7017`, `7083`, `7651`, `7723`, `8056`, `8348`; `client-info-api/public/index.html:1216`; and `client-info-api/public/styles.css:4938`.

The detector agrees with the human review on visual noise: left-side accent borders are used repeatedly for warnings, note/call/detail/metric/transcript blocks. Some are functional status encodings, but the repeated pattern contributes to a heavy card-and-accent vocabulary.

False positives: `broken-image` on `#telegram-photo-modal-image` is likely intentional because `app.js` populates and clears it dynamically. `em-dash-overuse` is likely placeholder glyphs, not prose. `overused-font` is context-dependent because Montserrat is an existing DUMA UI choice.

**Visual overlays**: No reliable user-visible overlay is available. Browser navigation to `http://127.0.0.1:3000/client-card?phone=380671112233` failed with `ERR_CONNECTION_REFUSED`; no local app server was listening on port 3000, so overlay injection and console collection could not run.

## Overall Impression

This is a serious operator tool with a real understanding of its workflow. The biggest opportunity is to make the UI hierarchy quieter and more trustworthy, especially by folding AI settings and high-stakes actions back into the same DUMA product language as the client card.

## What's Working

- The product understands its domain: ticket statuses, Binotel monitor, trip assignment, Telegram/Viber context, AI call quality, notes, and recordings are all represented as real workflows.
- The client card protects live-call speed by loading base identity/trip/ticket data first, then calls, Telegram, bus assignments, and AI extras asynchronously.
- Responsive coverage is broad: monitor rows, ticket rows, modals, stats tables, call detail, and AI settings all have explicit breakpoint handling.

## Priority Issues

**[P1] AI settings feels like a separate AI-generated app**

**Why it matters**: The `.ai-soldly-*` system, purple gradients, special AI buttons, and decorative badges diverge from the DUMA product vocabulary. This damages trust in the screen that controls call-quality analysis.

**Fix**: Rebuild AI settings with the same admin/card tokens used elsewhere: DUMA panels, standard primary/secondary buttons, restrained accents, no purple gradient hero, and no decorative AI-product badge. Frame the screen as quality rules configuration.

**Suggested command**: `$impeccable quieter public/index.html AI settings`

**[P1] Navigation mixes live-call work with configuration**

**Why it matters**: The top nav puts `Картка`, `Дзвінки`, `Статистика`, `AI-аналітика`, and `AI-налаштування` at the same level while the phone search is competing for space. Operators in a live call need operational paths first; configuration is a different tempo.

**Fix**: Split operational tabs from settings/admin. Keep `Картка`, `Дзвінки`, and `Статистика` primary. Move `AI-налаштування` and admin/configuration under profile or a compact settings affordance. Preserve `AI-аналітика` only if operators use it operationally; otherwise group it with reporting.

**Suggested command**: `$impeccable layout public header navigation`

**[P1] High-stakes actions lack one consistent reassurance model**

**Why it matters**: Notes and Telegram account deletion use custom confirmation, AI settings/admin still use `window.confirm`, and call reanalysis queues immediately. Costly, destructive, or trust-sensitive actions should all feel predictable.

**Fix**: Use one DUMA confirmation popover/dialog for destructive and costly actions. Include consequence, exact target, cancel, confirm, loading, success, and recovery states. Apply it to AI reset/delete, metric delete, user delete, Telegram delete, and reanalyze.

**Suggested command**: `$impeccable harden public high-stakes confirmations`

**[P2] Visual hierarchy is too uniformly card + label + shadow**

**Why it matters**: Repeated `.section-label`, panel shadows, gradients, and side accent borders make dense operator information harder to prioritize. Critical trip/call/next-action data has to fight with decorative structure.

**Fix**: Reserve accent labels for major regions only. Convert repeated data blocks to tighter list/table treatments where possible. Reduce decorative gradients in light theme. Keep side accent borders only where the side color encodes a necessary status.

**Suggested command**: `$impeccable layout public client card and call detail`

**[P2] Accessibility is partial, not complete**

**Why it matters**: Custom listboxes, profile/menu behavior, hidden help dots, and active nav state need a consistent keyboard and screen-reader model. Product UI can be dense, but it cannot require a mouse or visual-only cues.

**Fix**: Prefer native selects unless custom behavior is essential. Add `aria-current` to active nav. Verify menu keyboard conventions, dialog focus return, tooltip/help text accessibility, and focus order across modals.

**Suggested command**: `$impeccable audit public accessibility`

## Persona Red Flags

**Alex (Power Operator)**: Persistent search and filters help, but there are no visible keyboard accelerators for jumping from card to calls, notes, Telegram, monitor filters, or call detail. Dense screens still depend heavily on mouse navigation.

**Sam (Accessibility / Keyboard User)**: Custom selects and menus are visually styled but need stronger keyboard guarantees. AI help dots are `aria-hidden`, and active navigation should be programmatically exposed, not only visually highlighted.

**DUMA Call-Center Operator**: During a live call, the operator needs identity, nearest trip, last relevant event, and the next action within seconds. The UI contains the data, but chat controls, AI summaries, decorative labels, and configuration-heavy navigation compete with that live-call priority.

## Minor Observations

- Mixed language weakens polish: `Client Info API`, `Binotel analytics`, `Telegram User API`, and `Transcription + OpenAI summary` sit inside an otherwise Ukrainian operator UI.
- The hidden disabled Viber tab creates a feature-exists-but-does-not feeling. Show it only when relevant, or use a clear unavailable state.
- `setState()` supports an admin active nav state, but the header has no top-level admin link with `data-view-link="admin"`, so active-state logic and visible navigation do not fully match.
- Light theme uses decorative red gradients in the body/header/login; dark theme is calmer and more operator-like.

## Questions to Consider

- What must be visible in the first five seconds of a live customer call, and what can safely move one click deeper?
- Should AI feel like a colorful assistant, or like quiet audit evidence inside a quality-control tool?
- Which actions are expensive, irreversible, or trust-sensitive enough to require the DUMA confirmation pattern every time?
- If an operator never opens AI settings, does the main UI still give them the next best action after a difficult call?
