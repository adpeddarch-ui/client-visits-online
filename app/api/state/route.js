import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const headers = {
  apikey: supabaseKey || "",
  authorization: `Bearer ${supabaseKey || ""}`,
  "content-type": "application/json",
};

function missingConfig() {
  return !supabaseUrl || !supabaseKey;
}

function tableUrl(table, query = "") {
  return `${supabaseUrl}/rest/v1/${table}${query}`;
}

async function supabaseFetch(table, query, options = {}) {
  const response = await fetch(tableUrl(table, query), {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Supabase request failed: ${response.status}`);
  }
  return payload;
}

function normalizeVisit(input, existingId) {
  const clean = (value) => String(value || "").trim();
  return {
    ...(existingId ? { id: existingId } : {}),
    date: clean(input.date),
    start_time: clean(input.start || input.start_time),
    end_time: clean(input.end || input.end_time),
    client: clean(input.client),
    owner_id: clean(input.owner || input.owner_id),
    participant_ids: Array.isArray(input.participants || input.participant_ids)
      ? input.participants || input.participant_ids
      : [],
    type: clean(input.type) || "เข้าพบครั้งแรก",
    location: clean(input.location),
    status: clean(input.status) || "วางแผน",
    reminder: Number(input.reminder || 60),
    contact: clean(input.contact),
    notes: clean(input.notes),
    updated_at: new Date().toISOString(),
  };
}

function validationError(visit) {
  const missing = ["date", "start_time", "end_time", "client", "owner_id"].filter((field) => !visit[field]);
  if (missing.length) return `ข้อมูลยังไม่ครบ: ${missing.join(", ")}`;
  if (visit.start_time >= visit.end_time) return "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม";
  return "";
}

function apiVisit(row) {
  return {
    id: row.id,
    date: row.date,
    start: row.start_time,
    end: row.end_time,
    client: row.client,
    owner: row.owner_id,
    participants: row.participant_ids || [],
    type: row.type,
    location: row.location || "",
    status: row.status,
    reminder: row.reminder,
    contact: row.contact || "",
    notes: row.notes || "",
    updatedAt: row.updated_at,
  };
}

function apiMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role || "",
    email: row.email || "",
  };
}

export async function GET() {
  if (missingConfig()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase URL/key" }, { status: 500 });
  }

  try {
    const [members, visits] = await Promise.all([
      supabaseFetch("team_members", "?select=*&order=id.asc"),
      supabaseFetch("visits", "?select=*&order=date.asc,start_time.asc"),
    ]);

    return NextResponse.json({
      members: members.map(apiMember),
      visits: visits.map(apiVisit),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (missingConfig()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase URL/key" }, { status: 500 });
  }

  const visit = normalizeVisit(await request.json());
  const error = validationError(visit);
  if (error) return NextResponse.json({ error }, { status: 422 });

  try {
    const rows = await supabaseFetch("visits", "?select=*", {
      method: "POST",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(visit),
    });
    return NextResponse.json(apiVisit(rows[0]), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (missingConfig()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase URL/key" }, { status: 500 });
  }

  const body = await request.json();
  const visit = normalizeVisit(body, body.id);
  const error = validationError(visit);
  if (error) return NextResponse.json({ error }, { status: 422 });

  try {
    const rows = await supabaseFetch("visits", `?id=eq.${encodeURIComponent(body.id)}&select=*`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify(visit),
    });
    if (!rows.length) return NextResponse.json({ error: "ไม่พบนัดนี้" }, { status: 404 });
    return NextResponse.json(apiVisit(rows[0]));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (missingConfig()) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Supabase URL/key" }, { status: 500 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ไม่พบนัดนี้" }, { status: 404 });

  try {
    await supabaseFetch("visits", `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
