# Reviewer

An AI-powered code review platform that automatically analyzes GitHub Pull Requests using multiple AI providers. The system continuously monitors repositories, fetches PR changes, and provides intelligent code review feedback with severity levels and line-by-line comments.

## Features

- **Automated PR Monitoring**: Continuously polls GitHub repositories to detect new and updated pull requests
- **Multi-Provider AI Analysis**: Supports OpenAI (GPT-4, GPT-4o), Anthropic (Claude), and Azure OpenAI
- **Multiple Review Types**:
  - Comprehensive reviews covering all aspects
  - Security-focused analysis
  - Performance optimization reviews
  - Focused reviews for specific concerns
- **Persistent Storage**: Stores reviews and comments in PostgreSQL with line-level granularity
- **Comment Threading**: Support for nested discussion threads on review comments
- **Severity Levels**: Categorizes feedback as INFO, SUGGESTION, WARNING, ERROR, or CRITICAL
- **JWT Authentication**: Secure token-based authentication system
- **Retry Logic**: Automatic retry mechanisms for resilient API calls
- **Status Tracking**: Reviews progress through PENDING, IN_PROGRESS, APPROVED, CHANGES_REQUESTED, CLOSED states

## Tech Stack

### Frontend & Framework
- **Next.js 16.1.3** - React framework with App Router
- **React 19.2.3** - UI library
- **Tailwind CSS 4** - Utility-first CSS framework
- **TypeScript 5** - Type-safe development

### Backend & Database
- **Prisma 6.19.2** - Type-safe ORM
- **PostgreSQL** - Relational database
- **Jose 5.9.6** - JWT handling

### AI Providers
- **OpenAI API** - GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo
- **Anthropic API** - Claude 3 Opus, Sonnet, Haiku, 3.5 Sonnet, 3.5 Haiku
- **Azure OpenAI** - Alternative provider support

### Testing & Development
- **Jest 30.2.0** - Testing framework
- **Vitest 1.0.0** - Fast unit test runner
- **ESLint 9** - Code linting
- **PM2** - Process management

## Quick Start

### Prerequisites

- Node.js 20+ or compatible version
- PostgreSQL database
- GitHub Personal Access Token
- API key for at least one AI provider (OpenAI, Anthropic, or Azure OpenAI)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd reviewer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration (see Configuration section below)
```

4. Set up the database:
```bash
# Run Prisma migrations
npx prisma migrate dev

# Optional: Generate Prisma Client (done automatically during install)
npx prisma generate
```

5. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Application Settings
```env
NODE_ENV=development
APP_URL=http://localhost:3000
APP_PORT=3000
```

#### Database Configuration
```env
# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/reviewer_db
```

#### Authentication
```env
# Generate strong random strings for production
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# NextAuth.js settings
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

#### GitHub Integration
```env
# GitHub OAuth (for user login)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# GitHub Personal Access Token (for API calls)
GITHUB_TOKEN=your-github-token

# Repositories to monitor (comma-separated)
PR_MONITOR_REPOSITORIES=owner1/repo1,owner2/repo2

# Polling interval in milliseconds (default: 60000)
PR_MONITOR_POLL_INTERVAL_MS=60000
```

#### AI Provider Configuration
```env
# Choose provider: openai, anthropic, or azure-openai
AI_PROVIDER=openai

# Model selection (provider-specific)
AI_MODEL=gpt-4o

# API Keys (provide at least one)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
AZURE_OPENAI_API_KEY=your-azure-openai-api-key

# Optional AI settings
AI_BASE_URL=https://api.openai.com/v1
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.3
AI_TIMEOUT=60000
```

### Supported AI Models

**OpenAI Models:**
- `gpt-4`
- `gpt-4-turbo`
- `gpt-4o`
- `gpt-3.5-turbo`

**Anthropic Models:**
- `claude-3-opus`
- `claude-3-sonnet`
- `claude-3-haiku`
- `claude-3-5-sonnet`
- `claude-3-5-haiku`

**Azure OpenAI:**
- Configure your deployment name in `AI_MODEL`

## Available Commands

### Development
```bash
# Start development server
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Database
```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Process Management (PM2)
```bash
# Start all processes
pm2 start ecosystem.config.js

# Start in production mode
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs --nostream

# Monitor processes
pm2 monit

# Stop all processes
pm2 stop all

# Restart all processes
pm2 restart all

# Delete all processes
pm2 delete all
```

## Project Structure

```
/src/
├── /app/              # Next.js application pages and layout
│   ├── page.tsx       # Home page
│   └── layout.tsx     # Root layout component
│
├── /lib/              # Core business logic and utilities
│   ├── /ai/           # AI reviewer module
│   │   ├── reviewer.ts       # Main AIReviewer class
│   │   ├── prompts.ts        # Prompt templates
│   │   └── __tests__/        # AI reviewer tests
│   │
│   ├── /github/       # GitHub integration
│   │   ├── pr-actions.ts    # PR actions
│   │   └── pr-diff.ts       # PR diff fetching
│   │
│   ├── auth.ts        # JWT authentication
│   ├── prisma.ts      # Prisma client singleton
│   └── remote-log.ts  # Remote logging utility
│
├── /worker/           # Background job processors
│   ├── pr-monitor.ts          # PR monitoring system
│   ├── review-processor.ts    # Review workflow orchestration
│   └── __tests__/             # Worker tests
│
└── /types/
    └── index.ts       # TypeScript type definitions

/prisma/
└── schema.prisma      # Database schema

ecosystem.config.js    # PM2 configuration
```

## Architecture

### Worker Processes

The application runs two main processes managed by PM2:

**1. Web Server (`reviewer-web`)**
- Next.js application server
- Handles HTTP requests and API routes
- Serves the frontend UI

**2. Background Worker (`reviewer-worker`)**
- **PR Monitor**: Polls GitHub repositories at configured intervals
- **Review Processor**: Orchestrates the complete review workflow
  - Phase 1: Fetches PR diff from GitHub
  - Phase 2: Calls AI reviewer for analysis
  - Phase 3: Saves results to database

### Database Schema

**Review Model**
- Stores code review sessions with metadata
- Tracks status (PENDING, IN_PROGRESS, APPROVED, etc.)
- Links to source PRs via sourceType, sourceId, sourceUrl
- Contains author information and timestamps

**ReviewComment Model**
- Stores individual comments on reviews
- Supports line-level positioning (filePath, lineStart, lineEnd)
- Categorizes feedback by severity (INFO, SUGGESTION, WARNING, ERROR, CRITICAL)
- Enables comment threading via parentId relationship

## Development

### Adding New Review Types

Extend the `AIReviewer` class in `src/lib/ai/reviewer.ts` and add corresponding prompts in `src/lib/ai/prompts.ts`.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test path/to/test.ts
```

### Code Style

The project uses ESLint for code quality. Run `npm run lint` before committing changes.

## License

[Add your license information here]

## Contributing

[Add contributing guidelines here]
