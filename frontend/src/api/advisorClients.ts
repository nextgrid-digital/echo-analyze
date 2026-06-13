import { apiFetch, readJson } from "@/api/client"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase"
import type { AdvisorBookClient } from "@/lib/opportunities/types"
import type { AnalysisResponse } from "@/types/api"

export interface AdvisorClientRow {
  id: string
  user_id: string
  client_pan: string
  client_name: string
  email: string | null
  phone: string | null
  analysis_json: AnalysisResponse
  notes: string
  updated_at: string
}

function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (!value || typeof value !== "object") {
    return false
  }
  const candidate = value as Partial<AnalysisResponse>
  return typeof candidate.success === "boolean" && Array.isArray(candidate.holdings)
}

export function mapAdvisorClientRow(row: AdvisorClientRow): AdvisorBookClient {
  return {
    pan: row.client_pan,
    name: row.client_name,
    email: row.email,
    phone: row.phone,
    analysis: row.analysis_json,
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  }
}

async function requireUserId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.")
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error("Supabase client unavailable.")
  }

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw new Error(error.message)
  }
  if (!data.user?.id) {
    throw new Error("Sign in to sync advisor clients.")
  }
  return data.user.id
}

async function fetchAdvisorClientsViaApi(): Promise<AdvisorBookClient[]> {
  const response = await apiFetch("/api/advisor/clients")
  const payload = await readJson<{ clients?: AdvisorClientRow[]; detail?: string }>(response)
  if (!response.ok || !payload?.clients) {
    throw new Error(payload?.detail ?? "Could not load advisor clients.")
  }

  return payload.clients
    .filter((row): row is AdvisorClientRow => isAnalysisResponse(row.analysis_json))
    .map((row) => mapAdvisorClientRow(row))
}

async function upsertAdvisorClientViaApi(client: AdvisorBookClient): Promise<AdvisorBookClient> {
  const response = await apiFetch("/api/advisor/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_pan: client.pan,
      client_name: client.name,
      email: client.email ?? null,
      phone: client.phone ?? null,
      analysis: client.analysis,
      notes: client.notes ?? "",
      updated_at: client.updatedAt,
    }),
  })
  const payload = await readJson<AdvisorClientRow & { detail?: string }>(response)
  if (!response.ok || !payload || !isAnalysisResponse(payload.analysis_json)) {
    throw new Error(payload?.detail ?? "Could not save client.")
  }
  return mapAdvisorClientRow(payload)
}

async function fetchAdvisorClientsDirect(): Promise<AdvisorBookClient[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) {
    throw new Error(userError.message)
  }
  if (!userData.user) {
    return []
  }

  const { data, error } = await supabase
    .from("advisor_clients")
    .select(
      "id, user_id, client_pan, client_name, email, phone, analysis_json, notes, updated_at"
    )
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .filter((row): row is AdvisorClientRow => isAnalysisResponse(row.analysis_json))
    .map((row) => mapAdvisorClientRow(row as AdvisorClientRow))
}

async function upsertAdvisorClientDirect(client: AdvisorBookClient): Promise<AdvisorBookClient> {
  const userId = await requireUserId()
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error("Supabase client unavailable.")
  }

  const { data, error } = await supabase
    .from("advisor_clients")
    .upsert(
      {
        user_id: userId,
        client_pan: client.pan,
        client_name: client.name,
        email: client.email ?? null,
        phone: client.phone ?? null,
        analysis_json: client.analysis,
        notes: client.notes ?? "",
        updated_at: client.updatedAt,
      },
      { onConflict: "user_id,client_pan" }
    )
    .select(
      "id, user_id, client_pan, client_name, email, phone, analysis_json, notes, updated_at"
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }
  if (!data || !isAnalysisResponse(data.analysis_json)) {
    throw new Error("Could not save client.")
  }

  return mapAdvisorClientRow(data as AdvisorClientRow)
}

export async function fetchAdvisorClients(): Promise<AdvisorBookClient[]> {
  try {
    return await fetchAdvisorClientsViaApi()
  } catch {
    return fetchAdvisorClientsDirect()
  }
}

export async function upsertAdvisorClient(client: AdvisorBookClient): Promise<AdvisorBookClient> {
  try {
    return await upsertAdvisorClientViaApi(client)
  } catch {
    return upsertAdvisorClientDirect(client)
  }
}

export async function deleteAdvisorClient(pan: string): Promise<void> {
  const userId = await requireUserId()
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error("Supabase client unavailable.")
  }
  const normalized = pan.trim().toUpperCase()

  const { data: rows, error: lookupError } = await supabase
    .from("advisor_clients")
    .select("client_pan")
    .eq("user_id", userId)

  if (lookupError) {
    throw new Error(lookupError.message)
  }

  const match = (rows ?? []).find(
    (row) => String(row.client_pan).trim().toUpperCase() === normalized
  )
  if (!match) {
    return
  }

  const { error } = await supabase
    .from("advisor_clients")
    .delete()
    .eq("user_id", userId)
    .eq("client_pan", match.client_pan)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateAdvisorClientNotes(pan: string, notes: string): Promise<void> {
  const userId = await requireUserId()
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error("Supabase client unavailable.")
  }
  const normalized = pan.trim().toUpperCase()

  const { data: rows, error: lookupError } = await supabase
    .from("advisor_clients")
    .select("client_pan")
    .eq("user_id", userId)

  if (lookupError) {
    throw new Error(lookupError.message)
  }

  const match = (rows ?? []).find(
    (row) => String(row.client_pan).trim().toUpperCase() === normalized
  )
  if (!match) {
    throw new Error("Client not found.")
  }

  const { error } = await supabase
    .from("advisor_clients")
    .update({ notes })
    .eq("user_id", userId)
    .eq("client_pan", match.client_pan)

  if (error) {
    throw new Error(error.message)
  }
}
