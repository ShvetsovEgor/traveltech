#!/usr/bin/env bash
# Тест полного цикла API с реальной генерацией (Нейрохудожник).
# Использование: ./scripts/test_generation.sh /path/to/sketch.jpg
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
IMAGE="${1:?Укажите путь к изображению: ./scripts/test_generation.sh sketch.jpg}"

echo "=== 1. Login ==="
LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","kiosk_id":"Popova"}')
KIOSK_TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['kiosk_token'])")
echo "kiosk_token: ${KIOSK_TOKEN:0:20}..."

echo "=== 2. Start interaction (neuro_artist) ==="
START=$(curl -s -X POST "$BASE_URL/api/interaction/start" \
  -H "Content-Type: application/json" \
  -d "{\"kiosk_token\":\"$KIOSK_TOKEN\",\"app_type\":\"neuro_artist\"}")
INTERACTION=$(echo "$START" | python3 -c "import sys,json; print(json.load(sys.stdin)['interaction_token'])")
echo "interaction_token: ${INTERACTION:0:20}..."

echo "=== 3. Heartbeat ==="
curl -s -X POST "$BASE_URL/api/interaction/heartbeat" \
  -H "Content-Type: application/json" \
  -d "{\"interaction_token\":\"$INTERACTION\"}" > /dev/null

echo "=== 4. Generate (может занять 1–3 мин) ==="
GEN=$(curl -s -X POST "$BASE_URL/api/artist/generate" \
  -F "sketch=@$IMAGE" \
  -F "style_id=vangogh" \
  -F "interaction_token=$INTERACTION")
TASK_ID=$(echo "$GEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['task_id'])")
echo "task_id: $TASK_ID"

echo "=== 5. Poll status ==="
for i in $(seq 1 60); do
  curl -s -X POST "$BASE_URL/api/interaction/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"interaction_token\":\"$INTERACTION\"}" > /dev/null
  STATUS=$(curl -s "$BASE_URL/api/tasks/$TASK_ID/status")
  STATE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "[$i] status=$STATE"
  if [ "$STATE" = "completed" ]; then
    echo "$STATUS" | python3 -m json.tool
    URL=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result_url',''))")
    echo "Откройте результат: $URL"
    exit 0
  fi
  if [ "$STATE" = "failed" ] || [ "$STATE" = "cancelled" ]; then
    echo "$STATUS" | python3 -m json.tool
    exit 1
  fi
  sleep 10
done
echo "Timeout waiting for task"
exit 1
