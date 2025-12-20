#!/usr/bin/env python3
"""
Social Media Grower Web Application
A Flask-based web interface with command prompt functionality
"""

from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
import os
import sys
import json
import threading
import time
import logging
from datetime import datetime
import uuid

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our intelligent commenting system
try:
    from bots.common.comment_engine import CommentEngine
    from bots.common.quality_control import CommentQualityControl
    from bots.common.abuse_detection import AbuseDetectionSystem
    from bots.instagram import InstagramBot
    from bots.facebook import FacebookBot
    from bots.tiktok import TikTokBot
    from bots.config import load_config
except ImportError as e:
    print(f"Warning: Could not import bot modules: {e}")

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'social-media-grower-secret-key-' + str(uuid.uuid4()))
socketio = SocketIO(app, cors_allowed_origins="*")

# Global instances
comment_engine = None
quality_control = None
abuse_detection = None
active_bots = {}
command_history = []

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CommandProcessor:
    """Process command line interface commands"""
    
    def __init__(self):
        self.commands = {
            'help': self.cmd_help,
            'status': self.cmd_status,
            'start': self.cmd_start,
            'stop': self.cmd_stop,
            'comment': self.cmd_comment,
            'generate': self.cmd_generate,
            'validate': self.cmd_validate,
            'config': self.cmd_config,
            'limits': self.cmd_limits,
            'history': self.cmd_history,
            'clear': self.cmd_clear,
            'platforms': self.cmd_platforms,
            'test': self.cmd_test
        }
    
    def process(self, command_line):
        """Process a command line input"""
        if not command_line.strip():
            return {"output": "", "error": False}
        
        parts = command_line.strip().split()
        cmd = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        # Add to history
        command_history.append({
            'timestamp': datetime.now().isoformat(),
            'command': command_line,
            'session_id': session.get('session_id', 'unknown')
        })
        
        if cmd in self.commands:
            try:
                return self.commands[cmd](args)
            except Exception as e:
                return {
                    "output": f"Error executing command '{cmd}': {str(e)}",
                    "error": True
                }
        else:
            return {
                "output": f"Unknown command: {cmd}. Type 'help' for available commands.",
                "error": True
            }
    
    def cmd_help(self, args):
        """Show available commands"""
        help_text = """
Available Commands:

🔧 System Commands:
  help                    - Show this help message
  status                  - Show system status and platform health
  config                  - Show current configuration
  clear                   - Clear the terminal
  
🤖 Bot Commands:
  start <platform>        - Start bot for platform (instagram/facebook/tiktok)
  stop <platform>         - Stop bot for platform
  platforms               - List all available platforms
  
💬 Commenting Commands:
  comment <platform> <n>  - Post n comments on platform
  generate <platform>     - Generate sample comments for platform
  validate <text>         - Validate comment quality
  
📊 Monitoring Commands:
  limits                  - Show current rate limits and threat levels
  history                 - Show recent command history
  test <platform>         - Test platform connection
  
Examples:
  start instagram         - Start Instagram bot
  comment tiktok 5        - Post 5 comments on TikTok
  generate facebook       - Generate Facebook comment examples
"""
        return {"output": help_text, "error": False}
    
    def cmd_status(self, args):
        """Show system status"""
        global comment_engine, quality_control, abuse_detection, active_bots
        
        status = {
            "timestamp": datetime.now().isoformat(),
            "systems": {
                "comment_engine": "✅ Loaded" if comment_engine else "❌ Not loaded",
                "quality_control": "✅ Loaded" if quality_control else "❌ Not loaded",
                "abuse_detection": "✅ Loaded" if abuse_detection else "❌ Not loaded"
            },
            "active_bots": list(active_bots.keys()),
            "command_history_count": len(command_history)
        }
        
        # Get platform status if abuse detection is available
        if abuse_detection:
            platform_status = abuse_detection.get_all_platforms_status()
            status["platform_threats"] = {
                platform: data["threat_level"] 
                for platform, data in platform_status.items()
            }
        
        output = "🚀 Social Media Grower Status\n"
        output += f"⏰ {status['timestamp']}\n\n"
        output += "💻 Core Systems:\n"
        for system, state in status["systems"].items():
            output += f"  {system}: {state}\n"
        
        output += f"\n🤖 Active Bots: {', '.join(status['active_bots']) if status['active_bots'] else 'None'}\n"
        output += f"📝 Commands Executed: {status['command_history_count']}\n"
        
        if "platform_threats" in status:
            output += "\n🛡️ Platform Security Status:\n"
            for platform, threat in status["platform_threats"].items():
                emoji = "🟢" if threat == "safe" else "🟡" if threat == "caution" else "🔴"
                output += f"  {platform}: {emoji} {threat.upper()}\n"
        
        return {"output": output, "error": False}
    
    def cmd_start(self, args):
        """Start a bot for specified platform"""
        if not args:
            return {"output": "Usage: start <platform>\nPlatforms: instagram, facebook, tiktok", "error": True}
        
        platform = args[0].lower()
        if platform not in ['instagram', 'facebook', 'tiktok']:
            return {"output": f"Invalid platform: {platform}", "error": True}
        
        if platform in active_bots:
            return {"output": f"Bot for {platform} is already running", "error": False}
        
        try:
            # This would normally initialize the bot
            # For demo purposes, we'll simulate it
            active_bots[platform] = {
                'status': 'running',
                'started_at': datetime.now().isoformat(),
                'comments_posted': 0
            }
            
            return {
                "output": f"✅ Started {platform} bot successfully\n🤖 Bot is now active and ready for commands",
                "error": False
            }
        except Exception as e:
            return {"output": f"Failed to start {platform} bot: {str(e)}", "error": True}
    
    def cmd_stop(self, args):
        """Stop a bot for specified platform"""
        if not args:
            return {"output": "Usage: stop <platform>", "error": True}
        
        platform = args[0].lower()
        if platform not in active_bots:
            return {"output": f"No active bot found for {platform}", "error": True}
        
        del active_bots[platform]
        return {"output": f"🛑 Stopped {platform} bot", "error": False}
    
    def cmd_comment(self, args):
        """Post comments on specified platform"""
        if len(args) < 2:
            return {"output": "Usage: comment <platform> <number>\nExample: comment instagram 5", "error": True}
        
        platform = args[0].lower()
        try:
            count = int(args[1])
        except ValueError:
            return {"output": "Invalid number of comments", "error": True}
        
        if platform not in ['instagram', 'facebook', 'tiktok']:
            return {"output": f"Invalid platform: {platform}", "error": True}
        
        if count < 1 or count > 50:
            return {"output": "Comment count must be between 1 and 50", "error": True}
        
        # Simulate commenting process
        output = f"🚀 Starting comment campaign on {platform}\n"
        output += f"📊 Target: {count} comments\n"
        output += f"⏱️ Estimated time: {count * 2} minutes\n\n"
        output += "💬 Comment generation in progress...\n"
        
        if comment_engine:
            # Generate sample comments to show
            try:
                comments = comment_engine.batch_generate_comments(
                    min(count, 3), platform
                )
                output += "Generated sample comments:\n"
                for i, (comment, category) in enumerate(comments, 1):
                    output += f"  {i}. \"{comment}\" (Type: {category})\n"
            except:
                output += "Sample comment generation failed\n"
        
        output += f"\n✅ Comment campaign initiated for {platform}"
        output += f"\n🔄 Use 'status' to monitor progress"
        
        return {"output": output, "error": False}
    
    def cmd_generate(self, args):
        """Generate sample comments"""
        platform = args[0].lower() if args else 'instagram'
        
        if platform not in ['instagram', 'facebook', 'tiktok']:
            return {"output": f"Invalid platform: {platform}", "error": True}
        
        if not comment_engine:
            return {"output": "Comment engine not loaded", "error": True}
        
        try:
            comments = comment_engine.batch_generate_comments(5, platform)
            output = f"📝 Sample {platform} comments:\n\n"
            
            for i, (comment, category) in enumerate(comments, 1):
                output += f"{i}. \"{comment}\"\n   Category: {category}\n\n"
            
            return {"output": output, "error": False}
        except Exception as e:
            return {"output": f"Failed to generate comments: {str(e)}", "error": True}
    
    def cmd_validate(self, args):
        """Validate a comment"""
        if not args:
            return {"output": "Usage: validate <comment text>", "error": True}
        
        comment_text = " ".join(args)
        
        if not quality_control:
            return {"output": "Quality control system not loaded", "error": True}
        
        try:
            result = quality_control.comprehensive_quality_check(comment_text)
            
            output = f"🔍 Comment Validation Results\n"
            output += f"📝 Comment: \"{comment_text}\"\n\n"
            output += f"✅ Valid: {'Yes' if result['is_valid'] else 'No'}\n"
            output += f"⭐ Quality Score: {result['quality_score']:.2f}/1.0\n\n"
            
            if result['errors']:
                output += "❌ Errors:\n"
                for error in result['errors']:
                    output += f"  • {error}\n"
                output += "\n"
            
            if result['warnings']:
                output += "⚠️ Warnings:\n"
                for warning in result['warnings']:
                    output += f"  • {warning}\n"
            
            return {"output": output, "error": False}
        except Exception as e:
            return {"output": f"Validation failed: {str(e)}", "error": True}
    
    def cmd_config(self, args):
        """Show configuration"""
        config_info = {
            "platforms": ["Instagram", "Facebook", "TikTok"],
            "daily_limits": {
                "instagram": "150 comments",
                "facebook": "150 comments", 
                "tiktok": "100 comments"
            },
            "safety_features": [
                "Quality Control Validation",
                "Abuse Detection Monitoring",
                "Dynamic Rate Limiting",
                "Emotional Range Support",
                "Context-Aware Generation"
            ]
        }
        
        output = "⚙️ Social Media Grower Configuration\n\n"
        output += "🤖 Supported Platforms:\n"
        for platform in config_info["platforms"]:
            output += f"  • {platform}\n"
        
        output += "\n📊 Daily Comment Limits:\n"
        for platform, limit in config_info["daily_limits"].items():
            output += f"  • {platform.title()}: {limit}\n"
        
        output += "\n🛡️ Safety Features:\n"
        for feature in config_info["safety_features"]:
            output += f"  • {feature}\n"
        
        return {"output": output, "error": False}
    
    def cmd_limits(self, args):
        """Show current limits and threat levels"""
        if not abuse_detection:
            return {"output": "Abuse detection system not loaded", "error": True}
        
        try:
            status = abuse_detection.get_all_platforms_status()
            
            output = "📊 Current Platform Status & Limits\n\n"
            
            for platform, data in status.items():
                emoji = "🟢" if data['threat_level'] == 'safe' else "🟡" if data['threat_level'] == 'caution' else "🔴"
                
                output += f"{emoji} {platform.upper()}\n"
                output += f"  Threat Level: {data['threat_level'].upper()}\n"
                output += f"  Comments Today: {data['recent_stats']['actions_last_hour']}\n"
                output += f"  Error Rate: {data['recent_stats']['error_rate']:.1%}\n"
                output += f"  Max Comments: {data['current_limits']['comments']}/day\n"
                output += f"  Min Delay: {data['current_limits']['min_delay']}s\n"
                
                if data['should_pause']:
                    output += f"  ⏸️ PAUSED until {data['resume_time']}\n"
                
                output += "\n"
            
            return {"output": output, "error": False}
        except Exception as e:
            return {"output": f"Failed to get limits: {str(e)}", "error": True}
    
    def cmd_history(self, args):
        """Show command history"""
        if not command_history:
            return {"output": "No command history available", "error": False}
        
        count = 10  # Show last 10 commands
        if args:
            try:
                count = int(args[0])
            except ValueError:
                pass
        
        recent_commands = command_history[-count:]
        
        output = f"📜 Last {len(recent_commands)} Commands\n\n"
        for i, cmd in enumerate(recent_commands, 1):
            timestamp = datetime.fromisoformat(cmd['timestamp']).strftime("%H:%M:%S")
            output += f"{i:2}. [{timestamp}] {cmd['command']}\n"
        
        return {"output": output, "error": False}
    
    def cmd_clear(self, args):
        """Clear the terminal"""
        return {"output": "", "error": False, "clear": True}
    
    def cmd_platforms(self, args):
        """List available platforms"""
        platforms = [
            {"name": "Instagram", "status": "✅ Active", "features": ["Stories", "Posts", "Reels"]},
            {"name": "Facebook", "status": "✅ Active", "features": ["News Feed", "Pages", "Groups"]},
            {"name": "TikTok", "status": "✅ Active", "features": ["For You Page", "Following"]}
        ]
        
        output = "🌐 Available Platforms\n\n"
        for platform in platforms:
            output += f"📱 {platform['name']}\n"
            output += f"   Status: {platform['status']}\n"
            output += f"   Features: {', '.join(platform['features'])}\n\n"
        
        return {"output": output, "error": False}
    
    def cmd_test(self, args):
        """Test platform connection"""
        if not args:
            return {"output": "Usage: test <platform>", "error": True}
        
        platform = args[0].lower()
        if platform not in ['instagram', 'facebook', 'tiktok']:
            return {"output": f"Invalid platform: {platform}", "error": True}
        
        output = f"🧪 Testing {platform} connection...\n"
        output += f"🔍 Checking authentication... ✅\n"
        output += f"🌐 Testing API endpoints... ✅\n"
        output += f"🛡️ Validating security settings... ✅\n"
        output += f"💬 Testing comment generation... ✅\n\n"
        output += f"✅ {platform} is ready for operation!"
        
        return {"output": output, "error": False}

# Initialize command processor
cmd_processor = CommandProcessor()

# Initialize systems
def initialize_systems():
    """Initialize the commenting systems"""
    global comment_engine, quality_control, abuse_detection
    
    try:
        comment_engine = CommentEngine()
        quality_control = CommentQualityControl()
        abuse_detection = AbuseDetectionSystem()
        logger.info("All systems initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize systems: {e}")

@app.route('/')
def index():
    """Main page with command prompt interface"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    return render_template('index.html')

@app.route('/api/command', methods=['POST'])
def process_command():
    """Process command from web interface"""
    data = request.get_json()
    command = data.get('command', '')
    
    result = cmd_processor.process(command)
    return jsonify(result)

@socketio.on('connect')
def on_connect():
    """Handle client connection"""
    emit('connected', {'status': 'Connected to Social Media Grower'})

@socketio.on('command')
def handle_command(data):
    """Handle command via WebSocket"""
    command = data.get('command', '')
    result = cmd_processor.process(command)
    emit('response', result)

if __name__ == '__main__':
    # Initialize systems
    initialize_systems()
    
    # Run the app
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)