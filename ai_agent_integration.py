import os
import requests
import json
from typing import Dict, Any, Optional

class AIAgentClient:
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key or os.getenv('AI_AGENT_API_KEY')
        self.session = requests.Session()
        
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            })
    
    def send_message(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a message to the AI agent and get response"""
        payload = {
            'message': message,
            'context': context or {}
        }
        
        try:
            response = self.session.post(
                f'{self.base_url}/api/chat',
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': f'Request failed: {str(e)}'}
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Check agent status"""
        try:
            response = self.session.get(f'{self.base_url}/api/status')
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': f'Status check failed: {str(e)}'}
    
    def configure_agent(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Configure agent settings"""
        try:
            response = self.session.post(
                f'{self.base_url}/api/config',
                json=config,
                timeout=15
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': f'Configuration failed: {str(e)}'}

def main():
    # Initialize client - replace with your DigitalOcean app URL
    webapp_url = "https://your-app-domain.ondigitalocean.app"
    
    # Initialize AI agent client
    agent = AIAgentClient(webapp_url)
    
    # Test connection
    print("Testing AI agent connection...")
    status = agent.get_agent_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    # Send test message
    print("\nSending test message...")
    response = agent.send_message(
        "Hello, can you help me analyze some data?",
        context={
            "user_id": "test_user",
            "session_id": "test_session"
        }
    )
    print(f"Response: {json.dumps(response, indent=2)}")
    
    # Configure agent (example)
    print("\nConfiguring agent...")
    config_response = agent.configure_agent({
        "max_tokens": 1000,
        "temperature": 0.7,
        "model": "gpt-4"
    })
    print(f"Config Response: {json.dumps(config_response, indent=2)}")

if __name__ == "__main__":
    main()