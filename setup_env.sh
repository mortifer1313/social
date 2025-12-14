#!/bin/bash

# AI Agent Integration Environment Setup
echo "Setting up AI Agent environment variables..."

# Create .env file if it doesn't exist
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
    echo "Created $ENV_FILE file"
fi

# Add API key to .env (replace with your actual key)
echo "# AI Agent Configuration" >> "$ENV_FILE"
echo "AI_AGENT_API_KEY=gsC-9RG6LzpfzRVn-w70LyFef_qej_Q7" >> "$ENV_FILE"
echo "WEBAPP_URL=https://your-app-domain.ondigitalocean.app" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

# Set permissions
chmod 600 "$ENV_FILE"

# Add to gitignore
if [ ! -f ".gitignore" ]; then
    touch .gitignore
fi

if ! grep -q ".env" .gitignore; then
    echo ".env" >> .gitignore
    echo "Added .env to .gitignore"
fi

echo "Environment setup complete!"
echo "To load variables: source .env"
echo "Or use: export \$(cat .env | xargs)"