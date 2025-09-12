#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="aiser-cube-enterprise:local"

echo "Building enterprise Cube image: $IMAGE_NAME"
# Use repo root as build context so COPY ./packages/... works from the Dockerfile
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/packages/chat2chart/cube/Dockerfile.enterprise" "$ROOT_DIR"

echo "Built $IMAGE_NAME"


