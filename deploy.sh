#!/bin/bash

# Automated Social Engagement - Digital Ocean Deployment Script
# Run this script on your Digital Ocean droplet

set -e

echo "🚀 Starting Digital Ocean Deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🔧 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/automated-social-engagement
sudo chown $USER:$USER /opt/automated-social-engagement
cd /opt/automated-social-engagement

# Clone repository (you'll need to replace this with your actual repo)
echo "📥 Downloading application..."
if [ -d ".git" ]; then
    echo "🔄 Updating existing repository..."
    git pull origin main
else
    echo "📋 Cloning repository..."
    git clone https://github.com/mortifer1313/social.git .
fi

# Set up environment variables
echo "⚙️ Setting up environment variables..."
cat > .env.production << EOF
# Production Environment Configuration
DATABASE_URL=postgresql://postgres:SecurePass123!@localhost:5432/social_media_grower
SESSION_SECRET=$(openssl rand -hex 32)
REPL_ID=80d49ad1-dd5b-4aac-ab8f-9526cffd4904
NODE_ENV=production

# Optional - Add your API keys here
# OPENAI_API_KEY=sk-your-openai-api-key
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com  
# SMTP_PASS=your-app-password
# NOTIFICATION_EMAIL=notifications@yourdomain.com
EOF

# Update Docker Compose for production
echo "🔧 Configuring Docker Compose for production..."
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:5000"
      - "443:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
      - REPL_ID=${REPL_ID}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - SMTP_HOST=${SMTP_HOST:-}
      - SMTP_PORT=${SMTP_PORT:-}
      - SMTP_USER=${SMTP_USER:-}
      - SMTP_PASS=${SMTP_PASS:-}
      - NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-}
    depends_on:
      - db
    volumes:
      - ./recordings:/app/recordings
      - ./attached_assets:/app/attached_assets
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:5000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=SecurePass123!
      - POSTGRES_DB=social_media_grower
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres-init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
    driver: local
EOF

# Set up firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5432
sudo ufw --force enable

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose -f docker-compose.production.yml --env-file .env.production down || true
docker-compose -f docker-compose.production.yml --env-file .env.production build
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check health
echo "🏥 Checking application health..."
if curl -f http://localhost/api/health; then
    echo "✅ Application is healthy and running!"
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 Your application is now live!"
    echo "📱 Access your app at: http://$(curl -s ifconfig.me)"
    echo "🔗 Health check: http://$(curl -s ifconfig.me)/api/health"
    echo "🗄️ Database: PostgreSQL running on port 5432"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Management Commands:"
    echo "   View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "   Restart:   docker-compose -f docker-compose.production.yml restart"
    echo "   Stop:      docker-compose -f docker-compose.production.yml down"
    echo ""
else
    echo "❌ Health check failed. Checking logs..."
    docker-compose -f docker-compose.production.yml logs app
    exit 1
fi