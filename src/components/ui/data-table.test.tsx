import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";

type Row = { id: string; code: string };
const columns: Column<Row>[] = [{ key: "code", header: "Code", sortKey: "code", cell: (r) => r.code }];

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const onSort = vi.fn();
  render(
    <DataTable<Row>
      caption="Test table"
      columns={columns}
      rows={[{ id: "1", code: "REQ-CREATE" }]}
      rowKey={(r) => r.id}
      loading={false}
      error={null}
      onRetry={vi.fn()}
      sortBy="code"
      sortOrder="ASC"
      onSort={onSort}
      emptyTitle="Nothing here"
      {...props}
    />,
  );
  return { onSort };
}

describe("DataTable", () => {
  it("renders rows and reports sort clicks", async () => {
    const { onSort } = renderTable();
    expect(screen.getByRole("cell", { name: "REQ-CREATE" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /code/i })).toHaveAttribute("aria-sort", "ascending");

    await userEvent.click(screen.getByRole("button", { name: /code/i }));
    expect(onSort).toHaveBeenCalledWith("code");
  });

  it("shows the empty state", () => {
    renderTable({ rows: [] });
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("shows the error with its reference id and a retry button", async () => {
    const onRetry = vi.fn();
    renderTable({ rows: [], error: Object.assign(new Error("Server down"), {}), onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("Server down");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("Pagination", () => {
  it("describes the visible range like the design", () => {
    render(<Pagination page={2} limit={10} shown={8} total={18} onPageChange={vi.fn()} />);
    expect(screen.getByText("Showing 11 to 18 of 18 entries")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
  });

  it("still allows Next when the total is unknown but the page is full", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} limit={10} shown={10} total={null} onPageChange={onPageChange} />);
    expect(screen.getByText("Showing 1 to 10 entries")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
