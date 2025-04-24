# Axiom Flow - Frontend

This repository contains the web user interface for the Axiom Flow DICOM processing and routing system. It interacts with the Axiom Flow backend API.

## Features

*   **Dashboard:** View system component status (Database, Broker, Workers, Listeners) and status/metrics for configured DICOMweb Pollers, DIMSE Listeners, and DIMSE Q/R Sources.
*   **Configuration Management:**
    *   Create, Read, Update, Delete (CRUD) RuleSets.
    *   CRUD Rules within RuleSets, including defining match criteria, tag modifications, and selecting pre-configured Storage Backend destinations.
    *   CRUD DICOMweb Source configurations for polling.
    *   CRUD DIMSE Listener (C-STORE SCP) configurations.
    *   CRUD DIMSE Query/Retrieve Source configurations.
    *   CRUD Storage Backend configurations (Filesystem, C-STORE, GCS, Google Healthcare, STOW-RS).
*   **User Management (Admin):** View users, manage user roles, activate/deactivate users.
*   **API Key Management:** Create and delete personal API keys for programmatic access.
*   **Authentication:** Login via Google OAuth.
*   **Authorization:** Role-Based Access Control hides/disables admin sections for non-admin users.
*   **Theming:** Light/Dark mode toggle.
*   **Responsive:** Basic responsiveness for different screen sizes.

## Technology Stack

*   **Framework:** React (Vite)
*   **UI Components:** Shadcn UI, Tailwind CSS, Headless UI
*   **Routing:** React Router DOM
*   **State Management:** React Context API (for Auth), TanStack Query (React Query) (for server state, caching, background refresh)
*   **Forms:** React Hook Form, Zod (for validation), @hookform/resolvers
*   **Tables:** TanStack Table (React Table)
*   **Notifications:** Sonner (Toast notifications)
*   **Authentication:** @react-oauth/google
*   **Icons:** Lucide React, Heroicons
*   **Language:** TypeScript

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended, e.g., v18 or v20)
*   npm or yarn
*   A running instance of the [Axiom Flow Backend](https://github.com/[YourUsername]/axiom_backend)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/[YourUsername]/axiom_frontend.git # Or your repo name
    cd axiom_frontend
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file:
        *   `VITE_API_BASE_URL`: Set this to the **full URL** of your running Axiom Flow backend API (e.g., `http://localhost:8001/api/v1` for local Docker Compose, or `https://your-backend.com/api/v1` for deployment). **Use HTTPS if your backend/frontend are served over HTTPS.**
        *   `VITE_GOOGLE_CLIENT_ID`: Set this to the same Google OAuth Client ID used by the backend.
    *   **DO NOT** commit your actual `.env` file.

4.  **Run Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the Vite development server, typically at `http://localhost:3000` (check terminal output).

5.  **Build for Production:**
    ```bash
    npm run build
    # or
    yarn build
    ```
    This creates a `dist` folder with optimized static assets ready for deployment.

## Usage

1.  Access the running application in your browser (e.g., `http://localhost:3000`).
2.  Log in using the Google Sign-In button.
3.  Navigate using the sidebar to view the dashboard or manage configurations (Admin sections require appropriate user roles assigned via the backend).

## Contributing

*(Placeholder: Contribution guidelines will be added here.)*

## License

*(Placeholder: Choose and add a license, e.g., MIT or Apache 2.0.)*
