#!/bin/ash

cat > env.json << EOF
{
  "HASURA_ENDPOINT": "$HASURA_ENDPOINT",
  "HASURA_ADMIN_SECRET": "$HASURA_ADMIN_SECRET"
}
EOF
