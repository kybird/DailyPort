# DailyPort SaaS Admin (Back-office) Functional Specification

This document outlines the requirements for the administration tools needed to operate DailyPort as a scalable SaaS platform.

## 1. Dashboard (Health & KPIs)
- **Financials**: MRR (Monthly Recurring Revenue), Churn Rate.
- **Acquisition**: Total/New/Deleted users (Daily/Weekly).
- **Conversion**: Free-to-Paid conversion ratio.
- **System Health**: 
    - Real-time status of Stock APIs and Crawlers.
    - AI API (OpenAI/Claude) usage and cost monitoring to prevent budget overruns.
- **Alerts**: Count of failed payments and unanswered support tickets.

## 2. User Management (RBAC)
- **User List**: Searchable by Email/Name with filters for Join Date, Subscription Level (Free/Pro), and Last Login.
- **User Detail**: 
    - Account linkage (Social login provider).
    - Asset status (No. of portfolios, linked brokerages).
- **Admin Actions**: 
    - **Ban/Unban**: Restrict malicious users.
    - **Manual Reset**: Password resets or session terminations.
    - **Admin Notes**: internal logs regarding user behavior (e.g., "Frequent refund requests").

## 3. Subscription & Billing
- **Payment History**: Searchable logs for Transaction ID (TID), Amount, Method, and Status (Success/Failure/Pending).
- **Refund Management**: Full and partial refund processing via integrated PG (PortOne/Stripe).
- **Product Management**: Ability to create/edit subscription plans (Basic, Pro, Premium) and discount rates.
- **Manual Grant**: Ability to grant free trial days for CS compensation or influencers.

## 4. Operation & Analytics
- **Batch Control**: Manual trigger buttons for daily stock updates and screening algorithms (for recovery).
- **Communications**: 
    - Management of in-app announcements/popups.
    - Global push notification delivery (e.g., "Market Crash Alert!").
- **Content Filter**: Blocklist/Slang management for community features.

## 5. Customer Support (CS)
- **1:1 Inquiry**: Ticketing system with status tracking (Pending/Answered/Resolved).
- **FAQ Management**: CRUD interface for frequently asked questions.

## 6. System & Security
- **Role-Based Access Control (RBAC)**:
    - **ROLE_SUPER_ADMIN**: Full access (Developer).
    - **ROLE_ADMIN**: Operations and CS management.
    - **ROLE_OPERATOR**: Read-only/Support restricted access.
- **Audit Log**: Explicit logging of WHO performed WHAT action (e.g., "Admin X refunded User Y") to prevent internal fraud.

## Implementation Tips
- **Low-code Tools**: Consider using **Retool** for rapid back-office development instead of building from scratch.
- **Payment Webhooks**: Ensure robust webhook implementation for payment providers to handle edge cases where users close windows before the 'success' redirect.
- **Frameworks**: If custom-built, leverage **AdminJS** (Node.js) or **Django Admin** (Python) for rapid scaffolding.

---
**Status**: Backlog / SaaS Readiness Plan 
