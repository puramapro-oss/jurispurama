---
description: Checklist 22 points QA + tests Playwright complets JurisPurama
---

Lance la checklist 22 points (qa-agent) + tests Playwright :

1. Build + lint : `npx tsc --noEmit && npm run build`
2. Chaque feature BRIEF.md §4 testée en live
3. `curl` chaque API route principale (status, cases, stripe/webhook sans sig, referral, ambassadeur)
4. Auth flow Supabase (inscription réelle + Google OAuth réelle + déconnexion)
5. Responsive 375px → aucun overflow
6. `npx playwright test` → 100% pass
7. Rapport ✅/❌ par point, résumé final
