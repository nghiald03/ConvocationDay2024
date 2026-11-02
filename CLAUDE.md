# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a graduation ceremony check-in system with a multi-service architecture consisting of:

- **Frontend (fe/)**: Next.js with TypeScript for user interfaces
- **Backend (be-nest/)**: NestJS with TypeScript, Drizzle ORM, Better Auth and Socket.IO
- **Image API (imageAPI/)**: Node.js Express service for image uploads
- **Object storage**: MinIO
- **Database**: PostgreSQL

## Development Commands

### Frontend (fe/)

```bash
cd fe
bun run dev          # Start development server (port 3000)
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
```

### Backend (be-nest/)

```bash
cd be-nest
bun run dev              # Start development server (port 8081)
bun run build            # Build the project
bun run test             # Run tests
bun run lint             # Run ESLint
bun run typecheck        # Run the TypeScript compiler
bun run drizzle:migrate  # Apply migrations
```

### Docker Development

```bash
# Run entire system with Docker Compose
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:3001
# - Backend: http://localhost:8081
# - Database: localhost:5432
```

## System Architecture

### User Roles

The system has 4 distinct user roles with separate interfaces:

1. **Manager (MN)**: Manages graduates, halls, sessions, controls check-in availability, and creates notifications
2. **Checkiner (CK)**: Handles check-in process using student codes
3. **MC (US)**: Controls LED display and manages ceremony presentation
4. **Noticer (NO)**: Manages and broadcasts notifications through TTS system

### Core Data Flow

1. Manager uploads graduate data (Excel import supported) and student photos
2. Manager opens check-in for specific hall/session combinations
3. Manager creates notifications for announcements (hall-specific or school-wide)
4. Checkiner processes student check-ins via student code lookup
5. Noticer broadcasts notifications through TTS system to school speakers
6. MC displays checked-in graduates on LED screens with real-time updates

### Database Schema

Key entities:

- `Bachelor`: Graduate information (StudentCode, FullName, Hall, Session, Chair assignments)
- `CheckIn`: Check-in status tracking by hall/session
- `Notification`: Announcement system (Title, Content, Priority, Hall/Session scope, Status)
- `User`: System users with role-based access (MN, CK, US, NO)
- `Hall`: Ceremony halls
- `Session`: Ceremony sessions (100, 111)

### Real-time Communication

- Uses Socket.IO (`be-nest/src/realtime/events.gateway.ts`) for real-time updates
- Namespace: `/events`; the frontend reaches it through the `/backend-events` proxy

## Frontend Structure

### Route Organization

```
app/[locale]/(protected)/
├── checkin/              # Checkiner interfaces
├── manage/               # Manager interfaces
├── led/mc-controller/    # MC LED control
└── auth/                 # Authentication
```

### Key Technologies

- **UI Framework**: Tailwind CSS + ShadcnUI components
- **State Management**: Jotai for global state
- **API Integration**: Axios with React Query for data fetching
- **Internationalization**: next-intl
- **QR Code Scanning**: @yudiel/react-qr-scanner
- **Real-time**: socket.io-client

## Backend Structure

### Modules

Each domain lives in `be-nest/src/<module>/`: `audit`, `auth`, `bachelor`, `checkin`, `database`, `hall`, `health`, `led` (MC routes under `/api/Mc`), `media`, `migration`, `notification`, `photo-queue`, `realtime`, `session`, `statistics`, `users`.

### Authentication

- Better Auth session authentication
- Authorization through `@RequireRoles` and `@RequirePermissions` (see `be-nest/src/auth/permissions.ts`)
- CORS enabled for frontend integration

## Environment Configuration

### Frontend Environment Variables

- `NEXT_PUBLIC_SITE_URL`: Backend API base URL
- `API_URL`: Internal API URL for SSR

### Backend Configuration

- `DATABASE_URL`: PostgreSQL connection
- `BETTER_AUTH_SECRET`: Better Auth signing secret
- `MIGRATION_SQLSERVER_URL`: read-only SQL Server source for the data migration CLI

## Development Notes

### Database Migrations

Schema changes use Drizzle (`bun run drizzle:generate`, `bun run drizzle:migrate`). In Docker, the `be-nest-migrate` job applies migrations before `be-nest` starts. The legacy .NET backend was removed; restore it from git with `git checkout 7c768d2 -- be` if it is ever needed.

### Image Handling

Student photos are managed by the separate imageAPI service (Node.js) and should be named `{StudentCode}.png`.

### Testing Users

Legacy ASP.NET Identity passwords are verified once and rehashed into Better Auth on first successful login.
No default password is stored in the repository.

## Notification System

### Notification API Endpoints

- `GET /api/Notification` - Get all notifications with pagination
- `GET /api/Notification/{id}` - Get notification by ID
- `POST /api/Notification` - Create new notification (MN, NO roles)
- `PUT /api/Notification/{id}` - Update notification (MN, NO roles)
- `DELETE /api/Notification/{id}` - Delete notification (MN role only)
- `POST /api/Notification/{id}/broadcast` - Start broadcast (NO role only)
- `POST /api/Notification/{id}/complete` - Complete broadcast (NO role only)
- `POST /api/Notification/{id}/cancel` - Cancel notification (MN, NO roles)
- `GET /api/Notification/pending` - Get pending notifications for broadcast (NO role)

### Notification Features

- **Scope Control**: Hall-specific, session-specific, or school-wide announcements
- **Priority System**: High (1), Medium (2), Low (3) priority levels
- **Status Tracking**: PENDING → BROADCASTING → COMPLETED/CANCELLED
- **Automatic/Manual**: Support for scheduled and immediate broadcasts
- **TTS Integration**: Text-to-speech conversion using ElevenLabs API
- **Role-based Access**: Managers create, Noticers broadcast

### Notification Workflow

1. Manager creates notification with scope (hall/session) and priority
2. Notification enters PENDING status
3. Noticer selects notification and starts broadcast
4. System converts text to speech via TTS
5. Audio plays through school speaker system
6. Noticer marks broadcast as completed
