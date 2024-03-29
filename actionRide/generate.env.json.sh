#!/bin/ash

cat > env.json << EOF
{
  "HASURA_ENDPOINT": "$HASURA_ENDPOINT",
  "HASURA_ADMIN_SECRET": "$HASURA_ADMIN_SECRET",
  "FIREBASE_CREDENTIAL_FILE": "$FIREBASE_CREDENTIAL_FILE",
  "SQS_SEND_MAIL": "$SQS_SEND_MAIL",
  "SQS_SEND_SMS": "$SQS_SEND_SMS",
  "SQS_SEND_PUSH": "$SQS_SEND_PUSH",
  "FROM_EMAIL": "$FROM_EMAIL"
}
EOF
