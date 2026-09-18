import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Numeric/code-shaped columns (IDs, counts, timestamps) render in the monospace
   *  token, matching the wireframe's convention for exact/machine data. */
  mono?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyState }: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className="p-8 text-center text-[13.5px] text-text-muted">{emptyState}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border bg-bg-sunken">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3.5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-wide text-text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border last:border-b-0",
                onRowClick && "cursor-pointer hover:bg-bg-elevated",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-3.5 py-2.5", col.mono && "font-mono", col.className)}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
