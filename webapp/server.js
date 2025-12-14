const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Agent configuration
const AI_AGENT_CONFIG = {
    url: process.env.AI_AGENT_URL || 'https://your-agent.ondigitalocean.app',
    apiKey: process.env.AI_AGENT_API_KEY || 'gsC-9RG6LzpfzRVn-w70LyFef_qej_Q7'
};

// AI Agent client
class ServerAIClient {
    constructor(config) {
        this.baseUrl = config.url;
        this.apiKey = config.apiKey;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
                'User-Agent': 'WebApp-Server/1.0',
                ...options.headers
            }
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`AI Agent request failed: ${error.message}`);
        }
    }

    async sendMessage(message, context = {}) {
        return await this.makeRequest('/api/chat', {
            method: 'POST',
            body: { message, context }
        });
    }

    async analyzeData(data, analysisType = 'general') {
        return await this.makeRequest('/api/analyze', {
            method: 'POST',
            body: { data, analysis_type: analysisType }
        });
    }

    async getStatus() {
        return await this.makeRequest('/api/status');
    }
}

const aiClient = new ServerAIClient(AI_AGENT_CONFIG);

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Proxy to AI agent (with rate limiting and validation)
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required and must be a string' });
        }

        const enhancedContext = {
            ...context,
            server_timestamp: new Date().toISOString(),
            client_ip: req.ip,
            user_agent: req.get('User-Agent')
        };

        const result = await aiClient.sendMessage(message, enhancedContext);
        res.json(result);
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ error: 'Failed to process AI request' });
    }
});

// Data analysis endpoint
app.post('/api/ai/analyze', async (req, res) => {
    try {
        const { data, analysisType } = req.body;
        
        if (!data) {
            return res.status(400).json({ error: 'Data is required for analysis' });
        }

        const result = await aiClient.analyzeData(data, analysisType);
        res.json(result);
    } catch (error) {
        console.error('AI analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze data' });
    }
});

// AI agent status
app.get('/api/ai/status', async (req, res) => {
    try {
        const result = await aiClient.getStatus();
        res.json(result);
    } catch (error) {
        console.error('AI status error:', error);
        res.status(500).json({ error: 'Failed to get AI agent status' });
    }
});

// Security analysis endpoints
app.post('/api/security/scan', async (req, res) => {
    try {
        const { target, scanType } = req.body;
        
        // Simulate security scan data
        const scanData = {
            target,
            scanType,
            timestamp: new Date().toISOString(),
            findings: generateMockSecurityData(scanType)
        };

        const analysis = await aiClient.analyzeData(scanData, 'security_scan');
        res.json({ scan: scanData, analysis });
    } catch (error) {
        console.error('Security scan error:', error);
        res.status(500).json({ error: 'Failed to perform security scan' });
    }
});

// Threat detection endpoint
app.post('/api/threat/detect', async (req, res) => {
    try {
        const { logs, timeframe } = req.body;
        
        const threatData = {
            logs,
            timeframe,
            processed_at: new Date().toISOString(),
            threats: generateMockThreatData()
        };

        const detection = await aiClient.analyzeData(threatData, 'threat_detection');
        res.json({ threats: threatData, detection });
    } catch (error) {
        console.error('Threat detection error:', error);
        res.status(500).json({ error: 'Failed to detect threats' });
    }
});

// Vulnerability assessment
app.post('/api/vulnerability/assess', async (req, res) => {
    try {
        const { assets, depth } = req.body;
        
        const vulnData = {
            assets,
            depth,
            scan_time: new Date().toISOString(),
            vulnerabilities: generateMockVulnData()
        };

        const assessment = await aiClient.analyzeData(vulnData, 'vulnerability_assessment');
        res.json({ vulnerabilities: vulnData, assessment });
    } catch (error) {
        console.error('Vulnerability assessment error:', error);
        res.status(500).json({ error: 'Failed to assess vulnerabilities' });
    }
});

// Mock data generators
function generateMockSecurityData(scanType) {
    const findings = {
        network: [
            { type: 'open_port', port: 22, severity: 'medium' },
            { type: 'weak_cipher', protocol: 'TLS', severity: 'low' },
            { type: 'suspicious_traffic', source: '192.168.1.100', severity: 'high' }
        ],
        web: [
            { type: 'xss_vulnerability', url: '/search', severity: 'high' },
            { type: 'sql_injection', parameter: 'id', severity: 'critical' },
            { type: 'insecure_headers', header: 'X-Frame-Options', severity: 'medium' }
        ],
        system: [
            { type: 'outdated_package', package: 'openssl', severity: 'high' },
            { type: 'weak_permissions', file: '/etc/shadow', severity: 'critical' },
            { type: 'running_service', service: 'telnet', severity: 'medium' }
        ]
    };
    
    return findings[scanType] || findings.network;
}

function generateMockThreatData() {
    return [
        {
            type: 'malware',
            name: 'Trojan.Generic.KD',
            confidence: 0.85,
            source: '10.0.0.45',
            timestamp: new Date().toISOString()
        },
        {
            type: 'brute_force',
            target: 'ssh',
            attempts: 127,
            source: '192.168.1.200',
            timestamp: new Date().toISOString()
        }
    ];
}

function generateMockVulnData() {
    return [
        {
            cve: 'CVE-2023-12345',
            severity: 'critical',
            score: 9.8,
            component: 'apache',
            description: 'Remote code execution vulnerability'
        },
        {
            cve: 'CVE-2023-67890',
            severity: 'high',
            score: 7.5,
            component: 'mysql',
            description: 'SQL injection vulnerability'
        }
    ];
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`AI Agent URL: ${AI_AGENT_CONFIG.url}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});