# Axiom Flow - Frontend

React-based user interface for configuring and monitoring the Axiom Flow DICOM processing backend.

## Features

*   **Dashboard:** View the real-time status of core backend components (Database, Broker, API, Workers), DIMSE Listeners, DICOMweb Pollers, DIMSE Q/R Pollers, and Crosswalk sync jobs. Includes key metrics like counts for received/processed items.
*   **Configuration Management:**
    *   **Rulesets & Rules:** Create, view, edit, delete, activate/deactivate rulesets and the rules within them. Define complex matching criteria (tags, association info) and tag modifications (set, delete, copy, move, crosswalk, etc.). Link rules to storage destinations.
    *   **DICOMweb Sources:** Configure sources for QIDO-RS polling.
    *   **DIMSE Listeners:** Configure C-STORE SCP listener instances.
    *   **DIMSE Q/R Sources:** Configure remote peers for C-FIND polling and C-MOVE retrieval.
    *   **Storage Backends:** Define output destinations (Filesystem, C-STORE, GCS, Google Healthcare, STOW-RS).
    *   **Crosswalk:** Configure external database Data Sources (MySQL, Postgres, MSSQL) and Mappings for tag value lookups/replacements. Includes connection testing and manual sync triggering.
*   **User & Access Management:**
    *   **API Keys:** Create, view, and delete API keys for programmatic access.
    *   **User Management (Admin):** View users, manage active status, assign/remove roles (Admin/User).
*   **Authentication:** Secure login via Google OAuth 2.0.
*   **Theme:** Light/Dark mode toggle.
*   **Notifications:** Uses Sonner for toast notifications for actions like create, update, delete, errors.

## Technology Stack

*   **Framework:** React (using Vite)
*   **Language:** TypeScript
*   **UI Components:** Shadcn UI (built on Radix UI & Tailwind CSS)
*   **State Management:** React Context (for Auth), TanStack Query (for server state caching/fetching)
*   **Forms:** React Hook Form + Zod (for validation)
*   **Tables:** TanStack Table
*   **Routing:** React Router
*   **Notifications:** Sonner
*   **Icons:** Lucide React, Heroicons

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A running instance of the Axiom Flow Backend API.

### Installation & Running

1.  **Clone the repository:**
    ```bash
    # git clone ... (if separate repo)
    cd axiom-flow-ui
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment:**
    *   Copy the example environment file: `cp .env.example .env`
    *   **Edit `.env`:**
        *   `VITE_API_BASE_URL`: Set this to the URL where your Axiom Flow backend API is accessible (e.g., `http://localhost:8001/api/v1` if running backend locally via Docker Compose defaults).
        *   `VITE_GOOGLE_CLIENT_ID`: **Required.** Paste the Google OAuth Client ID obtained from Google Cloud Console. This *must* match the ID used by the backend for token validation.
    *   **DO NOT** commit your actual `.env` file.

4.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the Vite development server, typically on `http://localhost:5173`.

5.  **Build for Production:**
    ```bash
    npm run build
    # or
    yarn build
    ```
    This creates a production-ready build in the `dist` folder.

## Usage

1.  Open the application URL in your browser.
2.  Click "Sign In" and use the Google Login button. Authenticate with a Google account recognized by the backend.
3.  Navigate using the sidebar to view the Dashboard or manage configurations (Rulesets, Inputs, Outputs, Crosswalk, Users, API Keys).

## Current Status

*   Dashboard displays status for core components and detailed widgets for pollers and listeners.
*   Full CRUD UI implemented for Rulesets, Rules (including Crosswalk action), DICOMweb Sources, DIMSE Listeners, DIMSE Q/R Sources, Storage Backends, Crosswalk Data Sources, Crosswalk Mappings, API Keys, and User Roles/Status (Admin only).
*   Authentication flow via Google Login is functional.
*   Theme toggle implemented.

## Next Steps / Future Goals

*   Implement UI for GCS Polling configuration.
*   Add GCS Polling status widget to Dashboard.
*   Implement UI elements related to IP address matching in Association Criteria.
*   Refine Crosswalk Mapping UI (e.g., potentially add DB schema discovery helpers instead of pure JSON input).
*   Enhance Dashboard visualizations (charts, graphs).
*   Add more detailed error reporting and user feedback.
*   Develop frontend test suite (Vitest/RTL).

## Contributing

*(Placeholder: Contribution guidelines will be added here.)*

## License

*(Placeholder: MIT or Apache 2.0 recommended.)*
