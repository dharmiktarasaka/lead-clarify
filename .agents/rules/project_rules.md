# AI Lead Agent - Project Operating Rules & Standards

## 1. Unified Design System & Aesthetics
- The Admin Panel (`ai-lead-agent/admin`) MUST strictly match the visual design system, color palette, and light SaaS theme of the Main Application (`ai-lead-agent/client`).
- Standard Color Tokens:
  - Background Base: `#F8FAFC` (`--bg-primary`)
  - Surface / Cards / Tables: `#FFFFFF` (`--bg-secondary` / `--bg-card`)
  - Sub-surfaces / Zebra / Headers: `#F1F5F9` (`--bg-tertiary`)
  - Borders: `#DDE3EC` (`--border-primary`), `#E8EDF5` (`--border-color-light`)
  - Text Primary: `#172033` (`--text-primary`)
  - Text Secondary: `#5B667A` (`--text-secondary`)
  - Text Muted: `#8A94A6` (`--text-muted`)
  - Brand Indigo: `#4F46E5` (`--accent-primary`), Hover: `#4338CA` (`--accent-primary-hover`)
  - Brand Light Accent: `#EEF2FF` (`--accent-light`)
  - Success Green: `#16A34A` (`--success`), `#F0FDF4` bg, `#BBF7D0` border
  - Danger Red: `#DC2626` (`--danger`), `#FEF2F2` bg, `#FECACA` border
  - Warning Amber: `#D97706` (`--warning`), `#FFFBEB` bg, `#FDE68A` border
  - Info Blue: `#0284C7` (`--info`), `#F0F9FF` bg, `#BAE6FD` border
- Font: `'Plus Jakarta Sans', sans-serif`
- Icons: Always use animated icons from `@animateicons/react/lucide` exclusively.

## 2. Zero Dummy / Fake Data Policy
- The Admin Panel MUST NEVER display dummy, hardcoded, mocked, placeholder, or fake data anywhere.
- Every metric, KPI count, user record, lead entry, session log, and system statistic MUST be queried live from the MongoDB Atlas database and verified backend APIs.
- If a collection or query returns zero records, the UI must honestly and clearly display a truthful empty state (e.g. "No users registered yet", "No leads analyzed yet", "No login activity recorded").
- Never fabricate chart curves, never insert fake placeholder names or demo companies.

## 3. Persistent Memory & Commitment
- These rules are permanent for this project and must be adhered to in every future task, modification, or component addition.
