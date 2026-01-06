#!/bin/bash
# Start Cloudflare Tunnel and capture the URL

echo "Starting Cloudflare Tunnel for port 3000..."
cloudflared tunnel --url http://localhost:3000 2>&1 | tee /tmp/cloudflared-url.log &
CLOUDFLARED_PID=$!

# Wait a few seconds for the URL to be generated
sleep 5

# Extract the URL from the log
TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.(trycloudflare\.com|cfargotunnel\.com)' /tmp/cloudflared-url.log | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "=========================================="
    echo "Cloudflare Tunnel is running!"
    echo "Tunnel URL: $TUNNEL_URL"
    echo "=========================================="
    echo ""
    echo "Tunnel is forwarding to: http://localhost:3000"
    echo "Process ID: $CLOUDFLARED_PID"
    echo ""
    echo "To stop the tunnel, run: kill $CLOUDFLARED_PID"
    echo "Or: pkill cloudflared"
    echo ""
else
    echo "Tunnel started but URL not found yet. Check /tmp/cloudflared-url.log"
fi

# Keep the script running
wait $CLOUDFLARED_PID


