---
description: Deploy JurisPurama prod — QA + Security agents + vercel --prod + smoke test
---

Exécute dans cet ordre strict :

1. Invoque `qa-agent` (Task tool, subagent_type: qa-agent) → attends VERDICT : DEPLOY OK
2. Invoque `security-agent` → attends VERDICT : PROD OK
3. `npx tsc --noEmit` → 0 erreur
4. `npm run build` → 0 erreur
5. `grep -rn "TODO\|Lorem\|placeholder\|originstamp\|tryterra\|console.log" src/ --include="*.ts" --include="*.tsx"` → 0
6. `vercel --prod --token $VERCEL_TOKEN --scope puramapro-oss --yes`
7. Smoke test :
   - `curl -s -o /dev/null -w "%{http_code}" https://jurispurama.purama.dev` → 200
   - `curl -s https://jurispurama.purama.dev/api/status` → `{"ok":true}`
   - Test endpoint critique (GET /api/cases avec auth)
8. Vérifier Vercel deployment READY via `vercel ls`
9. Rapport final : URL live + commit hash + status

**Si QA ou Security BLOQUÉ → STOP, ne deploy PAS.**
**Si 1 smoke test échoue → rollback immédiat via `vercel promote <previous>`.**
