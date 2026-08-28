#!/bin/sh
set -eu
exec node /opt/sentryhulud/capture-agent.cjs "$@"
