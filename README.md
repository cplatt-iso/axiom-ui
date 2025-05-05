# Axiom Flow - Frontend

This project contains the React-based user interface for the Axiom Flow DICOM processing system. It allows users to configure, monitor, and manage the backend services.

Built with Vite, React, TypeScript, Tailwind CSS, Shadcn UI, TanStack Query, TanStack Table, React Hook Form, Zod, and Sonner.

## Features

*   **Dashboard:** Overview of system component statuses (Database, Broker, Workers), DIMSE Listener status, DICOMweb Poller status, and DIMSE Q/R Poller status with basic metrics.
*   **Authentication:** Google OAuth 2.0 login integration via `@react-oauth/google`. Handles token exchange with the backend and stores session information.
*   **Authorization:** Role-Based Access Control (RBAC) implemented using `ProtectedRoute` components to restrict access to admin sections based on user roles fetched from the backend.
*   **Configuration Management:** Dedicated section (`/admin/config`) with UI for managing:
    *   **Scrapers:**
        *   DICOMweb Sources (Table, Create/Edit Modal Form with RHF/Zod).
        *   DIMSE Q/R Sources (Table, Create/Edit Modal Form with RHF/Zod, includes TLS config).
        *   **Google Healthcare Sources (Table, Create/Edit Modal Form with RHF/Zod).**
    *   **Listeners:**
        *   DIMSE Listeners (Table, Create/Edit Modal Form with RHF/Zod, includes TLS config).
        *   STOW-RS Endpoint (Informational Page).
        *   JSON API Endpoint (Informational Page).
    *   **Schedules:**
        *   Reusable time-based schedules (Table, Create/Edit Modal Form).
    *   **Storage Backends:** (Filesystem, C-STORE, GCS, Google Healthcare, STOW-RS)
        *   Table for listing.
        *   **Refactored Create/Edit Modal:** Uses conditional fields based on backend type (no more JSON blob!), includes TLS options for C-STORE. Uses RHF/Zod for validation.
    *   **Crosswalk:**
        *   Data Sources (Table, Create/Edit Modal, Test Connection, Trigger Sync).
        *   Mappings (Table, Create/Edit Modal).
*   **Rule Engine Management:**
    *   List Rulesets with status toggles, edit, delete.
    *   Create/Edit Ruleset properties via modal.
    *   View/Manage Rules within a Ruleset.
    *   Create/Edit Rules via modal form (Basic Info, Sources, Schedule, Match Criteria, Association Criteria, Tag Modifications, Destinations).
*   **User Profile Management:**
    *   API Key management (`/api-keys`): List, Create, Delete.
    *   User Settings page (placeholder).
*   **Admin Section:**
    *   User Management (`/admin/users`): List users, view/manage roles, toggle active status. (**Needs UI for superuser flag**).
    *   Configuration pages mentioned above.
*   **Data Browser:**
    *   Query interface to search configured/enabled DICOMweb, DIMSE Q/R, and **Google Healthcare** sources.
    *   **Multi-source query support:** Select multiple sources via dropdown checkboxes. Queries run in parallel.
    *   Displays aggregated results in a sortable, paginated table. Handles partial failures and displays errors/messages from individual sources.
*   **UI Components:** Uses Shadcn UI primitives, Tailwind CSS, Lucide React icons, Sonner toasts.
*   **State Management:** TanStack Query for server state, React hooks for local UI state.
*   **Theming:** Light/Dark mode toggle.

## Tech Stack

*   **Framework/Library:** React 18+, TypeScript
*   **Build Tool:** Vite
*   **Routing:** React Router DOM v6
*   **Styling:** Tailwind CSS
*   **UI Components:** Shadcn UI
*   **Data Fetching/State:** TanStack Query (React Query) v5
*   **Tables:** TanStack Table (React Table) v8
*   **Forms:** React Hook Form v7, Zod, `@hookform/resolvers`
*   **Notifications:** Sonner
*   **Authentication:** `@react-oauth/google`
*   **Icons:** Lucide React
*   **Date Formatting:** date-fns
*   **JSON Parsing:** json5 (used in API layer for forms)
*   **Linting/Formatting:** ESLint, Prettier (Assumed)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn or pnpm
*   A running instance of the Axiom Flow Backend (configured correctly)

### Installation & Running

1.  **Clone the repository:**
```bash
git clone <your-frontend-repo-url> axiom-flow-ui
cd axiom-flow-ui
```

2.  **Install Dependencies:**
```bash
npm install
```

3.  **Configure Environment:**
    *   Copy example: `cp .env.example .env`
    *   **Edit `.env`:**
        *   `VITE_API_BASE_URL`: Set to the **full URL** of your backend API (e.g., `https://your-domain.com/api/v1`). Ensure protocol (HTTPS recommended) and path are correct.
        *   `VITE_GOOGLE_CLIENT_ID`: Set to the **same Google OAuth Client ID** used in the backend.

4.  **Run Development Server:**
```bash
npm run dev
```
    Access via the URL provided (e.g., `http://localhost:5173`).

5.  **Login:** Use Google Login. Requires backend to be running and correctly configured for CORS and Google OAuth.

## Building for Production

```bash
npm run build
```
This generates static assets in the `dist` directory, ready for deployment. Configure your web server (like Nginx) to serve the `index.html` file for all routes to handle client-side routing.

## Current Status

*   Core features implemented as listed above.
*   Storage backend form refactored away from JSON blob.
*   Google Healthcare source configuration and data browser querying fully integrated.
*   Multi-source data browser query implemented.
*   Scheduling configuration UI implemented and integrated with Rule form.
*   Crosswalk configuration UI implemented.
*   TLS configuration options added to relevant backend/modal forms (DIMSE Listener, DIMSE Q/R Source, C-STORE Storage Backend).

## Next Steps / Future Goals

*   **UI for Superuser Flag:** Add toggle in User Management.
*   **Rule Testing UI:** Interface to test rule matching/modification without sending real data.
*   **Dashboard Enhancements:** More detailed metrics, visualizations.
*   **Crosswalk UI:** Improve schema discovery/field mapping UX.
*   **Testing:** Add component and end-to-end tests (e.g., using Vitest, Playwright/Cypress).
*   **Error Handling:** More granular error display/feedback in UI.
*   **Performance Optimization:** Review large table rendering, bundle sizes.

## Contributing

*(Placeholder)*

## License

*(Placeholder)*
