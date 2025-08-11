# Overview

Bepoz AI Insights is a comprehensive hospitality analytics dashboard that provides AI-powered insights for POS data. The application combines a React frontend with an Express backend to deliver real-time analytics, natural language querying capabilities, and interactive data visualizations for restaurant and hospitality businesses. Users can analyze sales data, track KPIs, and generate insights through a dedicated AI chat interface with conversation history.

# Recent Changes

## 2025-08-11: Fixed Application Startup Issues
- Resolved missing `postgres` package dependency that was preventing the server from starting
- Removed invalid `@openai/agents` package reference that was blocking npm install
- Fixed Drizzle ORM query builder issues in storage.ts:
  - Corrected `.where()` chaining problems by building conditions arrays first
  - Fixed type compatibility for category field (null vs string) using SQL COALESCE
  - Updated `executeReadOnlySQL` method to handle result objects properly
- Application now starts successfully on port 5000

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built with React and TypeScript, utilizing a modern component-based architecture:

- **UI Framework**: React with TypeScript for type safety and component reusability
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing with dedicated pages for Dashboard, Sales Trends, and AI Chat
- **Authentication**: Custom JWT-based authentication with direct login using demo@bepoz.com (fixed organization mapping issue)
- **Charts/Visualization**: Chart.js for data visualization and analytics charts
- **AI Chat Interface**: Dedicated conversation page with message history and quick access from header

The application follows a modular structure with separate directories for components, pages, hooks, and utilities. The UI components are based on Radix UI primitives with custom styling through the shadcn/ui system. All pages share consistent sidebar and header layouts for unified user experience.

## Backend Architecture

The backend uses Express.js with TypeScript in an ESM module configuration:

- **Framework**: Express.js with TypeScript for API endpoints and middleware
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: JWT-based authentication with session management
- **AI Integration**: OpenAI GPT-4 for natural language to SQL query generation and insights
- **API Design**: RESTful API structure with organized route handlers

The server architecture separates concerns into routes, services, and storage layers, with dedicated modules for AI services and database operations.

## Database Design

PostgreSQL database with Drizzle ORM for schema management:

- **Schema Structure**: Tables for users, locations, products, orders, and order items
- **Data Types**: Support for monetary values, timestamps, and hierarchical data
- **Relationships**: Foreign key relationships between orders, locations, and products
- **Performance**: Optimized for analytics queries with proper indexing strategies

The schema is designed to support multi-location restaurant operations with comprehensive POS data tracking.

## Authentication & Authorization

JWT-based authentication system with magic link functionality:

- **Magic Links**: Passwordless authentication via email links
- **Session Management**: JWT tokens for stateless authentication
- **Role-Based Access**: User roles and location-based access control
- **Security**: Secure token handling and validation middleware

## AI Query System

OpenAI integration for natural language data querying:

- **SQL Generation**: Converts natural language queries to safe SQL statements
- **Query Validation**: Ensures only read-only operations and includes safety constraints
- **Insight Generation**: AI-powered analysis of query results with business context
- **Error Handling**: Comprehensive error handling and user feedback

The AI system is designed with safety as a priority, enforcing read-only queries with limits and sanitization.

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL hosting service for production database
- **Drizzle ORM**: Type-safe database operations and migrations

## AI Services
- **OpenAI API**: GPT-4 model for natural language processing and SQL generation
- **OpenAI Chat Completions**: For generating insights and explanations

## UI Component Libraries
- **Radix UI**: Accessible component primitives for dropdowns, dialogs, and form controls
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool and development server for fast compilation
- **TanStack Query**: Data fetching and caching library
- **Chart.js**: Canvas-based charting library for data visualization

## Authentication & Security
- **jsonwebtoken**: JWT token generation and validation
- **bcrypt**: Password hashing (if needed for future features)

## Styling & CSS
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: For component variant management
- **clsx & tailwind-merge**: Conditional class name utilities

The application is designed to be deployed on Replit with environment variables for database connections and API keys.