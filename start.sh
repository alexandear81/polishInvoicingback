#!/bin/bash
echo "=== Starting app ==="
echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la
echo "Listing dist directory:"
ls -la dist/
echo "Starting Node.js app..."
node dist/index.js
