# AI Rules for KudiGuard Application

This document outlines the core technologies used in the KudiGuard application and provides guidelines for using specific libraries.

## Tech Stack Overview

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

## Library Usage Guidelines

To maintain consistency and leverage the strengths of our chosen libraries, please adhere to the following rules:

*   **UI Components**: Always use components from `shadcn/ui` (e.g., `Button`, `Card`, `Input`, `Label`, `Dialog`, `Toast`) for all user interface elements. If a required component is not available in `shadcn/ui`, create a new, small component in `src/components/` and style it with Tailwind CSS.
*   **Styling**: All styling must be done using **Tailwind CSS** utility classes. Avoid inline styles or separate CSS files for components.
*   **Icons**: Use **Lucide React** for all icons. Import them directly from `lucide-react`.
*   **Routing**: Use **React Router DOM** for all navigation within the application. Define routes in `src/App.tsx`.
*   **Form Handling**: For any forms, use **React Hook Form** for state management and validation.
*   **Schema Validation**: Pair **Zod** with React Hook Form for defining validation schemas.
*   **Data Fetching**: For managing server state and data fetching, utilize **React Query**.
*   **Notifications**: For displaying temporary messages to the user (e.g., success, error, info), use the `useToast` hook from `src/hooks/use-toast.ts`.
*   **Utility Functions**: Use the `cn` utility function from `src/lib/utils.ts` for conditionally combining Tailwind CSS classes.
*   **Mobile Responsiveness**: All components and layouts must be designed to be fully responsive across different screen sizes, utilizing Tailwind's responsive utilities.