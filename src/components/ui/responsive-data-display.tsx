import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface ColumnDef<T> {
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  className?: string
  mobileLabel?: string // Label to show in card view
  hiddenOnMobile?: boolean // Hide this column on mobile cards
}

interface ResponsiveDataDisplayProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  getRowKey: (row: T, index: number) => string | number
  emptyMessage?: string
  className?: string
  cardClassName?: string
  tableClassName?: string
  mobileCardTitle?: (row: T) => React.ReactNode // Main title for mobile card
  onRowClick?: (row: T) => void
}

export function ResponsiveDataDisplay<T>({
  data,
  columns,
  getRowKey,
  emptyMessage = "No data available",
  className,
  cardClassName,
  tableClassName,
  mobileCardTitle,
  onRowClick,
}: ResponsiveDataDisplayProps<T>) {
  const isMobile = useIsMobile()

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  if (isMobile) {
    // Card view for mobile
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((row, index) => (
          <Card
            key={getRowKey(row, index)}
            className={cn(
              "transition-all hover:shadow-md",
              onRowClick && "cursor-pointer",
              cardClassName
            )}
            onClick={() => onRowClick?.(row)}
          >
            {mobileCardTitle && (
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {mobileCardTitle(row)}
                </CardTitle>
              </CardHeader>
            )}
            <CardContent className={cn(mobileCardTitle ? "pt-0" : "pt-4")}>
              <div className="space-y-2">
                {columns
                  .filter(col => !col.hiddenOnMobile)
                  .map((column, colIndex) => {
                    const value = column.cell
                      ? column.cell(row)
                      : column.accessorKey
                      ? String(row[column.accessorKey] ?? "")
                      : null

                    if (!value) return null

                    return (
                      <div
                        key={colIndex}
                        className="flex justify-between items-start gap-2 py-1 border-b border-border/50 last:border-0"
                      >
                        <span className="text-xs font-medium text-muted-foreground min-w-[100px]">
                          {column.mobileLabel || column.header}
                        </span>
                        <div className="text-sm text-right flex-1">
                          {value}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Table view for desktop
  return (
    <div className={cn("rounded-md border", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={getRowKey(row, index)}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={column.className}>
                  {column.cell
                    ? column.cell(row)
                    : column.accessorKey
                    ? String(row[column.accessorKey] ?? "")
                    : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
