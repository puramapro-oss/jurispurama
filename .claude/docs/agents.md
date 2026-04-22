# PURAMA — AGENTS MODULE (chargé à la demande)
Module agentique : architecture .claude/ (sub-agents QA/Security/skills/commands/hooks), Boris Cherny rules, workflow session, interdictions, bootstrap global. Chargé quand Claude Code configure une nouvelle app, met en place l'architecture agentique, ou structure le workflow d'une session.

## ARCHITECTURE AGENTIQUE .claude/
Chaque app Purama DOIT avoir cette structure dès le départ :
```
~/purama/SLUG/
├── CLAUDE.md                         ← cp ~/purama/CLAUDE.md
├── STRIPE_CONNECT_KARMA_V4.md        ← cp ~/purama/STRIPE_CONNECT_KARMA_V4.md (OBLIGATOIRE depuis 21/04/2026)
├── BRIEF.md                          ← brief métier de l'app
├── task_plan.md                      ← plan AVANT tout code
├── .claude/
│   ├── agents/
│   │   ├── qa-agent.md
│   │   └── security-agent.md
│   ├── skills/
│   │   ├── supabase-purama/SKILL.md
│   │   ├── vercel-deploy/SKILL.md
│   │   └── design-system/SKILL.md
│   ├── commands/
│   │   ├── deploy.md      ← /deploy → QA+Security+vercel --prod
│   │   ├── test-full.md   ← /test-full → checklist 22 points
│   │   └── audit.md       ← /audit → sécurité+perf
│   └── hooks/
│       └── stop-verify.sh ← vérifie à chaque fin de turn
```
COMMANDE D'INIT COMPLÈTE (V7.1 — inclut brief Stripe Connect V4):
```bash
mkdir ~/purama/SLUG && cd ~/purama/SLUG
cp ~/purama/CLAUDE.md .
cp ~/purama/STRIPE_CONNECT_KARMA_V4.md .
mkdir -p .claude/agents .claude/skills/supabase-purama .claude/skills/vercel-deploy .claude/skills/design-system .claude/commands .claude/hooks
cp ~/purama/.claude/agents/qa-agent.md .claude/agents/
cp ~/purama/.claude/agents/security-agent.md .claude/agents/
cp ~/purama/.claude/skills/supabase-purama/SKILL.md .claude/skills/supabase-purama/
cp ~/purama/.claude/skills/vercel-deploy/SKILL.md .claude/skills/vercel-deploy/
cp ~/purama/.claude/skills/design-system/SKILL.md .claude/skills/design-system/
claude --dangerously-skip-permissions
```

**SKILL SUPABASE-PURAMA(.claude/skills/supabase-purama/SKILL.md)**:Instance self-hosted URL:auth.purama.dev ProjectID:ylkkmvihffblfhsvabqa VPS:72.62.191.111. Règles:1.createServerClient côté serveur 2.createBrowserClient côté client 3.JAMAIS service_role client 4.RLS TOUTES tables 5.Migrations /supabase/migrations/ timestamp ISO.

**SKILL VERCEL-DEPLOY(.claude/skills/vercel-deploy/SKILL.md)**:Team:team_dGuJ4PqnSU1uaAHa26kkmKKk. Pré-deploy:build 0 erreur+QA validé+Security validé+env vars Vercel+domain *.purama.dev. Preview:`vercel --team team_dGuJ4PqnSU1uaAHa26kkmKKk`. Prod:`vercel --prod --team team_dGuJ4PqnSU1uaAHa26kkmKKk`. Domain:`vercel domains add SLUG.purama.dev --team team_dGuJ4PqnSU1uaAHa26kkmKKk`.

## BORIS CHERNY — RÈGLES OPÉRATIONNELLES
**CONTEXTE**:#1:/compact OBLIGATOIRE à 50%. /context pour voir %. #2:/clear entre tâches DIFFÉRENTES(bug→feature=/clear). Contexte pollué=hallucinations. #3:/rename sessions("[TODO-ADYA landing]","[EN COURS-fix auth]"). /resume pour reprendre.
**MODÈLES**:PLAN+ARCHITECTURE→Opus(/model opus). CODE+IMPLÉMENTATION→Sonnet(/model sonnet)[DEFAULT]. DEBUG→Sonnet. Workflow:/model opus pour task_plan.md puis /model sonnet pour coder.
**ULTRATHINK**:Toute tâche complexe/architecture→ajouter "ultrathink" dans le prompt. Ex:"ultrathink—Conçois l'architecture MIDAS V2"|"ultrathink—Débogue auth loop"|"ultrathink—Plan migration AKASHA agents natifs". Activer /config:thinking=true,outputStyle=explanatory.
**PARALLÉLISATION(WORKTREES)**:Multi-apps:`cd ~/purama/ADYA && claude --dangerously-skip-permissions &` puis `cd ~/purama/VIDA && claude --dangerously-skip-permissions &`. Nommer chaque instance /rename.

## FICHIERS GLOBAUX ~/.claude/
Skills/agents disponibles TOUTES apps sans copie. Structure:
```
~/.claude/
├── settings.json
├── agents/
│   ├── qa-agent.md
│   └── security-agent.md
└── skills/
    ├── supabase-purama/SKILL.md
    ├── vercel-deploy/SKILL.md
    └── design-system/SKILL.md
```
**~/.claude/settings.json optimal Purama**:
```json
{"model":"claude-sonnet-4-6","thinking":{"enabled":true,"budget":10000},"outputStyle":"explanatory","autoCompact":true,"hooks":{"Stop":[{"type":"command","command":"echo 'PURAMA: npm run build OK ?'"}]},"env":{"MAX_THINKING_TOKENS":"10000"}}
```

## WORKFLOW SESSION
**NOUVELLE APP**:1.mkdir+cd ~/purama/SLUG 2.cp ~/purama/CLAUDE.md . 3.cp ~/purama/STRIPE_CONNECT_KARMA_V4.md . 4.mkdir -p .claude/agents .claude/skills .claude/commands .claude/hooks 5.Copier agents/skills depuis ~/.claude/ 6.Créer BRIEF.md 7.claude --dangerously-skip-permissions 8.Premier message:"ultrathink—Lis le BRIEF.md, le CLAUDE.md et le STRIPE_CONNECT_KARMA_V4.md. Génère task_plan.md. NE CODE PAS ENCORE." 9.Valider plan→"ok commence feature 1" 10.Feature par feature JAMAIS tout d'un coup 11.Après chaque feature→/test-full 12.Avant deploy→/deploy(QA+Security auto)
**REPRISE SESSION**:1./resume [NOM] ou cd ~/purama/SLUG && claude 2./clear(si contexte>0%) 3."Continue, lis task_plan.md. Où en sommes-nous?" 4.NE PAS résumer soi-même→laisser Claude lire les fichiers.
**FIN SESSION(OBLIGATOIRE)**:1.npm run build 0 erreur 2./test-full rapport QA 3.git add -A && git commit -m "feat(SLUG):[description]" 4.Mettre à jour task_plan.md(✅) 5./rename [SLUG-STATUS]

## ANTI-DUMB-ZONE
"Dumb zone"=dégradation cognitive Claude Code quand contexte trop plein. **DÉTECTION**:répète ce qu'il vient de faire|dit "je vais" mais ne fait pas|code incomplet "// TODO"|oublie contrainte BRIEF lu 10min avant|build passe mais feature marche pas. **REMÈDES**(dans l'ordre):1./compact 2.Si pas suffisant→/clear+"Continue, lis task_plan.md" 3.Contexte>80%→nouvelle session obligatoire 4.JAMAIS continuer en dumb zone→résultats inutilisables. **SESSION SAINE**:DÉBUT=frais=vitesse max|50%=/compact|70%=warning préparer transition|80%=/clear maintenant.

## INTERDICTIONS #23-#31
23.Continuer à coder>70% contexte sans /compact 24.Déployer sans qa-agent ET security-agent invoqués 25.Nouvelle app sans structure .claude/(agents/skills/commands) 26.Opus pour coder(lent)→Opus=plan SEULEMENT 27.Bundler plusieurs fichiers 1 commit→1 fichier=1 commit message descriptif 28.Oublier "ultrathink" sur architecture complexe 29.Continuer en dumb zone détectée→/compact d'abord 30.Skills inline CLAUDE.md au lieu de vrais fichiers .claude/skills/ 31.Utiliser OriginStamp(retired mai 2025)→OBLIGATOIRE OpenTimestamps | Utiliser Terra API(399$/mois)→OBLIGATOIRE HealthKit+Health Connect natif

## BOOTSTRAP GLOBAL
```bash
#!/bin/bash
# ~/purama/setup-claude-global.sh — Exécuter UNE SEULE FOIS
mkdir -p ~/.claude/agents ~/.claude/skills/supabase-purama ~/.claude/skills/vercel-deploy ~/.claude/skills/design-system ~/.claude/commands
cp ~/purama/.claude/agents/qa-agent.md ~/.claude/agents/
cp ~/purama/.claude/agents/security-agent.md ~/.claude/agents/
cp ~/purama/.claude/skills/supabase-purama/SKILL.md ~/.claude/skills/supabase-purama/
cp ~/purama/.claude/skills/vercel-deploy/SKILL.md ~/.claude/skills/vercel-deploy/
cp ~/purama/.claude/skills/design-system/SKILL.md ~/.claude/skills/design-system/
cat > ~/.claude/settings.json << 'EOF'
{"model":"claude-sonnet-4-6","thinking":{"enabled":true,"budget":10000},"outputStyle":"explanatory","autoCompact":true,"hooks":{"Stop":[{"type":"command","command":"echo 'PURAMA: npm run build OK ?'"}]},"env":{"MAX_THINKING_TOKENS":"10000"}}
EOF
echo "~/.claude/ configuré pour Purama. Agents qa+security disponibles partout."
```
Puis:`chmod +x ~/purama/setup-claude-global.sh && bash ~/purama/setup-claude-global.sh`
