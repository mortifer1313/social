# Social Media Grower

## Overview

Social Media Grower is an intelligent multi-platform social media automation system with a React-based interactive documentation and dashboard interface. The application provides automated commenting capabilities across Instagram, Facebook, and TikTok with 250+ emotional comment templates across 6 categories, quality control, and abuse detection systems. The frontend serves as both documentation and a control panel for the automation bots.

## Recent Changes

- **December 2024**: Added complete stealth scheduling system with human-like behavior patterns
  - Campaign queue management with real-time status updates
  - Pause/resume/cancel controls for active campaigns
  - Configurable stealth settings (delays, active hours, daily limits)
  - Added "Critics (Medical)" category with 50 skeptical/critical comment templates
  - Added email notifications for campaign completion and account issues
  - Added browser session persistence to avoid repeated logins

## User Preferences

Preferred communication style: Simple, everyday language.

## Key Features

### Stealth Automation
- **Human-like Timing**: Randomized delays between comments (60-180 seconds default)
- **Active Hours**: Comments only posted during configurable hours (9 AM - 10 PM default)
- **Daily Limits**: Maximum comments per hour (10) and per day (50)
- **Variance Patterns**: 10% chance of longer "distraction" pauses, 5% chance of quick follow-ups
- **Weekend Pausing**: Optional skip of Saturday and Sunday

### Campaign Management
- **Targeting Options**: Target specific profiles or individual posts
- **Comment Categories**: Mixed, Positive, Playful, Sassy, Dramatic, Appreciative, Critics
- **Real-time Monitoring**: Live progress tracking with estimated completion times
- **Queue Controls**: Pause, resume, and cancel running campaigns

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Design System**: Terminal-inspired developer tool interface with monospace typography (Fira Code, JetBrains Mono)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: Vite for frontend, esbuild for server bundling
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Development**: Vite dev server with HMR proxied through Express

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains table definitions
- **Migrations**: Generated via `drizzle-kit push`
- **Current Schema**: 
  - `users` - User accounts
  - `campaigns` - Automation campaigns with stealth settings
  - `scheduled_comments` - Queued comments with scheduling timestamps
  - `activity_logs` - Action logging for monitoring
- **In-Memory Fallback**: MemStorage class in `server/storage.ts` for development without database

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/    # UI components (custom + shadcn/ui)
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared types and schemas
│   └── schema.ts     # Drizzle database schema
└── attached_assets/  # Reference Python bot implementation
```

### Key Design Decisions

1. **Monorepo Structure**: Client, server, and shared code colocated with TypeScript path aliases (`@/`, `@shared/`)

2. **Component Architecture**: Feature components (PlatformCard, Terminal, CommentPreview) paired with example files for documentation

3. **Terminal UI Pattern**: Interactive terminal component that processes commands for bot control, reflecting the CLI nature of the underlying automation system

4. **Storage Interface**: Abstract IStorage interface allows swapping between MemStorage (development) and database-backed storage (production)

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database operations
- **connect-pg-simple**: Session storage for Express

### UI Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **react-icons**: Additional platform icons (Instagram, Facebook, TikTok)
- **embla-carousel-react**: Carousel functionality
- **react-day-picker**: Calendar component
- **vaul**: Drawer component
- **cmdk**: Command palette component

### Development Tools
- **Vite**: Frontend build and dev server
- **esbuild**: Server bundling for production
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type safety across the stack

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay
- **@replit/vite-plugin-cartographer**: Dev tooling
- **@replit/vite-plugin-dev-banner**: Development banner

### Email Notifications
Email notifications require manual SMTP configuration. Set the following environment variables:
- `SMTP_HOST` - SMTP server hostname (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (e.g., 587 for TLS, 465 for SSL)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password
- `SMTP_FROM` - (Optional) From address, defaults to SMTP_USER
- `NOTIFICATION_EMAIL` - Email address to receive notifications

API Endpoints:
- `GET /api/notifications/status` - Check if email is configured
- `GET /api/notifications/test-connection` - Test SMTP connection
- `POST /api/notifications/test` - Send test email
- `POST /api/notifications/daily-summary` - Trigger daily summary email

### Reference Implementation
The `attached_assets/` directory contains a Python Flask implementation with:
- Selenium-based browser automation
- Platform-specific bot modules (Instagram, Facebook, TikTok)
- Comment engine with quality control and abuse detection
- Flask-SocketIO for real-time communication

This serves as the specification for bot functionality that the React interface controls.

## Docker Deployment

The application includes Docker configuration for deployment on Digital Ocean or any Docker-compatible platform.

### Files
- `Dockerfile` - Multi-stage build for production
- `docker-compose.yml` - Full stack with PostgreSQL
- `.env.example` - Environment variable template
- `.dockerignore` - Excludes unnecessary files from build

### Deployment Steps
1. Copy `.env.example` to `.env` and configure variables
2. Run `docker-compose up -d` to start the application
3. Access the app at `http://localhost:5000`

### Health Check
- `GET /api/health` - Returns `{"status": "healthy", "timestamp": "..."}` for load balancer health checks

### Bulk Account Import
The Accounts page supports CSV import for adding multiple accounts at once:
- Required columns: platform, username, credentialKey
- Optional columns: displayName, proxyHost, proxyPort, proxyUsername, proxyPassword
- Download template from the Import CSV dialog