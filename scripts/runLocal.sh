#!/usr/bin/env bash

# Stop immediately on error
set -e

if [[ -z "$1" ]]; then
  $(./scripts/assumeDeveloperRole.sh)
fi

# Only install production modules
export NODE_ENV=production

# Build the project
SAM_TEMPLATE=template.yaml
sam build --template ${SAM_TEMPLATE}

# Start the API locally
export CORS_DOMAIN='http://choosee.bowland.link'
export DYNAMODB_DECISION_TABLE_NAME=choosee-session-api-decisions-test
export DYNAMODB_SESSION_TABLE_NAME=choosee-session-api-sessions-test
export ID_MIN_LENGTH=3
export ID_MAX_LENGTH=4
export MAPS_API_KEY=$(aws apigateway get-api-key --api-key 7lzyy1kkbj --include-value --region us-east-2 | jq -r .value)
export MAPS_API_URL='https://choosee-maps-api-internal.bowland.link/v1'
export RECAPTCHA_SECRET_KEY=$(aws ssm get-parameter --name recaptcha-secret-key | jq -r .Parameter.Value)
export SMS_API_KEY=$(aws apigateway get-api-key --api-key l3q9ffyih6 --include-value --region us-east-1 | jq -r .value)
export SMS_API_URL='https://sms-queue-api.bowland.link/v1'
export USER_POOL_ID=us-east-2_xqxzyIOz4
sam local start-api --region=us-east-2 --force-image-build --parameter-overrides "Environment=test MapsApiKey=$MAPS_API_KEY RecaptchaSecretKey=$RECAPTCHA_SECRET_KEY SmsApiKey=$SMS_API_KEY" --log-file local.log
