# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a graduation ceremony check-in system with a multi-service architecture consisting of:
- **Frontend (fe/)**: Next.js with TypeScript for user interfaces
- **Backend (be/)**: ASP.NET Core Web API with C#
- **Image API (imageAPI/)**: Node.js Express service for image uploads
- **Database**: Microsoft SQL Server

## Development Commands

### Frontend (fe/)
```bash
cd fe
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Backend (be/)
```bash
cd be
dotnet run           # Start development server (port 80/443)
dotnet build         # Build the project
dotnet ef database update  # Apply migrations
```

### Docker Development
```bash
# Run entire system with Docker Compose
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:3001
# - Backend: http://localhost:85
# - Database: localhost:1431
# - Image API: http://localhost:3214
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
- Uses SignalR (`MessageHub`) for real-time updates across all user interfaces
- Check-in events broadcast immediately to MC interfaces
- Connection endpoint: `/chat-hub`

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
- **Real-time**: @microsoft/signalr

## Backend Structure

### Controllers
- `AuthController`: JWT authentication
- `BachelorController`: Graduate CRUD operations
- `CheckinController`: Check-in process management
- `HallController`: Hall management
- `SessionController`: Session management
- `McController`: MC interface data
- `NotificationController`: Notification CRUD and broadcast management
- `StatisticsController`: Reporting and analytics

### Services
Registered services in DI container:
- `BachelorService`
- `CheckInService`
- `HallService`
- `SessionService`
- `StatisticsService`
- `NotificationService`

### Authentication
- JWT Bearer token authentication
- Role-based authorization with 4 roles: MN, CK, US, NO
- CORS enabled for frontend integration

## Environment Configuration

### Frontend Environment Variables
- `NEXT_PUBLIC_SITE_URL`: Backend API base URL
- `API_URL`: Internal API URL for SSR

### Backend Configuration
- `ConnectionStrings:DefaultConnection`: SQL Server connection for production
- `ConnectionStrings:DbConnection`: SQL Server connection for development
- `JWT:Key`: JWT signing key

## Development Notes

### Database Migrations
The system auto-creates database and applies migrations in production mode. For development, use Entity Framework commands.

### Image Handling
Student photos are managed by the separate imageAPI service (Node.js) and should be named `{StudentCode}.png`.

### Testing Users
Default seeded users for testing:
- Manager: mana@gmail.com / 123456
- Checkiner: checkin@gmail.com / 123456
- User: user@gmail.com / 123456
- Noticer: noticer@gmail.com / 123456

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