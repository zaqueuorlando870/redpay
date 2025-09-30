#!/bin/bash

# Setup script for Python Selenium automation
echo "🐍 Setting up Python environment for bank automation..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip for Python 3."
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
    echo "⚠️  Chrome/Chromium not found. Please install Google Chrome or Chromium browser."
    echo "   Ubuntu/Debian: sudo apt-get install google-chrome-stable"
    echo "   CentOS/RHEL: sudo yum install google-chrome-stable"
    echo "   macOS: brew install --cask google-chrome"
fi

# Make Python script executable
chmod +x automation/bank_scraper.py

echo "✅ Python environment setup complete!"
echo "🚀 You can now run the bank automation demo."