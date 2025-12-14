import os
import random
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional, List
import json

class ProxyRotatingAIAgent:
    def __init__(self, base_url: str, api_key: Optional[str] = None, proxies: List[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key or os.getenv('AI_AGENT_API_KEY')
        self.proxies = proxies or []
        self.current_proxy_index = 0
        
        # Setup retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        self.session = requests.Session()
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        if self.api_key:
            self.session.headers.update({
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            })
    
    def get_next_proxy(self) -> Optional[Dict[str, str]]:
        """Get next proxy in rotation"""
        if not self.proxies:
            return None
        
        proxy = self.proxies[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        
        return {
            'http': proxy,
            'https': proxy
        }
    
    def make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make request with proxy rotation and error handling"""
        max_attempts = len(self.proxies) + 1 if self.proxies else 1
        
        for attempt in range(max_attempts):
            try:
                # Use proxy if available
                proxy_config = self.get_next_proxy()
                if proxy_config:
                    kwargs['proxies'] = proxy_config
                    print(f"Using proxy: {proxy_config['https']}")
                
                response = self.session.request(method, url, **kwargs)
                response.raise_for_status()
                return response
                
            except requests.exceptions.ProxyError:
                print(f"Proxy failed, trying next...")
                continue
            except requests.exceptions.RequestException as e:
                if attempt == max_attempts - 1:
                    raise e
                print(f"Request failed, retrying... ({e})")
                time.sleep(random.uniform(1, 3))
        
        raise requests.exceptions.RequestException("All proxy attempts failed")
    
    def send_message(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send message to AI agent with proxy rotation"""
        payload = {
            'message': message,
            'context': context or {},
            'timestamp': int(time.time())
        }
        
        try:
            response = self.make_request(
                'POST',
                f'{self.base_url}/api/chat',
                json=payload,
                timeout=30
            )
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': f'Request failed: {str(e)}'}
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Check agent status with proxy rotation"""
        try:
            response = self.make_request('GET', f'{self.base_url}/api/status', timeout=15)
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': f'Status check failed: {str(e)}'}
    
    def stream_chat(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Stream chat responses"""
        payload = {
            'message': message,
            'context': context or {},
            'stream': True
        }
        
        try:
            response = self.make_request(
                'POST',
                f'{self.base_url}/api/stream',
                json=payload,
                timeout=60,
                stream=True
            )
            
            # Handle streaming response
            result = {'chunks': []}
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line.decode('utf-8'))
                        result['chunks'].append(chunk)
                        yield chunk
                    except json.JSONDecodeError:
                        continue
                        
        except requests.exceptions.RequestException as e:
            yield {'error': f'Stream failed: {str(e)}'}

def load_proxy_list() -> List[str]:
    """Load proxy list from file or environment"""
    proxy_file = os.getenv('PROXY_FILE', 'proxies.txt')
    proxies = []
    
    if os.path.exists(proxy_file):
        with open(proxy_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    proxies.append(line)
    
    # Also check environment variable
    env_proxies = os.getenv('HTTP_PROXIES', '')
    if env_proxies:
        proxies.extend(env_proxies.split(','))
    
    return [p.strip() for p in proxies if p.strip()]

def main():
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    webapp_url = os.getenv('WEBAPP_URL', 'https://your-app-domain.ondigitalocean.app')
    
    # Load proxies (optional)
    proxy_list = load_proxy_list()
    if proxy_list:
        print(f"Loaded {len(proxy_list)} proxies")
    
    # Initialize AI agent with proxy rotation
    agent = ProxyRotatingAIAgent(webapp_url, proxies=proxy_list)
    
    # Test connection
    print("Testing AI agent connection...")
    status = agent.get_agent_status()
    print(f"Status: {json.dumps(status, indent=2)}")
    
    # Send test message
    print("\nSending message to AI agent...")
    response = agent.send_message(
        "Analyze the security posture of a web application",
        context={
            "user_id": "security_analyst",
            "task_type": "security_analysis"
        }
    )
    print(f"Response: {json.dumps(response, indent=2)}")
    
    # Test streaming (if supported)
    print("\nTesting streaming response...")
    for chunk in agent.stream_chat("Generate a threat detection report"):
        if 'error' in chunk:
            print(f"Stream error: {chunk['error']}")
            break
        print(f"Chunk: {chunk}")

if __name__ == "__main__":
    main()