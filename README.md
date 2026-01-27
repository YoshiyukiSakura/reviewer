# AI Code Reviewer

An AI-powered code review application built with Next.js 16, React 19, and PostgreSQL.

## Features

- AI-powered code reviews with multiple provider support (OpenAI, Anthropic, Azure)
- GitHub integration for PR monitoring and operations
- Review management with status tracking
- Threaded commenting system with severity levels
- JWT-based authentication
- Dashboard with statistics and analytics

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **AI**: OpenAI, Anthropic, Azure OpenAI
- **Testing**: Jest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your environment variables in .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Documentation

- [API Documentation](docs/api.md) - REST API endpoints reference
- [Component Documentation](docs/components.md) - UI components and hooks
- [Deployment Guide](docs/deployment.md) - Production deployment instructions

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
├── lib/
│   ├── ai/                 # AI reviewer implementation
│   ├── github/             # GitHub API integration
│   ├── react/              # React hooks and context
│   ├── ui/                 # Reusable UI components
│   └── validators/         # Zod validation schemas
├── worker/                 # Background workers
└── types/                  # TypeScript type definitions
```