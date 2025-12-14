# AI Agent Web App Integration

This web application integrates with your AI agent hosted on DigitalOcean for advanced security analysis and threat detection.

## Features

- **Live AI Chat Interface** - Real-time communication with your AI agent
- **Security Data Analysis** - Analyze network logs, vulnerabilities, and threats
- **Interactive Dashboard** - Visual interface for security monitoring
- **Server-side Integration** - Secure proxy to AI agent with rate limiting
- **Mobile Responsive** - Works on desktop and mobile devices

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   cd webapp
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your AI agent URL and API key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Open http://localhost:3000
   - Update AI agent configuration in the UI
   - Test the chat interface and data analysis features

### DigitalOcean Deployment

#### Option 1: App Platform (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial AI agent webapp"
   git push origin main
   ```

2. **Create App on DigitalOcean**
   - Go to DigitalOcean App Platform
   - Click "Create App"
   - Connect your GitHub repository
   - Select the webapp directory as source
   - Use the provided `.do/app.yaml` configuration

3. **Set Environment Variables**
   ```
   AI_AGENT_URL=https://your-ai-agent.ondigitalocean.app
   AI_AGENT_API_KEY=gsC-9RG6LzpfzRVn-w70LyFef_qej_Q7
   NODE_ENV=production
   ```

4. **Deploy**
   - Review configuration
   - Click "Create Resources"
   - Wait for deployment to complete

#### Option 2: Droplet Deployment

1. **Create Droplet**
   ```bash
   # On your droplet
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo apt-get install -y nginx
   ```

2. **Clone and Setup**
   ```bash
   git clone your-repo.git
   cd your-repo/webapp
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run with PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "ai-webapp"
   pm2 startup
   pm2 save
   ```

4. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_AGENT_URL` | URL of your AI agent on DigitalOcean | Yes |
| `AI_AGENT_API_KEY` | API key for authentication | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `CORS_ORIGIN` | Allowed CORS origins | No |

### AI Agent Integration

The webapp communicates with your AI agent through these endpoints:

- `GET /api/status` - Check agent status
- `POST /api/chat` - Send messages to agent
- `POST /api/analyze` - Analyze security data
- `POST /api/stream` - Stream chat responses

### Security Features

- **API Key Authentication** - All requests include Bearer token
- **CORS Protection** - Configurable origin restrictions  
- **Rate Limiting** - Prevent abuse and DDoS
- **Input Validation** - Sanitize all user inputs
- **Error Handling** - Secure error responses

## API Endpoints

### Frontend Endpoints
- `GET /` - Main application interface
- `GET /health` - Health check endpoint

### AI Proxy Endpoints
- `POST /api/ai/chat` - Chat with AI agent
- `POST /api/ai/analyze` - Analyze data
- `GET /api/ai/status` - AI agent status

### Security Analysis Endpoints
- `POST /api/security/scan` - Security scanning
- `POST /api/threat/detect` - Threat detection
- `POST /api/vulnerability/assess` - Vulnerability assessment

## Usage Examples

### JavaScript Integration

```javascript
// Initialize AI client
const aiClient = new AIAgentClient({
    agentUrl: 'https://your-agent.ondigitalocean.app',
    apiKey: 'your-api-key'
});

// Send message
const response = await aiClient.sendMessage('Analyze this network traffic', {
    user_id: 'analyst-1',
    session: 'scan-session'
});

// Analyze data
const analysis = await aiClient.analyzeData({
    connections: 1247,
    suspicious_ips: ['192.168.1.100'],
    blocked_attempts: 23
}, 'network');
```

### Server-side Integration

```javascript
// Direct server integration
const result = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: 'Generate threat report',
        context: { timeframe: '24h' }
    })
});
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify AI agent URL is correct
   - Check API key is valid
   - Ensure AI agent is running

2. **CORS Errors**
   - Update CORS_ORIGIN environment variable
   - Check domain configuration

3. **Rate Limiting**
   - Reduce request frequency
   - Implement client-side throttling

### Debugging

```bash
# Check logs
pm2 logs ai-webapp

# Monitor performance  
pm2 monit

# Restart application
pm2 restart ai-webapp
```

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Use HTTPS** in production
3. **Implement rate limiting** on all endpoints
4. **Validate all inputs** before processing
5. **Use environment variables** for configuration
6. **Keep dependencies updated** regularly

## Support

For issues with:
- **Web application**: Check the logs and configuration
- **AI agent integration**: Verify agent endpoints and authentication
- **DigitalOcean deployment**: Check App Platform logs and environment variables

## License

ISC License - See LICENSE file for details