import { BarChart3, Download, Table2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ApiError, adminLogout, checkAdminSession, fetchLogEntries } from "../api/admin";
import AdminLoginForm from "../components/AdminLoginForm";
import AdminLogsTable from "../components/AdminLogsTable";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";
import { useAdminTheme } from "../hooks/useAdminTheme";
import { exportLogEntriesToExcel } from "../lib/exportToExcel";
import type { LogEntry } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const AdminLogsCharts = lazy(() => import("../components/AdminLogsCharts"));

type ViewState = "checking-session" | "login" | "dashboard";
type RecordsView = "table" | "graph";

export default function AdminPage() {
  const { isDark, toggleTheme } = useAdminTheme();
  const [viewState, setViewState] = useState<ViewState>("checking-session");
  const [recordsView, setRecordsView] = useState<RecordsView>("table");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportableEntries, setExportableEntries] = useState<LogEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportLogEntriesToExcel(exportableEntries);
    } finally {
      setIsExporting(false);
    }
  }

  const loadEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    setLoadError(null);
    try {
      const rows = await fetchLogEntries();
      setEntries(rows);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setViewState("login");
        return;
      }
      setLoadError(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    checkAdminSession().then((authenticated) => {
      setViewState(authenticated ? "dashboard" : "login");
    });
  }, []);

  useEffect(() => {
    if (viewState === "dashboard") {
      loadEntries();
    }
  }, [viewState, loadEntries]);

  async function handleLogout() {
    await adminLogout();
    setEntries([]);
    setViewState("login");
  }

  if (viewState === "checking-session") {
    return (
      <div className={`admin-theme ${isDark ? "dark" : ""}`}>
        <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (viewState === "login") {
    return (
      <div className={`admin-theme ${isDark ? "dark" : ""}`}>
        <AdminLoginForm
          onLoggedIn={() => setViewState("dashboard")}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>
    );
  }

  return (
    <div className={`admin-theme ${isDark ? "dark" : ""}`}>
      <div className="min-h-[100dvh] bg-background pb-10">
        <div className="sticky top-0 z-10 bg-brand-navy shadow-md dark:bg-slate-900">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:max-w-7xl xl:px-8 2xl:max-w-[1600px]">
            <div className="flex items-center gap-3">
              <BrandMark
                iconClassName="h-8 sm:h-9"
                wordmarkClassName="text-sm text-white sm:text-base"
                taglineClassName="text-white/70"
              />
            </div>
            <div className="flex gap-2">
              <ThemeToggle
                isDark={isDark}
                onToggle={toggleTheme}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadEntries}
                disabled={isLoadingEntries}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                {isLoadingEntries ? "Refreshing..." : "Refresh"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 xl:max-w-7xl xl:px-8 2xl:max-w-[1600px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportableEntries.length === 0 || isExporting}
              onClick={handleExport}
              className="dark:text-white"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export to Excel"}
            </Button>

            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setRecordsView("table")}
                aria-pressed={recordsView === "table"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  recordsView === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="h-4 w-4" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setRecordsView("graph")}
                aria-pressed={recordsView === "graph"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  recordsView === "graph"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                Graph
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-4 sm:p-6 xl:p-8">
              {loadError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {loadError}
                </div>
              ) : isLoadingEntries && entries.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Loading records...</p>
              ) : recordsView === "table" ? (
                <AdminLogsTable
                  entries={entries}
                  onChanged={loadEntries}
                  onVisibleEntriesChange={setExportableEntries}
                />
              ) : (
                <Suspense
                  fallback={<p className="py-8 text-center text-muted-foreground">Loading charts...</p>}
                >
                  <AdminLogsCharts entries={entries} />
                </Suspense>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
