#!/usr/bin/env python3
import os
import json
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, Any, Optional

class SimpleAIAgent:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        
        # Common headers
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'AI-Agent-Client/1.0'
        }
    
    def _make_request(self, url: str, data: Optional[Dict] = None, method: str = 'GET') -> Dict[str, Any]:
        """Make HTTP request using urllib"""
        try:
            # Prepare request
            if data:
                json_data = json.dumps(data).encode('utf-8')
                req = urllib.request.Request(url, data=json_data, headers=self.headers, method=method)
            else:
                req = urllib.request.Request(url, headers=self.headers, method=method)
            
            # Make request
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = response.read().decode('utf-8')
                return json.loads(response_data)
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.read else str(e)
            return {'error': f'HTTP {e.code}: {error_body}'}
        except urllib.error.URLError as e:
            return {'error': f'URL Error: {str(e)}'}
        except json.JSONDecodeError as e:
            return {'error': f'JSON Error: {str(e)}'}
        except Exception as e:
            return {'error': f'Request failed: {str(e)}'}
    
    def send_message(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send message to AI agent"""
        url = f'{self.base_url}/api/chat'
        payload = {
            'message': message,
            'context': context or {}
        }
        
        return self._make_request(url, payload, 'POST')
    
    def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        url = f'{self.base_url}/api/status'
        return self._make_request(url)
    
    def configure(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Configure agent settings"""
        url = f'{self.base_url}/api/config'
        return self._make_request(url, config, 'POST')

def main():
    # Configuration from environment
    api_key = os.getenv('AI_AGENT_API_KEY', 'gsC-9RG6LzpfzRVn-w70LyFef_qej_Q7')
    webapp_url = os.getenv('WEBAPP_URL', 'https://your-app-domain.ondigitalocean.app')
    
    if not api_key:
        print("Error: AI_AGENT_API_KEY not set")
        return
    
    # Initialize client
    agent = SimpleAIAgent(webapp_url, api_key)
    
    print(f"Connecting to: {webapp_url}")
    print(f"Using API key: {api_key[:10]}...")
    
    # Test status
    print("\n1. Testing connection...")
    status = agent.get_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    # Test message
    print("\n2. Sending test message...")
    response = agent.send_message(
        "Hello, can you help me with security analysis?",
        context={
            "user_id": "test_user",
            "session": "integration_test"
        }
    )
    print(f"Response: {json.dumps(response, indent=2)}")
    
    # Test configuration
    print("\n3. Testing configuration...")
    config = agent.configure({
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 1000
    })
    print(f"Config: {json.dumps(config, indent=2)}")

if __name__ == "__main__":
    main()