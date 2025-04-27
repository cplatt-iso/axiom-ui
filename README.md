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
        *   DIMSE Q/R Sources (Table, Create/Edit Modal Form with RHF/Zod).
    *   **Listeners:**
        *   DIMSE Listeners (Table, Create/Edit Modal Form with RHF/Zod).
        *   STOW-RS Endpoint (Informational Page).
        *   JSON API Endpoint (Informational Page).
    *   **Schedules:** (New!)
        *   Reusable time-based schedules (Table, Create/Edit Modal Form with dynamic time range management).
    *   **Storage Backends:** (Filesystem, C-STORE, GCS, Google Healthcare, STOW-RS) (Table, Create/Edit Modal Form with RHF/Zod).
    *   **Crosswalk:**
        *   Data Sources (Table, Create/Edit Modal Form with RHF/Zod, Test Connection, Trigger Sync).
        *   Mappings (Table, Create/Edit Modal Form with RHF/Zod).
*   **Rule Engine Management:**
    *   List Rulesets (`/rulesets`) with status toggles, edit links, delete actions.
    *   Create/Edit Ruleset properties via modal.
    *   View/Manage Rules within a Ruleset (`/rulesets/:rulesetId`).
    *   Create/Edit Rules via a refactored modal form:
        *   Basic Info (Name, Desc, Priority, Active).
        *   Applicable Source selection (multi-select Listbox with type indicators).
        *   **Schedule selection (Dropdown linking to configured Schedules).**
        *   Match Criteria definition (dynamic list).
        *   Association Criteria definition (dynamic list).
        *   Tag Modifications (dynamic list supporting all actions including `crosswalk` with map selection).
        *   Destination selection (multi-checkbox).
*   **User Profile Management:**
    *   API Key management (`/api-keys`): List, Create (shows key once), Delete.
    *   User Settings page (placeholder).
*   **Admin Section:**
    *   User Management (`/admin/users`): List users, view roles, toggle active status, manage roles via modal.
    *   Configuration pages mentioned above.
*   **UI Components:** Uses Shadcn UI primitives, Tailwind CSS for styling, Lucide React and Heroicons for icons, Sonner for toast notifications.
*   **State Management:** TanStack Query for server state caching and synchronization. Local UI state managed with `useState`, `useCallback`, etc.
*   **Theming:** Light/Dark mode toggle using Tailwind CSS and localStorage.

## Tech Stack

*   **Framework/Library:** React 18+, TypeScript
*   **Build Tool:** Vite
*   **Routing:** React Router DOM v6
*   **Styling:** Tailwind CSS, CSS Modules (via Shadcn UI)
*   **UI Components:** Shadcn UI
*   **Data Fetching/State:** TanStack Query (React Query) v5
*   **Tables:** TanStack Table (React Table) v8
*   **Forms:** React Hook Form v7, Zod (for schema validation), `@hookform/resolvers`
*   **Notifications:** Sonner
*   **Authentication:** `@react-oauth/google`
*   **Icons:** Lucide React, Heroicons
*   **Date Formatting:** date-fns
*   **Linting/Formatting:** ESLint, Prettier (Assumed based on standard setup)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn or pnpm
*   A running instance of the [Axiom Flow Backend](<link-to-your-backend-repo-or-docs>)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone <your-frontend-repo-url> axiom-flow-ui
    cd axiom-flow-ui
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```

3.  **Configure Environment:**
    *   Copy the example environment file: `cp .env.example .env`
    *   **Edit `.env`:**
        *   `VITE_API_BASE_URL`: Set this to the **full URL** of your running Axiom Flow backend API (e.g., `http://localhost:8001/api/v1` if running backend locally with default port mapping).
        *   `VITE_GOOGLE_CLIENT_ID`: Set this to the **same Google OAuth Client ID** used in the backend configuration. This is required for the Google Login button.

4.  **Run the Development Server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    # or
    # pnpm dev
    ```
    This will start the Vite development server, typically at `http://localhost:3000` or the next available port. Open this URL in your browser.

5.  **Login:** Use the Google Login button. You should be redirected to Google and then back to the application dashboard upon successful authentication with the backend.

## Building for Production

```bash
npm run build
# or
# yarn build
# or
# pnpm build
