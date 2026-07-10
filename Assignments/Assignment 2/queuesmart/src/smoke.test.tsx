import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes";

// Smoke test: does the app actually render something at all, at the
// root path, instead of a blank page? This would have caught the
// missing rootRoute component bug before it ever reached a real
// browser.
describe("app boots", () => {
  it("renders the dashboard heading at /", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    }, { timeout: 8000 });
  }, 15000);
});
