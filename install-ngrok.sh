#!/bin/bash
# Script to uninstall old ngrok and install new ngrok from official repository

echo "Uninstalling old ngrok installation..."
sudo apt remove --purge ngrok -y 2>/dev/null || sudo snap remove ngrok 2>/dev/null || true

echo "Adding ngrok repository..."
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com bookworm main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list

echo "Updating package list..."
sudo apt update

echo "Installing ngrok..."
sudo apt install ngrok -y

echo "Configuring ngrok auth token..."
ngrok config add-authtoken 37qoRX1vcgPm1FnnQvK1c1PueUw_7eVHkbDPDCyMRD3Wypd9U

echo "Starting ngrok on port 3000 in background..."
ngrok http 3000 &
echo "ngrok is running in the background. Use 'jobs' to see it or 'pkill ngrok' to stop it."

