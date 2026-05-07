"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
};

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No results.",
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <THead>
          {table.getHeaderGroups().map((hg) => (
            <TR key={hg.id}>
              {hg.headers.map((h) => (
                <TH key={h.id}>
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </TH>
              ))}
            </TR>
          ))}
        </THead>
        <TBody>
          {table.getRowModel().rows.length === 0 ? (
            <TR>
              <TD colSpan={columns.length} className="text-center text-muted-foreground">
                {emptyMessage}
              </TD>
            </TR>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TR
                key={row.id}
                className={[
                  onRowClick ? "cursor-pointer" : "",
                  getRowClassName ? getRowClassName(row.original) : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TD key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TD>
                ))}
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
