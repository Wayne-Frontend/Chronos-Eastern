# Design QA

- source visual truth:
  - `C:\Users\wzzzz\AppData\Local\Temp\codex-clipboard-5115a158-62e7-4994-b702-5633405edf7c.png`
  - `C:\Users\wzzzz\AppData\Local\Temp\codex-clipboard-dc52f109-a4ff-4dfc-bd4f-85863110301d.png`
  - `C:\Users\wzzzz\AppData\Local\Temp\codex-clipboard-0db3c644-bcbd-46c5-99f7-d7338ce5dadd.png` (information-structure reference only)
  - `C:\Users\wzzzz\AppData\Local\Temp\codex-clipboard-8aaa2214-49ec-4751-820b-dd7853840452.png` (latest annotated runtime state before this revision)
- runtime evidence of failed first revision:
  - `C:\Users\wzzzz\AppData\Local\Temp\codex-clipboard-f53070e5-ff8e-4c86-a7dc-396cff974ff6.png`
- implementation screenshot: unavailable
- viewport: WeChat Mini Program mobile viewport; exact rendered viewport unavailable
- source pixel dimensions: homepage crop 373 × 314; detail capture 394 × 698
- implementation pixel dimensions / CSS size / density: unavailable
- state: homepage daily reference and date-detail explanation

## Full-view comparison evidence

The source screenshots were inspected and used to identify the original hierarchy problem: internal rule names, coverage warnings, and source metadata appeared before a plain-language result. The revised implementation cannot be rendered or captured in the current environment because this repository has no browser preview runtime and the WeChat Developer Tools surface is not available to the verification tools.

## Focused region comparison evidence

Blocked for the same reason. Code inspection confirms that the focused regions now render a user conclusion first, place plain-language reasons second, and hide traditional source material behind an explicit disclosure control, but code inspection is not a substitute for visual evidence.

## Findings

- [P1] Rendered mobile layout has not been visually verified.
  - Location: homepage daily-reference block and date-detail reference card.
  - Evidence: no post-change WeChat Developer Tools or real-device screenshot is available.
  - Impact: text wrapping, vertical density, disclosure-button appearance, and multi-item homepage tabs could still have visual issues.
  - Fix: open the project in WeChat Developer Tools, capture the same homepage and date-detail states, and compare at the same viewport before release.

## Comparison history

- Initial review: source screenshots showed engineering terminology dominating the result.
- Implemented fix: added a user-facing presentation layer, simplified the homepage and find-date results, and moved source material into a collapsed section.
- Runtime review of the first revision: rejected because “2 项相关记录” still exposed an internal count instead of giving the user an actionable explanation.
- Second fix: removed internal counts from the presentation API and made the homepage subtitle an actionable suggestion.
- Third fix: replaced sentence-style outcomes with compact 宜/忌 presentation, grouped homepage items above their traditional names, made the section title matter-neutral, and added the nearest-festival countdown.
- Post-fix visual evidence: unavailable; no visual iteration could be completed.

## Required fidelity surfaces

- Fonts and typography: blocked pending rendered capture.
- Spacing and layout rhythm: blocked pending rendered capture.
- Colors and visual tokens: existing project tokens were reused; rendered verification remains blocked.
- Image quality and asset fidelity: no new image assets were introduced.
- Copy and content: verified in code and automated tests; internal rule/version/coverage terminology was removed from the affected user flows.

## Primary interactions

- Static verification confirms handlers exist for switching homepage matters, opening date details, and expanding/collapsing traditional source information.
- Runtime interaction testing is blocked without WeChat Developer Tools automation or a real-device capture.

## Console errors

- Not checked; no WeChat runtime was available.

## Implementation checklist

- [x] User-facing result precedes technical evidence.
- [x] Matter name is dynamic rather than hard-coded to travel.
- [x] Future queryable matters automatically appear in the homepage switcher.
- [x] Source text is collapsed by default.
- [x] TypeScript, ESLint, Stylelint, tests, and formatting pass.
- [ ] Capture and visually compare the revised mini-program screens.

final result: blocked
