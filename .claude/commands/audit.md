---
description: Audit sécurité + perf JurisPurama (security-agent + Lighthouse + bundle analyze)
---

1. Invoque `security-agent` → rapport complet
2. `npm audit --audit-level=high`
3. `curl -s -o /dev/null -w "%{time_starttransfer}" https://jurispurama.purama.dev` (TTFB)
4. Lighthouse mobile + desktop sur / et /dashboard
5. Vérifier RLS VPS : `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'jurispurama_%'` + `SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'jurispurama_%'`
6. Rapport : critiques + hautes + perf + recommandations
