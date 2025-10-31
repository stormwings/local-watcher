import { render, screen } from "@testing-library/react";
import Header from "../Header";

describe("Header", () => {
  it("renders title and subtitle", () => {
    render(<Header />);

    expect(
      screen.getByRole("heading", { name: /watcher/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/MySQL → HTTP bridge with HMAC and state\.json/i)
    ).toBeInTheDocument();
  });
});
