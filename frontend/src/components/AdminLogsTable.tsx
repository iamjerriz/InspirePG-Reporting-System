import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteLogEntry } from "../api/admin";
import { AREAS, sellerTypesByArea, type Area } from "../config/sellerTypes";
import type { LogEntry } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import EditRecordModal from "./EditRecordModal";
import ProofImageDialog from "./ProofImageDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AdminLogsTableProps {
  entries: LogEntry[];
  onChanged: () => void;
  onVisibleEntriesChange?: (entries: LogEntry[]) => void;
}

type SortColumn = keyof Pick<
  LogEntry,
  "timestamp" | "firstName" | "lastName" | "sid" | "area" | "sellerType"
>;
type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "timestamp", label: "Timestamp" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "sid", label: "SID" },
  { key: "area", label: "Area" },
  { key: "sellerType", label: "Seller Type" },
];

const ALL_SELLER_TYPES = Array.from(
  new Set(Object.values(sellerTypesByArea).flat())
).sort((a, b) => a.localeCompare(b));

const ALL_VALUE = "__all__";
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function ProofButton({ entry, onView }: { entry: LogEntry; onView: () => void }) {
  if (!entry.proofFilename) {
    return <span className="text-muted-foreground">No proof</span>;
  }
  return (
    <button
      type="button"
      onClick={onView}
      className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 hover:underline"
    >
      View proof
      <Eye className="h-3.5 w-3.5" />
    </button>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onEdit}
        aria-label="Edit record"
        title="Edit record"
        className="h-8 w-8 hover:border-primary/50 hover:text-primary"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onDelete}
        aria-label="Delete record"
        title="Delete record"
        className="h-8 w-8 hover:border-destructive/40 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function AdminLogsTable({ entries, onChanged, onVisibleEntriesChange }: AdminLogsTableProps) {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<Area | "">("");
  const [sellerTypeFilter, setSellerTypeFilter] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LogEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<LogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sellerTypeOptions = areaFilter ? sellerTypesByArea[areaFilter] : ALL_SELLER_TYPES;

  function handleAreaFilterChange(value: string) {
    setAreaFilter(value === ALL_VALUE ? "" : (value as Area));
    setSellerTypeFilter("");
  }

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function openDeleteDialog(entry: LogEntry) {
    setDeleteError(null);
    setDeletingEntry(entry);
  }

  async function confirmDelete() {
    if (!deletingEntry) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteLogEntry(deletingEntry.id);
      setDeletingEntry(null);
      onChanged();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete this record.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSaved() {
    setEditingEntry(null);
    onChanged();
  }

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = entries.filter((entry) => {
      if (areaFilter && entry.area !== areaFilter) return false;
      if (sellerTypeFilter && entry.sellerType !== sellerTypeFilter) return false;
      if (!query) return true;
      return (
        entry.firstName.toLowerCase().includes(query) ||
        entry.lastName.toLowerCase().includes(query) ||
        entry.sid.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const result = a[sortColumn].localeCompare(b[sortColumn], undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [entries, search, areaFilter, sellerTypeFilter, sortColumn, sortDirection]);

  // Reset back to page 1 whenever the filtered set or page size changes, so
  // pagination never strands the reader on a now-out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [search, areaFilter, sellerTypeFilter, pageSize]);

  // Report the filtered/sorted set up to the parent so a toolbar control
  // outside this component (e.g. an Export button) can act on exactly what's
  // currently shown here, without owning the filter state itself.
  useEffect(() => {
    onVisibleEntriesChange?.(visibleEntries);
  }, [visibleEntries, onVisibleEntriesChange]);

  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleEntries.slice(start, start + pageSize);
  }, [visibleEntries, currentPage, pageSize]);

  const rangeStart = visibleEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, visibleEntries.length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <Label htmlFor="search" className="mb-1.5 block">
            Search
          </Label>
          <Input
            id="search"
            type="text"
            placeholder="Name or SID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
        </div>

        <div>
          <Label htmlFor="areaFilter" className="mb-1.5 block">
            Area
          </Label>
          <Select value={areaFilter || ALL_VALUE} onValueChange={handleAreaFilterChange}>
            <SelectTrigger id="areaFilter" className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All Areas</SelectItem>
              {AREAS.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sellerTypeFilter" className="mb-1.5 block">
            Seller Type
          </Label>
          <Select
            value={sellerTypeFilter || ALL_VALUE}
            onValueChange={(value) => setSellerTypeFilter(value === ALL_VALUE ? "" : value)}
          >
            <SelectTrigger id="sellerTypeFilter" className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All Seller Types</SelectItem>
              {sellerTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {visibleEntries.length} of {entries.length} record{entries.length === 1 ? "" : "s"}
      </p>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {pagedEntries.length === 0 ? (
          <p className="rounded-xl border border-border bg-muted/40 py-8 text-center text-muted-foreground">
            No matching records.
          </p>
        ) : (
          pagedEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.firstName} {entry.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">SID: {entry.sid}</p>
                </div>
                <Badge variant="accent">{entry.area}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Seller Type</dt>
                <dd className="text-right text-foreground">{entry.sellerType}</dd>
                <dt className="text-muted-foreground">Timestamp</dt>
                <dd className="text-right text-foreground">{entry.timestamp}</dd>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                <ProofButton entry={entry} onView={() => setViewingEntry(entry)} />
                <RowActions onEdit={() => setEditingEntry(entry)} onDelete={() => openDeleteDialog(entry)} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden rounded-xl border border-border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column.key}>
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {column.label}
                    {sortColumn === column.key && (
                      <span aria-hidden="true">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </button>
                </TableHead>
              ))}
              <TableHead>Proof</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 2} className="py-8 text-center text-muted-foreground">
                  No matching records.
                </TableCell>
              </TableRow>
            ) : (
              pagedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.timestamp}</TableCell>
                  <TableCell>{entry.firstName}</TableCell>
                  <TableCell>{entry.lastName}</TableCell>
                  <TableCell>{entry.sid}</TableCell>
                  <TableCell>{entry.area}</TableCell>
                  <TableCell>{entry.sellerType}</TableCell>
                  <TableCell>
                    <ProofButton entry={entry} onView={() => setViewingEntry(entry)} />
                  </TableCell>
                  <TableCell>
                    <RowActions onEdit={() => setEditingEntry(entry)} onDelete={() => openDeleteDialog(entry)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {rangeStart}–{rangeEnd} of {visibleEntries.length}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {editingEntry && (
        <EditRecordModal entry={editingEntry} onClose={() => setEditingEntry(null)} onSaved={handleSaved} />
      )}

      {deletingEntry && (
        <ConfirmDialog
          title="Delete this record?"
          message="Are you sure you want to delete this record? This action cannot be undone."
          confirmLabel="Delete"
          isDanger
          isLoading={isDeleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingEntry(null)}
        />
      )}

      <ProofImageDialog entry={viewingEntry} onClose={() => setViewingEntry(null)} />
    </div>
  );
}
