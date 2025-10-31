import { render, screen } from "@testing-library/react";
import LogsPanel from "../LogsPanel";

describe("LogsPanel", () => {
  it("renders empty state when there are no logs", () => {
    render(<LogsPanel logs={[]} />);
    expect(screen.getByText(/no logs yet…/i)).toBeInTheDocument();
  });

  it("renders log lines when logs are provided", () => {
    const logs = ["[10:00:00] Watching articulos", "[10:00:01] POST ok 200"];
    render(<LogsPanel logs={logs} />);

    expect(
      screen.getByText(/\[10:00:00] Watching articulos/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/\[10:00:01] POST ok 200/i)).toBeInTheDocument();
  });
});
