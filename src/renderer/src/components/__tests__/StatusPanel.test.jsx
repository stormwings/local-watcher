import { render, screen, within } from "@testing-library/react";
import StatusPanel from "../StatusPanel";
import { makeStatus } from "@/test";

test("renders StatusPanel with provided status", () => {
  const status = makeStatus();

  render(<StatusPanel status={status} />);

  expect(screen.getByText(/articulos/i)).toBeInTheDocument();
  expect(screen.getByText(/id_articulo/i)).toBeInTheDocument();
  expect(screen.getByText(/updated_at/i)).toBeInTheDocument();
  expect(screen.getByText(/3000 ms/i)).toBeInTheDocument();
  expect(screen.getByText(/2025-10-31 10:00:00/i)).toBeInTheDocument();
  expect(screen.getByText(/123/i)).toBeInTheDocument();
});

test("renders StatusPanel with default values when no status is provided", () => {
  render(<StatusPanel />);

  const tableRow = screen.getByText(/table:/i).closest("div");
  expect(within(tableRow).getByText("-")).toBeInTheDocument();

  const pkRow = screen.getByText(/primary key:/i).closest("div");
  expect(within(pkRow).getByText("-")).toBeInTheDocument();

  const updatedRow = screen.getByText(/updated-at column:/i).closest("div");
  expect(within(updatedRow).getByText("—")).toBeInTheDocument();

  const intervalRow = screen.getByText(/interval:/i).closest("div");
  expect(within(intervalRow).getByText(/0 ms/i)).toBeInTheDocument();

  const tsRow = screen.getByText(/last timestamp:/i).closest("div");
  expect(within(tsRow).getByText("—")).toBeInTheDocument();

  const idRow = screen.getByText(/last id:/i).closest("div");
  expect(within(idRow).getByText("—")).toBeInTheDocument();
});
