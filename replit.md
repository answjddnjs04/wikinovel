# Overview

This is a wiki-style collaborative novel platform where multiple users can contribute to and edit stories together. The system combines Wikipedia's collaborative editing model with web novel creation, allowing readers and writers to collectively build narratives through proposals and voting mechanisms. Users can browse novels by genre, propose edits to specific text blocks, and vote on changes using a weighted voting system based on their contribution history.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (2025-08-15)

## Implemented Features
- **카카오 OAuth 로그인**: 완전한 카카오톡 소셜 로그인 시스템 구현 및 디버깅 완료
- **신규 사용자 온보딩**: 처음 로그인 시 자동으로 프로필 설정 화면으로 리다이렉트
- **사용자 프로필 관리**: 닉네임 변경 기능과 카카오 프로필 사진 자동 연동
- **Header 프로필 연동**: 사용자 정보 클릭시 프로필 페이지 이동 기능
- **댓글 시스템**: 제안 상세 페이지에 완전한 댓글 작성/조회 기능 구현
- **가중 투표 시스템**: 사용자 기여도(100글자당 1가중치)에 따른 투표 권한 차등 적용
- **홈 페이지 직접 접근**: 인증된 사용자는 랜딩 페이지를 건너뛰고 바로 홈으로 이동
- **투표 비율 시각화**: 개표 수 대신 가중치 기반 비율로 투표 현황 표시
- **자동 제안 승인**: 만료 시간 도달 시 가중치 기반 과반수 승인으로 자동 적용
- **"재검토 요청" 모드**: 제안 승인 시 충돌하는 다른 제안들을 자동으로 needs_review 상태로 변경
- **내 제안 관리 페이지**: 사용자별 제안 목록, 상태 표시, 재검토 요청 처리 기능 구현
- **채택된 버전 기반 재작성**: 재검토 요청된 제안에서 "다시 작성하기" 버튼으로 새 제안 작성 가능
- **제안 삭제 기능**: 내 제안 관리에서 승인되지 않은 제안들을 직접 삭제 가능
- **리더보드 간소화**: 승인률 탭 제거로 핵심 지표 중심의 간결한 인터페이스 구현
- **네비게이션 개선**: Header에 주요 페이지 링크 추가로 접근성 향상
- **실제 통계 시스템**: 데이터베이스 기반 실시간 플랫폼 통계 계산 (총 소설 수, 총 글자 수만 표시)
- **소설 조회수 기능**: 소설별 자동 조회수 추적, NovelCard와 소설 상세 페이지에 조회수 표시
- **실시간 데이터 표시**: Mock 데이터 대신 실제 데이터베이스 수치 기반 통계 제공
- **통계 UI 간소화**: Landing 페이지 플랫폼 현황을 핵심 지표 2개로 단순화
- **회차별 조회수 수정**: EpisodeList의 랜덤 조회수를 실제 데이터 기반으로 변경 (기본값 0)

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
- **Dual Authentication System**: Replit OpenID Connect와 Kakao OAuth 2.0 통합 인증
- **Session-based** state management with PostgreSQL session storage
- **Kakao Social Login**: 카카오톡 계정을 통한 소셜 로그인 지원
- **Contribution-based** authorization where voting weight correlates to user participation
- **Title system** that assigns user roles based on contribution percentages
- **Automatic Profile Setup**: 신규 사용자의 첫 로그인 시 프로필 설정 자동 안내

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