#!/bin/bash
# Stop hook — à chaque fin de turn
cd "$(dirname "$0")/../.."

# Questions à te poser avant d'arrêter :
# 1. Build passe ? → npx tsc --noEmit && npm run build
# 2. Feature BRIEF 100% finie ?
# 3. TODO/placeholders restants ?

PLACEHOLDERS=$(grep -rn 'TODO\|FIXME\|placeholder\|coming soon\|Lorem' src/ --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')
CONSOLE_LOGS=$(grep -rn 'console\.log' src/ --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')

if [ "$PLACEHOLDERS" != "0" ]; then
  echo "⚠️  $PLACEHOLDERS placeholders/TODOs détectés — CONTINUE ne t'arrête pas"
  exit 0
fi

if [ "$CONSOLE_LOGS" -gt "3" ]; then
  echo "⚠️  $CONSOLE_LOGS console.log détectés — nettoie avant arrêt"
  exit 0
fi

echo "✅ Clean"
exit 0
