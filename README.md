# Welcome to KudiGuard

## Project Info

**KudiGuard** is your dedicated AI financial advisor, built to help small business owners in Nigeria make smarter, data-driven decisions for sustainable growth.

## Getting Started

This project is a React application bootstrapped with Vite, using TypeScript and Tailwind CSS. To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have Node.js and npm (or Yarn/Bun) installed on your machine. We recommend using `nvm` for managing Node.js versions.

*   **Node.js**: [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
*   **npm**: Usually comes with Node.js.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <YOUR_GIT_URL>
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd <YOUR_PROJECT_NAME>
    ```
3.  **Install dependencies:**
    ```sh
    npm install
    # or yarn install
    # or bun install
    ```
4.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project based on `.env.example` (if provided) and fill in your Supabase credentials and any other necessary API keys.
    ```
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```

### Running the Application

To start the development server:

```sh
npm run dev
# or yarn dev
# or bun dev
```

This will start the application, typically accessible at `http://localhost:8080` (or another port if 8080 is in use).

### Building for Production

To build the application for production:

```sh
npm run build
# or yarn build
# or bun build
```

This will compile the project into the `dist` directory, ready for deployment.

## What technologies are used for this project?

This project is built with a modern and robust tech stack:

*   **Frontend Framework**: React (with Vite for fast development)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS for utility-first styling
*   **UI Components**: shadcn/ui (built on Radix UI) for accessible and customizable UI components
*   **Routing**: React Router DOM for client-side navigation
*   **Icons**: Lucide React for vector icons
*   **Form Management**: React Hook Form for robust form handling
*   **Schema Validation**: Zod for defining and validating data schemas
*   **Data Fetching/State Management**: React Query for server state management
*   **Toasts/Notifications**: Custom `useToast` hook (built on Radix UI Toast) and Sonner for user feedback.
*   **Backend/Database**: Supabase for authentication, database, and edge functions.

## Project Structure

The project follows a standard React application structure:

*   `src/`: Contains all source code.
    *   `assets/`: Static assets like images.
    *   `components/`: Reusable UI components.
        *   `ui/`: shadcn/ui components.
        *   `auth/`: Authentication-related components and context.
    *   `hooks/`: Custom React hooks.
    *   `integrations/`: Integrations with external services (e.g., Supabase client).
    *   `layouts/`: Layout components for different parts of the application.
    *   `lib/`: Utility functions and configurations.
    *   `pages/`: Top-level page components.
    *   `types/`: TypeScript type definitions.
*   `supabase/`: Supabase Edge Functions.
    *   `functions/`: Individual Edge Functions.
*   `public/`: Publicly accessible static files.
*   `tailwind.config.ts`, `postcss.config.js`: Tailwind CSS configuration.
*   `vite.config.ts`: Vite build tool configuration.
*   `package.json`: Project dependencies and scripts.

## Contributing

Feel free to fork the repository, make changes, and submit pull requests. Please ensure your code adheres to the existing style and conventions.

## License

[Specify your project's license here, e.g., MIT License]