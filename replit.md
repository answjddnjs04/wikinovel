# Overview

This is a wiki-style collaborative novel platform where multiple users can contribute to and edit stories together. The system combines Wikipedia's collaborative editing model with web novel creation, allowing readers and writers to collectively build narratives through proposals and voting mechanisms. Users can browse novels by genre, propose edits to specific text blocks, and vote on changes using a weighted voting system based on their contribution history.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses a modern React-based Single Page Application (SPA) architecture:
- **React with TypeScript** for component-based UI development
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Vite** as the build tool with HMR support

The application follows a page-based routing structure with authenticated and non-authenticated views, handling user sessions and providing real-time feedback through toast notifications.

## Backend Architecture
The server implements a REST API using:
- **Express.js** with TypeScript for the web framework
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** as the primary database (configured for Neon)
- **Session-based authentication** using Replit's OpenID Connect integration
- **Structured error handling** with consistent API responses

The API follows RESTful conventions with endpoints for novels, blocks, proposals, and voting operations.

## Database Design
The schema uses a block-based content structure:
- **Users** table stores authentication data and contribution scores
- **Novels** table contains metadata and genre information
- **Blocks** table stores individual content segments with versioning
- **Proposals** table manages edit suggestions with expiration times
- **Votes** table implements weighted voting based on user contributions
- **Block Contributions** table tracks user participation and character counts

This design enables granular content editing and maintains complete revision history.

## Authentication & Authorization
- **Replit OpenID Connect** integration for user authentication
- **Session-based** state management with PostgreSQL session storage
- **Contribution-based** authorization where voting weight correlates to user participation
- **Title system** that assigns user roles based on contribution percentages

## Content Management System
The platform implements a sophisticated collaborative editing workflow:
- **Block-level editing** allows users to propose changes to specific text segments
- **Time-limited voting** periods (24 hours) for proposal approval
- **Weighted voting** system where user influence is proportional to their contributions
- **Version control** maintains complete edit history at the block level
- **Real-time status tracking** for proposals and voting progress

# External Dependencies

## Database & Storage
- **Neon Database** (PostgreSQL) for primary data storage
- **connect-pg-simple** for PostgreSQL-backed session storage

## Authentication
- **Replit OpenID Connect** for user authentication and authorization
- **passport** and **openid-client** for OAuth implementation

## UI & Styling
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling with custom design system
- **Lucide React** for consistent iconography

## Development Tools
- **Drizzle Kit** for database migrations and schema management
- **Vite** for build tooling and development server
- **TypeScript** for type safety across the full stack

## State Management
- **TanStack React Query** for server state caching and synchronization
- **React Hook Form** with Zod validation for form handling