# Axiom Flow - Frontend

Web-based user interface for configuring and monitoring the Axiom Flow DICOM processing and routing system backend.

## Features

*   **Dashboard:** View the real-time status of core backend components, DICOMweb pollers, DIMSE listeners, and DIMSE Q/R sources, including basic metrics.
*   **Configuration Management:**
    *   Manage DICOMweb polling sources.
    *   Manage DIMSE C-STORE listener configurations.
    *   Manage DIMSE Q/R source configurations.
    *   Manage Storage Backend destinations (Filesystem, C-STORE, GCS, Google Healthcare, STOW-RS).
    *   Manage RuleSets and Rules (including tag/association matching criteria, tag modifications - set/delete/prepend/suffix/copy/move, and destination linking).
*   **User Management (Admin):** View users and manage role assignments.
*   **API Key Management:** Create and delete personal API keys for programmatic access.
*   **Authentication:** Secure login using Google OAuth 2.0 via `@react-oauth/google`.
*   **Authorization:** Role-based access control restricts access to admin sections.
*   **Theming:** Light/Dark mode toggle with persistence.
*   **Notifications:** User feedback via Sonner toast notifications.

## Technology Stack

*   **Framework:** React 18+ (using Vite)
*   **Language:** TypeScript
*   **UI Components:** Shadcn UI (@radix-ui/react + Tailwind CSS)
*   **Routing:** React Router V6
*   **State Management:** React Context (for Auth), TanStack Query (React Query) v5 (for server state caching/fetching)
*   **Forms:** React Hook Form + Zod (for validation)
*   **Tables:** TanStack Table (React Table) v8
*   **Styling:** Tailwind CSS
*   **Icons:** Heroicons, Lucide React
*   **Notifications:** Sonner
*   **HTTP Client:** Custom wrapper around `fetch` (`apiClient`)
*   **Build Tool:** Vite

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn or pnpm
*   A running instance of the [Axiom Flow Backend](https://github.com/[YourUsername]/axiom_backend) (or your backend repo link).

### Installation

1.  **Clone the repository:**
    ```bash
    # git clone ...
    cd axiom_frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Configuration

1.  **Create `.env` file:** Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
2.  **Edit `.env`:**
    *   **`VITE_GOOGLE_CLIENT_ID`**: **Required.** Obtain this from your Google Cloud Console project credentials (OAuth 2.0 Client ID for Web application). Ensure the authorized JavaScript origins and redirect URIs are correctly configured in Google Cloud Console to include your frontend development URL (e.g., `http://localhost:3000`, `http://127.0.0.1:3000`).
    *   **`VITE_API_BASE_URL`**: **Required.** Set this to the URL where your Axiom Flow backend API is running (e.g., `http://localhost:8001/api/v1` if running the backend locally with default docker-compose ports).

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
