#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
STACK_NAME="${STACK_NAME:-vcmi-core-dev}"
PROJECT_SLUG="${PROJECT_SLUG:-vcmi}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TEMPLATE_FILE="${TEMPLATE_FILE:-vcmi-core.yaml}"

aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    ProjectSlug="$PROJECT_SLUG" \
    Environment="$ENVIRONMENT"

aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table
