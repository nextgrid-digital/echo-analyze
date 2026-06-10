import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { HoldingsColumnDef, HoldingsSortKey } from "./holdingsTableUtils"

interface HoldingsTableHeaderFilterProps {
  column: HoldingsColumnDef
  options: string[]
  value: string[]
  onValueChange: (value: string[]) => void
  filterLabel?: string
  sortKey: HoldingsSortKey | null
  sortDir: "asc" | "desc"
  onSort: (key: HoldingsSortKey) => void
}

export function HoldingsTableHeaderFilter({
  column,
  options,
  value,
  onValueChange,
  filterLabel,
  sortKey,
  sortDir,
  onSort,
}: HoldingsTableHeaderFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [open, setOpen] = useState(false)

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => option.toLowerCase().includes(query))
  }, [options, searchQuery])

  if (!column.key) return column.label

  const label = filterLabel ?? column.label
  const isSortActive = sortKey === column.key
  const isFilterActive = value.length > 0

  const toggleOption = (option: string) => {
    onValueChange(
      value.includes(option) ? value.filter((v) => v !== option) : [...value, option]
    )
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setSearchQuery("")
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        column.align === "right" && "justify-end"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "-ml-2 h-8 px-2 font-medium hover:bg-transparent",
          column.align === "right" && "-mr-1 ml-0"
        )}
        onClick={() => onSort(column.key!)}
        aria-sort={isSortActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      >
        {column.label}
        {isSortActive &&
          (sortDir === "asc" ? (
            <ArrowUp className="ml-1 size-3.5" aria-hidden />
          ) : (
            <ArrowDown className="ml-1 size-3.5" aria-hidden />
          ))}
      </Button>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "relative h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
              isFilterActive && "text-primary"
            )}
            aria-label={
              isFilterActive
                ? `Filter ${label}, ${value.length} selected`
                : `Filter ${label}`
            }
          >
            <ChevronDown className="size-3.5" aria-hidden />
            {isFilterActive && (
              <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
                {value.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="p-2 pb-0">
            <DropdownMenuLabel className="px-0 py-1 text-xs font-normal text-muted-foreground">
              Select one or more
            </DropdownMenuLabel>
            <Input
              type="search"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="h-8"
              aria-label={`Search ${label}`}
            />
          </div>
          {isFilterActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-muted-foreground"
                onSelect={() => onValueChange([])}
              >
                Clear selection
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matches</p>
            ) : (
              filteredOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={value.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {option}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
