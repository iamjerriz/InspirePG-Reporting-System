import type { LogEntry } from "../types";

// Write-only usage (json_to_sheet + writeFile on our own in-memory data) -
// never parses an external .xlsx file, so this doesn't hit the known SheetJS
// prototype-pollution/ReDoS advisories, which are both parse-side.
//
// Dynamically imported so the (fairly heavy) xlsx library only loads when an
// admin actually clicks "Export to Excel", instead of bloating the main
// bundle every visitor pays for.
export async function exportLogEntriesToExcel(entries: LogEntry[]): Promise<void> {
  const XLSX = await import("xlsx");

  const rows = entries.map((entry) => ({
    Timestamp: entry.timestamp,
    "First Name": entry.firstName,
    "Last Name": entry.lastName,
    SID: entry.sid,
    Area: entry.area,
    "Seller Type": entry.sellerType,
    "Proof File": entry.proofFilename || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 19 }, // Timestamp
    { wch: 14 }, // First Name
    { wch: 14 }, // Last Name
    { wch: 16 }, // SID
    { wch: 16 }, // Area
    { wch: 18 }, // Seller Type
    { wch: 32 }, // Proof File
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "OOP Login Records");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `oop-login-records_${today}.xlsx`);
}
