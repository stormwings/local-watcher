import { render, screen } from "@testing-library/react";
import App from "./App.jsx";

vi.mock("@/src/hooks/useWatcher", () => ({
  useWatcher: () => ({
    status: {
      running: false,
      table: "articulos",
      pk: "id_articulo",
      updatedAtCol: null,
      intervalMs: 3000,
      lastTs: null,
      lastId: null,
    },
    logs: [],
    start: vi.fn(),
    stop: vi.fn(),
    openStateDir: vi.fn(),
    testConnection: vi.fn(),
    bridgeAvailable: true,
  }),
}));

test("renders header Watcher", () => {
  render(<App />);
  const heading = screen.getByRole("heading", { name: /watcher/i });
  expect(heading).toBeInTheDocument();
});
