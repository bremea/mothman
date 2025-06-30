#!/bin/bash

URL="$1"
TARGET="./content/$2"
BUILD_ID="$3"
ACCOUNT_NAME="$4"

# Check if all required arguments are provided
if [[ -z "$URL" || -z "$DEST_DIR" || -z "$BUILD_ID" || -z "$ACCOUNT_NAME" ]]; then
    echo "Usage: $0 <download_url> <destination_directory> <build_id> <account_name>"
    exit 1
fi

# Create a temporary file for the zip
TMP_ZIP=$(mktemp "./content/XXXXXX")

# Download zip
wget -O "$TMP_ZIP" "$URL"
if [[ $? -ne 0 ]]; then
    echo "Download failed"
    rm -f "$TMP_ZIP"
    exit 1
fi

# Make sure the destination directory exists
mkdir -p "$TARGET"

# Unzip the file to the destination directory
unzip -q "$TMP_ZIP" -d "$TARGET"
if [[ $? -ne 0 ]]; then
    echo "Unzip failed"
    rm -f "$TMP_ZIP"
    exit 2
fi

# Replace "buildidreplacekey" with the value of $BUILD_ID in scripts/app_build.vdf
VDF_FILE="./scripts/app_build.vdf"
if [[ -f "$VDF_FILE" ]]; then
    sed -i "s/buildidreplacekey/$BUILD_ID/g" "$VDF_FILE"
else
    echo "$VDF_FILE not found"
    exit 3
fi

# Run steamcmd and capture its output
STEAMCMD="./builder_linux/steamcmd.sh"
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


# Cleanup
rm -f "$TMP_ZIP"

echo "Build uploaded"
exit 0