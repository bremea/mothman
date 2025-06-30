#!/bin/bash

ACCOUNT_NAME="$1"

# Check if all required arguments are provided
if [[ -z "$ACCOUNT_NAME" ]]; then
    echo "Usage: $0 <account_name>"
    exit 1
fi

# Run steamcmd and capture its output
STEAMCMD="./builder_linux/steamcmd.sh"
VDF_FILE="app_build.vdf"
if [[ -x "$STEAMCMD" ]]; then
    TMP_LOG=$(mktemp)
    "$STEAMCMD" +login "$ACCOUNT_NAME" +run_app_build "$VDF_FILE" +quit &> "$TMP_LOG"
    EXIT_CODE=$?
    echo "--- steamcmd output ---"
    cat "$TMP_LOG"
    echo "--------------------------"
    rm -f "$TMP_LOG"
    
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo "Steam upload failed with exit code $EXIT_CODE"
        exit 4
    fi
else
    echo "Error: $STEAMCMD not found or not executable"
    exit 4
fi

echo "Build uploaded"
exit 0