"use client";

import { CalendarDays, Copy, MapPin, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const statusClasses = {
  "รอยืนยัน": "pending",
  "เลื่อน": "pending",
  "ยกเลิก": "cancel",
  "เสร็จแล้ว": "done",
};

const visitTypes = ["เข้าพบครั้งแรก", "ติดตามผล", "นำเสนอ", "บริการหลังการขาย", "เก็บข้อมูล", "อื่น ๆ"];
const statuses = ["วางแผน", "รอยืนยัน", "ยืนยันแล้ว", "เสร็จแล้ว", "เลื่อน", "ยกเลิก"];
const reminders = [
  [15, "15 นาที"],
  [30, "30 นาที"],
  [60, "1 ชั่วโมง"],
  [120, "2 ชั่วโมง"],
  [1440, "1 วัน"],
];

function todayIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
}

function toDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function blankVisit(members) {
  return {
    id: "",
    client: "",
    date: todayIso(),
    start: "09:00",
    end: "10:00",
    owner: members[0]?.id || "",
    participants: [],
    type: "เข้าพบครั้งแรก",
    location: "",
    status: "วางแผน",
    reminder: 60,
    contact: "",
    notes: "",
  };
}

export default function Page() {
  const [members, setMembers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState("ทั้งหมด");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [syncLabel, setSyncLabel] = useState("กำลังโหลด");

  const memberName = (id) => members.find((member) => member.id === id)?.name || id || "-";

  async function loadState() {
    const response = await fetch("/api/state", { cache: "no-store" });
    const payload = await response.json();
    setMembers(payload.members || []);
    setVisits(payload.visits || []);
    setSyncLabel("ออนไลน์");
  }

  useEffect(() => {
    loadState().catch(() => setSyncLabel("เชื่อมต่อไม่ได้"));
    const timer = window.setInterval(() => {
      loadState().catch(() => setSyncLabel("เชื่อมต่อไม่ได้"));
    }, 5000);
    setShareUrl(window.location.href);
    return () => window.clearInterval(timer);
  }, []);

  const activeVisits = visits.filter((visit) => visit.status !== "ยกเลิก");
  const summary = useMemo(() => {
    const today = toDate(todayIso());
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return {
      today: activeVisits.filter((visit) => toDate(visit.date).getTime() === today.getTime()).length,
      week: activeVisits.filter((visit) => {
        const date = toDate(visit.date);
        return date >= today && date <= weekEnd;
      }).length,
      pending: visits.filter((visit) => visit.status === "รอยืนยัน").length,
    };
  }, [visits]);

  const visibleVisits = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return visits
      .filter((visit) => {
        const memberMatch =
          ownerFilter === "ทั้งหมด" || visit.owner === ownerFilter || visit.participants.includes(ownerFilter);
        const statusMatch = statusFilter === "ทั้งหมด" || visit.status === statusFilter;
        const haystack = [visit.client, visit.location, visit.contact, visit.notes, memberName(visit.owner), visit.type]
          .join(" ")
          .toLowerCase();
        return memberMatch && statusMatch && (!needle || haystack.includes(needle));
      })
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  }, [visits, ownerFilter, statusFilter, search, members]);

  async function saveVisit(visit) {
    const response = await fetch("/api/state", {
      method: visit.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(visit),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "บันทึกไม่สำเร็จ" }));
      window.alert(payload.error || "บันทึกไม่สำเร็จ");
      return;
    }
    setEditing(null);
    await loadState();
  }

  async function deleteVisit(id) {
    if (!window.confirm("ลบนัดนี้ใช่ไหม")) return;
    const response = await fetch(`/api/state?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) window.alert("ลบไม่สำเร็จ");
    setEditing(null);
    await loadState();
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl);
  }

  let currentDay = "";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Online Client Visits</p>
          <h1>ตารางเข้าพบลูกค้าออนไลน์</h1>
        </div>
        <div className={`sync-pill ${syncLabel === "เชื่อมต่อไม่ได้" ? "offline" : ""}`}>
          <span className="sync-dot" />
          <span>{syncLabel}</span>
        </div>
      </header>

      <section className="share-panel">
        <div>
          <span>ลิงก์ออนไลน์สำหรับส่งเข้า LINE</span>
          <strong>{shareUrl || "กำลังสร้างลิงก์"}</strong>
        </div>
        <button type="button" onClick={copyShareUrl}>
          <Copy size={17} />
          คัดลอก
        </button>
      </section>

      <section className="notice">
        เวอร์ชันนี้เปิดผ่านอินเทอร์เน็ตได้แล้ว ข้อมูลซิงก์จาก API กลางของเว็บ และจะรีเฟรชอัตโนมัติทุก 5 วินาที
      </section>

      <section className="summary-grid" aria-label="สรุป">
        <article className="metric">
          <span>วันนี้</span>
          <strong>{summary.today}</strong>
        </article>
        <article className="metric accent">
          <span>7 วัน</span>
          <strong>{summary.week}</strong>
        </article>
        <article className="metric warn">
          <span>รอยืนยัน</span>
          <strong>{summary.pending}</strong>
        </article>
      </section>

      <section className="toolbar" aria-label="ตัวกรอง">
        <label className="search-box">
          <Search size={19} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาลูกค้า สถานที่ ผู้ติดต่อ" />
        </label>
        <button className="icon-button" type="button" onClick={() => setEditing(blankVisit(members))} aria-label="เพิ่มนัด">
          <Plus size={22} />
        </button>
      </section>

      <nav className="member-tabs" aria-label="ทีม">
        {[{ id: "ทั้งหมด", name: "ทั้งหมด" }, ...members].map((member) => (
          <button
            className={`tab ${ownerFilter === member.id ? "active" : ""}`}
            key={member.id}
            type="button"
            onClick={() => setOwnerFilter(member.id)}
          >
            {member.name}
          </button>
        ))}
      </nav>

      <section className="status-row" aria-label="สถานะ">
        {["ทั้งหมด", "วางแผน", "รอยืนยัน", "ยืนยันแล้ว", "เสร็จแล้ว"].map((status) => (
          <button
            className={`chip ${statusFilter === status ? "active" : ""}`}
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </section>

      <section className="timeline" aria-live="polite">
        {!visibleVisits.length ? <div className="empty-state">ยังไม่มีนัดในมุมมองนี้</div> : null}
        {visibleVisits.map((visit) => {
          const dayHeading = visit.date !== currentDay;
          currentDay = visit.date;
          return (
            <div className="visit-group" key={visit.id}>
              {dayHeading ? (
                <h2 className="day-heading">
                  {new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short" }).format(toDate(visit.date))}
                </h2>
              ) : null}
              <button className="visit-card" type="button" onClick={() => setEditing(visit)}>
                <div className="date-tile">
                  <strong>{new Intl.DateTimeFormat("th-TH", { day: "numeric" }).format(toDate(visit.date))}</strong>
                  <span>{new Intl.DateTimeFormat("th-TH", { month: "short" }).format(toDate(visit.date))}</span>
                </div>
                <div className="visit-body">
                  <div className="visit-head">
                    <div>
                      <h3>{visit.client}</h3>
                      <p>
                        {visit.start}-{visit.end} · {visit.type}
                      </p>
                    </div>
                    <span className={`status-badge ${statusClasses[visit.status] || ""}`}>{visit.status}</span>
                  </div>
                  <div className="visit-meta">
                    <span>
                      <Users size={14} />
                      {memberName(visit.owner)}
                    </span>
                    {visit.location ? (
                      <span>
                        <MapPin size={14} />
                        {visit.location}
                      </span>
                    ) : null}
                    <span>
                      <CalendarDays size={14} />
                      เตือน {visit.reminder >= 1440 ? "1 วัน" : `${visit.reminder} นาที`}
                    </span>
                  </div>
                  <div className="visit-notes">{visit.notes || visit.contact}</div>
                </div>
              </button>
            </div>
          );
        })}
      </section>

      {editing ? (
        <VisitSheet
          members={members}
          value={editing}
          onClose={() => setEditing(null)}
          onDelete={deleteVisit}
          onSave={saveVisit}
        />
      ) : null}
    </main>
  );
}

function VisitSheet({ members, value, onClose, onDelete, onSave }) {
  const [visit, setVisit] = useState(value);
  const update = (field, nextValue) => setVisit((current) => ({ ...current, [field]: nextValue }));
  const toggleParticipant = (id) => {
    setVisit((current) => ({
      ...current,
      participants: current.participants.includes(id)
        ? current.participants.filter((item) => item !== id)
        : [...current.participants, id],
    }));
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <aside className="bottom-sheet" aria-label="ฟอร์มนัด" aria-modal="true" role="dialog">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(visit);
          }}
        >
          <div className="sheet-handle" />
          <div className="sheet-title">
            <div>
              <p className="eyebrow">{visit.id ? "แก้นัด" : "เพิ่มนัด"}</p>
              <h2>{visit.client || "นัดเข้าพบลูกค้า"}</h2>
            </div>
            <button className="ghost-button" type="button" onClick={onClose} aria-label="ปิด">
              <X size={21} />
            </button>
          </div>

          <div className="form-grid">
            <label>
              ลูกค้า/บริษัท
              <input value={visit.client} onChange={(event) => update("client", event.target.value)} required />
            </label>
            <label>
              วันที่
              <input type="date" value={visit.date} onChange={(event) => update("date", event.target.value)} required />
            </label>
            <label>
              เริ่ม
              <input type="time" value={visit.start} onChange={(event) => update("start", event.target.value)} required />
            </label>
            <label>
              สิ้นสุด
              <input type="time" value={visit.end} onChange={(event) => update("end", event.target.value)} required />
            </label>
            <label>
              ผู้รับผิดชอบ
              <select value={visit.owner} onChange={(event) => update("owner", event.target.value)}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ประเภท
              <select value={visit.type} onChange={(event) => update("type", event.target.value)}>
                {visitTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label>
              สถานที่/ลิงก์
              <input value={visit.location} onChange={(event) => update("location", event.target.value)} />
            </label>
            <label>
              สถานะ
              <select value={visit.status} onChange={(event) => update("status", event.target.value)}>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              แจ้งเตือนก่อน
              <select value={visit.reminder} onChange={(event) => update("reminder", Number(event.target.value))}>
                {reminders.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ผู้ติดต่อ
              <input value={visit.contact} onChange={(event) => update("contact", event.target.value)} />
            </label>
            <label className="full">
              ผู้ร่วมทีม
              <div className="participant-grid">
                {members.map((member) => (
                  <label key={member.id}>
                    <input
                      checked={visit.participants.includes(member.id)}
                      disabled={visit.owner === member.id}
                      type="checkbox"
                      onChange={() => toggleParticipant(member.id)}
                    />
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            </label>
            <label className="full">
              บันทึก
              <textarea value={visit.notes} onChange={(event) => update("notes", event.target.value)} rows={3} />
            </label>
          </div>

          <div className="sheet-actions">
            {visit.id ? (
              <button className="danger-button" type="button" onClick={() => onDelete(visit.id)}>
                <Trash2 size={17} />
                ลบ
              </button>
            ) : null}
            <button className="primary-button" type="submit">
              บันทึก
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
