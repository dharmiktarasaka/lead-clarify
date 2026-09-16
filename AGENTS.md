# AI Lead Agent - Permanent Agent Directives

1. **Admin Theme Matches Main App**:
   - The Admin panel (`ai-lead-agent/admin`) must always share the same clean, crisp light SaaS design system as the main client (`ai-lead-agent/client`):
     - Background: `#F8FAFC`, Cards/Sidebar: `#FFFFFF`, Borders: `#DDE3EC`
     - Brand color: `#4F46E5` (Indigo) with `#EEF2FF` light tint
     - Text colors: Primary `#172033`, Secondary `#5B667A`, Muted `#8A94A6`
     - Status colors: Green `#16A34A`, Red `#DC2626`, Yellow `#D97706`
     - Typography: `Plus Jakarta Sans`

2. **Strictly 100% Real Data - Never Show Dummy/Fake Data**:
   - The admin panel must show ONLY real data pulled from the database or live services.
   - Never show dummy, fake, mocked, or placeholder records or stats anywhere in the admin dashboard, user tables, leads views, or audit logs.
   - If no records exist, show honest empty states.

3. **Icons**:
   - Always use `@animateicons/react/lucide` icons.
