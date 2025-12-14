class AIAgentClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.agentUrl = config.agentUrl || '';
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 3;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.agentUrl}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('AI Agent request failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sendMessage(message, context = {}) {
        return await this.makeRequest('/api/chat', {
            method: 'POST',
            body: {
                message,
                context: {
                    ...context,
                    timestamp: Date.now(),
                    user_agent: navigator.userAgent,
                    page_url: window.location.href
                }
            }
        });
    }

    async getStatus() {
        return await this.makeRequest('/api/status');
    }

    async analyzeData(data, analysisType = 'general') {
        return await this.makeRequest('/api/analyze', {
            method: 'POST',
            body: {
                data,
                analysis_type: analysisType,
                context: {
                    timestamp: Date.now(),
                    source: 'webapp'
                }
            }
        });
    }

    async streamChat(message, onChunk, context = {}) {
        const url = `${this.agentUrl}/api/stream`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    message,
                    context: {
                        ...context,
                        timestamp: Date.now(),
                        stream: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            onChunk(data);
                        } catch (e) {
                            console.warn('Failed to parse chunk:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream failed:', error);
            onChunk({ error: error.message });
        }
    }
}

// Chat UI Component
class AIChatInterface {
    constructor(containerId, aiClient) {
        this.container = document.getElementById(containerId);
        this.aiClient = aiClient;
        this.messages = [];
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="ai-chat-container">
                <div class="ai-chat-header">
                    <h3>AI Assistant</h3>
                    <div class="ai-status" id="ai-status">Connecting...</div>
                </div>
                <div class="ai-chat-messages" id="ai-messages"></div>
                <div class="ai-chat-input">
                    <input type="text" id="ai-input" placeholder="Ask me anything..." />
                    <button id="ai-send">Send</button>
                </div>
            </div>
        `;

        this.messagesContainer = document.getElementById('ai-messages');
        this.statusEl = document.getElementById('ai-status');
        this.inputEl = document.getElementById('ai-input');
        this.sendBtn = document.getElementById('ai-send');

        this.setupEventListeners();
        this.checkStatus();
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async checkStatus() {
        const result = await this.aiClient.getStatus();
        if (result.success) {
            this.statusEl.textContent = 'Online';
            this.statusEl.className = 'ai-status online';
        } else {
            this.statusEl.textContent = 'Offline';
            this.statusEl.className = 'ai-status offline';
        }
    }

    async sendMessage() {
        const message = this.inputEl.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        this.inputEl.value = '';
        this.sendBtn.disabled = true;

        // Show typing indicator
        const typingId = this.addMessage('ai', '...');

        const result = await this.aiClient.sendMessage(message, {
            conversation_id: this.getConversationId()
        });

        this.removeMessage(typingId);

        if (result.success) {
            this.addMessage('ai', result.data.response || result.data.message);
        } else {
            this.addMessage('ai', `Error: ${result.error}`);
        }

        this.sendBtn.disabled = false;
    }

    addMessage(type, content) {
        const messageId = Date.now() + Math.random();
        const messageEl = document.createElement('div');
        messageEl.className = `ai-message ai-message-${type}`;
        messageEl.id = `msg-${messageId}`;
        messageEl.innerHTML = `
            <div class="ai-message-content">${this.formatMessage(content)}</div>
            <div class="ai-message-time">${new Date().toLocaleTimeString()}</div>
        `;

        this.messagesContainer.appendChild(messageEl);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        return messageId;
    }

    removeMessage(messageId) {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) el.remove();
    }

    formatMessage(content) {
        return content.replace(/\n/g, '<br>');
    }

    getConversationId() {
        let convId = sessionStorage.getItem('ai-conversation-id');
        if (!convId) {
            convId = 'conv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('ai-conversation-id', convId);
        }
        return convId;
    }
}

// CSS Styles
const aiStyles = `
    .ai-chat-container {
        border: 1px solid #ddd;
        border-radius: 8px;
        width: 100%;
        max-width: 600px;
        height: 500px;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .ai-chat-header {
        padding: 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .ai-chat-header h3 {
        margin: 0;
        color: #333;
    }

    .ai-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }

    .ai-status.online {
        background: #d4edda;
        color: #155724;
    }

    .ai-status.offline {
        background: #f8d7da;
        color: #721c24;
    }

    .ai-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .ai-message {
        max-width: 80%;
    }

    .ai-message-user {
        align-self: flex-end;
    }

    .ai-message-ai {
        align-self: flex-start;
    }

    .ai-message-content {
        padding: 12px 16px;
        border-radius: 18px;
        line-height: 1.4;
    }

    .ai-message-user .ai-message-content {
        background: #007bff;
        color: white;
    }

    .ai-message-ai .ai-message-content {
        background: #f1f3f4;
        color: #333;
    }

    .ai-message-time {
        font-size: 11px;
        color: #666;
        text-align: center;
        margin-top: 4px;
    }

    .ai-chat-input {
        padding: 16px;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 8px;
    }

    .ai-chat-input input {
        flex: 1;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        outline: none;
    }

    .ai-chat-input button {
        padding: 12px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }

    .ai-chat-input button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
`;

// Inject styles
if (!document.getElementById('ai-chat-styles')) {
    const style = document.createElement('style');
    style.id = 'ai-chat-styles';
    style.textContent = aiStyles;
    document.head.appendChild(style);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIAgentClient, AIChatInterface };
}