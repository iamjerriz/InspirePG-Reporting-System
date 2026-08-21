import { supabase } from "./supabaseClient";

export interface LogRow {
  timestamp: string;
  firstName: string;
  lastName: string;
  sid: string;
  area: string;
  sellerType: string;
  proofFilename: string;
}

export interface StoredLogRow extends LogRow {
  id: number;
}

interface DbRow {
  id: number;
  timestamp: string;
  first_name: string;
  last_name: string;
  sid: string;
  area: string;
  seller_type: string;
  proof_filename: string;
}

const TABLE = "log_entries";

function fromDbRow(row: DbRow): StoredLogRow {
  return {
    id: row.id,
    timestamp: row.timestamp,
    firstName: row.first_name,
    lastName: row.last_name,
    sid: row.sid,
    area: row.area,
    sellerType: row.seller_type,
    proofFilename: row.proof_filename,
  };
}

function toDbRow(row: LogRow) {
  return {
    timestamp: row.timestamp,
    first_name: row.firstName,
    last_name: row.lastName,
    sid: row.sid,
    area: row.area,
    seller_type: row.sellerType,
    proof_filename: row.proofFilename,
  };
}

export async function appendLogRow(row: LogRow): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(toDbRow(row));
  if (error) throw new Error(error.message);
}

export async function readAllLogRows(): Promise<StoredLogRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*").order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbRow[]).map(fromDbRow);
}

export async function readLogRowById(id: number): Promise<StoredLogRow | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDbRow(data as DbRow) : null;
}

export async function updateLogRow(id: number, row: LogRow): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toDbRow(row))
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function deleteLogRow(id: number): Promise<LogRow | null> {
  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDbRow(data as DbRow) : null;
}
