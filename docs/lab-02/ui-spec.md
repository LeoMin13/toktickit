# Lab 2 UI Specification — Zen Green Theme

## 1. Color Tokens

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#006B3C` | Header, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tab, focus accent, links, hover |
| `--color-pale` | `#EAF6EF` | Selected/success/subtle emphasis |
| `--color-bg` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards/panels |
| `--color-border` | `#D9E2DD` | Default borders |
| `--color-text` | `#1F2B25` | Primary text |
| `--color-readonly-bg` | `#EEF3F0` | Read-only field background |
| `--color-error` | `#8A1F1F` | Error text/border |
| `--color-warning` | `#B9770E` | Warning callouts/badges only |

Priority badges: LOW → secondary green, MEDIUM → amber, HIGH → error red.
Status badge: `New` → pale-green pill. All badges include text, never
color alone.

## 2. Typography and Spacing

System UI font stack; base 16px, labels 14px/600. Spacing scale
4/8/12/16/24/32px. Max content width 1120px, centered.

## 3. Field States

| State | Style |
|---|---|
| Editable | White bg, `--color-border`; `--color-secondary` outline on focus |
| Read-only | `--color-readonly-bg`, no focus border, `aria-readonly` |
| Invalid | `--color-error` border (2px) + message below field |
| Disabled | 50% opacity, `cursor: not-allowed`, not focusable |

One consistent input height (40px); Description is taller (min 120px),
resizable. Required fields show a red asterisk, never a substitute for the
validation message.

## 4. Button Hierarchy

Primary (solid `--color-primary`, white text) → Submit/Continue. Secondary
(white, `--color-primary` border) → Cancel/Clear Filters. Tertiary (text
only) → Change Requester. Destructive (`--color-error` border, solid on
confirm) → Remove Attachment. Disabled → 50% opacity, no interaction. Busy
→ primary style + spinner + disabled, label changes to "Submitting…".
Icon-only controls always carry an `aria-label` and tooltip.

## 5. Screen States

Every data screen implements: **Loading** (spinner/skeleton), **Validation**
(field-level red messages, first invalid field focused), **Submitting**
(busy button, fields disabled, no duplicate submit), **Success** (pale-green
panel with Ticket Number and next action), **Failure** (plain-language
message + Retry, no technical detail), **Empty** (icon + message + primary
CTA), **No-results** (distinct message + Clear Filters).

## 6. Responsive Rules

| Viewport | Behavior |
|---|---|
| Desktop ≥992px | Multi-column, centered, max-width 1120px |
| Tablet 768–991px | Two-column where practical |
| Mobile <768px | Fields stack; buttons full-width, touch-friendly; My Tickets renders as cards, not a table |
| All | No clipped labels, no overlap, no horizontal scroll |

## 7. Accessibility

Every control has an associated `<label>`; tab order follows visual order;
focus moves to the first error on failed validation; color is never the
only state indicator; 4.5:1 minimum text contrast.

## 8. Screen Layouts

- **App shell:** TokTickIT identity, My Tickets/Create Ticket nav, current
  Requester name + Change Requester action, collapsible mobile nav.
- **Create Ticket:** generated fields (read-only) near top; classification
  fields grouped; Summary/Description full width; Attachments below;
  primary/secondary actions at bottom.
- **My Tickets:** search box; filters (Category, Priority, Status); sortable
  columns (Ticket No., Created Date, Summary, Category, Priority, Status,
  Last Updated); pagination; Create Ticket shortcut; Clear Filters.
  Mobile cards show Ticket No. + Status badge, Summary, and a secondary
  line (Category · Priority · Date).
- **Ticket Detail:** read-only header fields, separated from an Attachments
  list (name, size, date, active/removed status; Download/Remove on active
  only; removed items show reduced opacity + reason + date).

## 9. Screenshot Paths

`artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}.png`

## 10. Visual Checklist

- [ ] No clipped labels/buttons at any viewport
- [ ] No overlapping messages/badges
- [ ] No unintended horizontal scroll
- [ ] Read-only fields visually distinct from editable ones
- [ ] Badge colors match §1 exactly, with text labels
- [ ] Keyboard focus indicator visible throughout Create Ticket
