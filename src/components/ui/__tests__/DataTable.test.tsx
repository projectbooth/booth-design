import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../DataTable";

interface Row {
  id: string;
  name: string;
}

describe("DataTable", () => {
  const rows: Row[] = [
    { id: "1", name: "orders" },
    { id: "2", name: "customers" },
  ];
  const columns = [{ key: "name", header: "Name", render: (r: Row) => r.name }];

  it("renders one row per item", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText("orders")).toBeInTheDocument();
    expect(screen.getByText("customers")).toBeInTheDocument();
  });

  it("shows the empty state instead of a table when there are no rows", () => {
    render(
      <DataTable columns={columns} rows={[]} rowKey={(r: Row) => r.id} emptyState="Nothing here" />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("calls onRowClick with the clicked row", async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText("customers"));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
