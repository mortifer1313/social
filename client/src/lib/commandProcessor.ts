interface CommandResult {
  output: string;
  error: boolean;
}

interface BotState {
  instagram: boolean;
  facebook: boolean;
  tiktok: boolean;
}

interface AppState {
  bots: BotState;
  commandCount: number;
  startTime: Date;
}

const commentTemplates = {
  positive: [
    "This is absolutely incredible! The attention to detail is amazing",
    "Love everything about this! Keep up the fantastic work",
    "This just made my entire day so much better",
    "Wow, this is exactly what I needed to see today",
    "The creativity here is off the charts!",
  ],
  playful: [
    "Okay but why is this so good though?",
    "Not me saving this immediately...",
    "This has no business being this amazing",
    "Tell me your secrets right now",
    "The talent jumped out!",
  ],
  sassy: [
    "Everyone else can go home now",
    "You really said 'let me show them how it's done'",
    "The bar has officially been raised",
    "Other creators are taking notes rn",
    "Main character energy for real",
  ],
  dramatic: [
    "I literally cannot handle how perfect this is",
    "This changed my whole perspective!",
    "I've watched this like 50 times already",
    "This is the content the internet needs",
    "Obsessed is an understatement",
  ],
  appreciative: [
    "Thank you for sharing this beautiful content!",
    "Your creativity inspires so many people",
    "The effort you put into this really shows",
    "This community is lucky to have creators like you",
    "Genuinely appreciate the quality here",
  ],
};

export class CommandProcessor {
  private state: AppState;
  private onStateChange: (state: AppState) => void;

  constructor(onStateChange: (state: AppState) => void) {
    this.state = {
      bots: { instagram: false, facebook: false, tiktok: false },
      commandCount: 0,
      startTime: new Date(),
    };
    this.onStateChange = onStateChange;
  }

  getState() {
    return this.state;
  }

  process(commandLine: string): CommandResult {
    const parts = commandLine.trim().toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    this.state.commandCount++;
    this.onStateChange({ ...this.state });

    switch (cmd) {
      case "help":
        return this.cmdHelp();
      case "status":
        return this.cmdStatus();
      case "start":
        return this.cmdStart(args);
      case "stop":
        return this.cmdStop(args);
      case "comment":
        return this.cmdComment(args);
      case "generate":
        return this.cmdGenerate(args);
      case "validate":
        return this.cmdValidate(args.join(" "));
      case "config":
        return this.cmdConfig();
      case "limits":
        return this.cmdLimits();
      case "history":
        return this.cmdHistory();
      case "clear":
        return { output: "", error: false };
      case "platforms":
        return this.cmdPlatforms();
      case "test":
        return this.cmdTest(args);
      default:
        return {
          output: `Unknown command: ${cmd}. Type 'help' for available commands.`,
          error: true,
        };
    }
  }

  private cmdHelp(): CommandResult {
    const output = `
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
`;
    return { output, error: false };
  }

  private cmdStatus(): CommandResult {
    const uptime = this.getUptime();
    const activeBots = Object.entries(this.state.bots)
      .filter(([, active]) => active)
      .map(([name]) => name);

    const output = `
🚀 Social Media Grower Status
⏰ ${new Date().toISOString()}

💻 Core Systems:
  comment_engine: ✅ Loaded
  quality_control: ✅ Loaded
  abuse_detection: ✅ Loaded

🤖 Active Bots: ${activeBots.length > 0 ? activeBots.join(", ") : "None"}
📝 Commands Executed: ${this.state.commandCount}
⏱️ Uptime: ${uptime}

🛡️ Platform Security Status:
  Instagram: 🟢 SAFE
  Facebook: 🟢 SAFE
  TikTok: 🟢 SAFE
`;
    return { output, error: false };
  }

  private cmdStart(args: string[]): CommandResult {
    if (args.length === 0) {
      return {
        output: "Usage: start <platform>\nPlatforms: instagram, facebook, tiktok",
        error: true,
      };
    }

    const platform = args[0] as keyof BotState;
    if (!["instagram", "facebook", "tiktok"].includes(platform)) {
      return { output: `Invalid platform: ${platform}`, error: true };
    }

    if (this.state.bots[platform]) {
      return { output: `Bot for ${platform} is already running`, error: false };
    }

    this.state.bots[platform] = true;
    this.onStateChange({ ...this.state });

    return {
      output: `✅ Started ${platform} bot successfully\n🤖 Bot is now active and ready for commands`,
      error: false,
    };
  }

  private cmdStop(args: string[]): CommandResult {
    if (args.length === 0) {
      return { output: "Usage: stop <platform>", error: true };
    }

    const platform = args[0] as keyof BotState;
    if (!this.state.bots[platform]) {
      return { output: `No active bot found for ${platform}`, error: true };
    }

    this.state.bots[platform] = false;
    this.onStateChange({ ...this.state });

    return { output: `🛑 Stopped ${platform} bot`, error: false };
  }

  private cmdComment(args: string[]): CommandResult {
    if (args.length < 2) {
      return {
        output: "Usage: comment <platform> <number>\nExample: comment instagram 5",
        error: true,
      };
    }

    const platform = args[0];
    const count = parseInt(args[1], 10);

    if (!["instagram", "facebook", "tiktok"].includes(platform)) {
      return { output: `Invalid platform: ${platform}`, error: true };
    }

    if (isNaN(count) || count < 1 || count > 50) {
      return { output: "Comment count must be between 1 and 50", error: true };
    }

    const categories = Object.keys(commentTemplates);
    const samples: string[] = [];
    for (let i = 0; i < Math.min(count, 3); i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)] as keyof typeof commentTemplates;
      const templates = commentTemplates[cat];
      const comment = templates[Math.floor(Math.random() * templates.length)];
      samples.push(`  ${i + 1}. "${comment}" (Type: ${cat})`);
    }

    const output = `🚀 Starting comment campaign on ${platform}
📊 Target: ${count} comments
⏱️ Estimated time: ${count * 2} minutes

💬 Sample comments generated:
${samples.join("\n")}

✅ Comment campaign initiated for ${platform}
🔄 Use 'status' to monitor progress`;

    return { output, error: false };
  }

  private cmdGenerate(args: string[]): CommandResult {
    const platform = args[0] || "instagram";

    if (!["instagram", "facebook", "tiktok"].includes(platform)) {
      return { output: `Invalid platform: ${platform}`, error: true };
    }

    const samples: string[] = [];
    const categories = Object.keys(commentTemplates) as (keyof typeof commentTemplates)[];

    for (let i = 0; i < 5; i++) {
      const cat = categories[i % categories.length];
      const templates = commentTemplates[cat];
      const comment = templates[Math.floor(Math.random() * templates.length)];
      samples.push(`${i + 1}. "${comment}"\n   Category: ${cat}\n`);
    }

    return {
      output: `📝 Sample ${platform} comments:\n\n${samples.join("\n")}`,
      error: false,
    };
  }

  private cmdValidate(text: string): CommandResult {
    if (!text) {
      return { output: "Usage: validate <comment text>", error: true };
    }

    const length = text.length;
    const hasEmoji = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/.test(text);
    const isSpam = /buy|sell|click|link|follow me/i.test(text);

    const errors: string[] = [];
    const warnings: string[] = [];

    if (length < 10) errors.push("Comment too short (min 10 chars)");
    if (length > 500) errors.push("Comment too long (max 500 chars)");
    if (isSpam) errors.push("Contains spam-like keywords");
    if (!hasEmoji) warnings.push("Consider adding an emoji for engagement");

    const score = Math.max(0, 1 - errors.length * 0.3 - warnings.length * 0.1);

    let output = `🔍 Comment Validation Results
📝 Comment: "${text}"

✅ Valid: ${errors.length === 0 ? "Yes" : "No"}
⭐ Quality Score: ${score.toFixed(2)}/1.0
`;

    if (errors.length > 0) {
      output += `\n❌ Errors:\n${errors.map((e) => `  • ${e}`).join("\n")}\n`;
    }
    if (warnings.length > 0) {
      output += `\n⚠️ Warnings:\n${warnings.map((w) => `  • ${w}`).join("\n")}`;
    }

    return { output, error: errors.length > 0 };
  }

  private cmdConfig(): CommandResult {
    const output = `⚙️ Social Media Grower Configuration

🤖 Supported Platforms:
  • Instagram
  • Facebook
  • TikTok

📊 Daily Comment Limits:
  • Instagram: 150 comments
  • Facebook: 150 comments
  • TikTok: 100 comments

🛡️ Safety Features:
  • Quality Control Validation
  • Abuse Detection Monitoring
  • Dynamic Rate Limiting
  • Emotional Range Support (5 categories)
  • Context-Aware Generation

⏱️ Delay Settings:
  • Instagram: 3 minute intervals
  • Facebook: 2 minute intervals
  • TikTok: 1.5 minute intervals
`;
    return { output, error: false };
  }

  private cmdLimits(): CommandResult {
    const output = `📊 Rate Limits & Threat Levels

Platform         Daily Limit    Used    Remaining   Threat
─────────────────────────────────────────────────────────
Instagram        150            23      127         🟢 Safe
Facebook         150            18      132         🟢 Safe
TikTok           100            12      88          🟢 Safe

🕐 Reset Time: ${new Date(Date.now() + 8 * 60 * 60 * 1000).toLocaleTimeString()}

⚠️ Threat Level Guide:
  🟢 Safe      - Normal operation
  🟡 Caution   - Elevated monitoring
  🔴 Critical  - Auto-pause protection
`;
    return { output, error: false };
  }

  private cmdHistory(): CommandResult {
    return {
      output: `📜 Recent Command History

${this.state.commandCount} commands executed this session
Use ↑/↓ arrow keys to navigate history
`,
      error: false,
    };
  }

  private cmdPlatforms(): CommandResult {
    const output = `🌐 Available Platforms

Platform     Status      Daily Limit   Features
───────────────────────────────────────────────────
Instagram    ${this.state.bots.instagram ? "🟢 Active" : "⚪ Idle"}     150          Photos, Reels, Stories
Facebook     ${this.state.bots.facebook ? "🟢 Active" : "⚪ Idle"}     150          Posts, Groups, Pages
TikTok       ${this.state.bots.tiktok ? "🟢 Active" : "⚪ Idle"}     100          Videos, Duets, Sounds
`;
    return { output, error: false };
  }

  private cmdTest(args: string[]): CommandResult {
    if (args.length === 0) {
      return { output: "Usage: test <platform>", error: true };
    }

    const platform = args[0];
    if (!["instagram", "facebook", "tiktok"].includes(platform)) {
      return { output: `Invalid platform: ${platform}`, error: true };
    }

    return {
      output: `🔌 Testing ${platform} connection...

✅ API Connection: OK
✅ Authentication: Valid
✅ Rate Limit Status: Available
✅ Comment Engine: Ready

🟢 ${platform.charAt(0).toUpperCase() + platform.slice(1)} is ready for automation`,
      error: false,
    };
  }

  private getUptime(): string {
    const diff = Date.now() - this.state.startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}
