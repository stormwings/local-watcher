import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPanel from "../SettingsPanel";

describe("SettingsPanel", () => {
  it("calls onTest and shows success message", async () => {
    const mockTest = vi.fn().mockResolvedValue({
      ok: true,
      db: "test",
      table: "articulos",
      tableExists: true,
    });

    render(<SettingsPanel onTest={mockTest} />);

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => {
      expect(mockTest).toHaveBeenCalled();
    });

    expect(screen.getByText(/connection ok/i)).toBeInTheDocument();
    expect(screen.getByText(/DB: test/i)).toBeInTheDocument();
    expect(screen.getByText(/articulos/i)).toBeInTheDocument();
  });

  it("shows error when onTest is not provided", async () => {
    render(<SettingsPanel />);

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    expect(
      await screen.findByText(/Test API not available in this mode\./i)
    ).toBeInTheDocument();
  });
});
