import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, Building2, AlertCircle, ArrowRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface Company {
  id: number;
  name: string;
  isActive: boolean;
}

interface Message {
  id: number;
  companyId: number;
  senderId: number | null;
  senderType: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface SummaryEntry {
  lastMsg: Message | null;
  unread: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "اليوم";
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-IQ", { month: "short", day: "numeric" });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  manager: "مشرف",
  employee: "موظف",
  super_admin: "مدير النظام العام",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "rgba(168,85,247,0.8)",
  manager: "rgba(59,130,246,0.8)",
  employee: "rgba(100,116,139,0.8)",
  super_admin: "rgba(0,245,255,0.8)",
};

function Avatar({ name, role }: { name: string; role: string }) {
  const bg = ROLE_COLORS[role] ?? "rgba(100,116,139,0.8)";
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {name.charAt(0)}
    </div>
  );
}

function MessageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, flexDirection: isMe ? "row-reverse" : "row" }}>
      {!isMe && <Avatar name={msg.senderName} role={msg.senderType} />}
      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: 3, alignItems: isMe ? "flex-end" : "flex-start" }}>
        {!isMe && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{msg.senderName}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{ROLE_LABELS[msg.senderType] ?? msg.senderType}</span>
          </div>
        )}
        <div style={{ padding: "9px 14px", borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px", fontSize: 13, lineHeight: 1.5, wordBreak: "break-word", background: isMe ? "linear-gradient(135deg, rgba(0,245,255,0.25), rgba(59,130,246,0.2))" : "rgba(255,255,255,0.07)", border: isMe ? "1px solid rgba(0,245,255,0.2)" : "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "0 4px" }}>{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

export default function SuperAdminChat({ companies }: { companies: Company[] }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState<Record<number, SummaryEntry>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgTime = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}api/messages/super-admin-summary`, { credentials: "include" });
      if (res.ok) setSummary(await res.json());
    } catch { }
  }, []);

  useEffect(() => {
    fetchSummary();
    const iv = setInterval(fetchSummary, 5000);
    return () => clearInterval(iv);
  }, [fetchSummary]);

  const fetchMessages = useCallback(async (companyId: number, initial = false) => {
    try {
      const params = new URLSearchParams();
      if (!initial && lastMsgTime.current) params.set("since", lastMsgTime.current);
      const res = await fetch(`${BASE}api/messages/super-admin/${companyId}?${params}`, { credentials: "include" });
      if (!res.ok) return;
      const data: Message[] = await res.json();
      if (initial) {
        setMessages(data);
        if (data.length) lastMsgTime.current = data[data.length - 1].createdAt;
        setLoading(false);
      } else if (data.length) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newMsgs = data.filter(m => !ids.has(m.id));
          return newMsgs.length ? [...prev, ...newMsgs] : prev;
        });
        lastMsgTime.current = data[data.length - 1].createdAt;
      }
    } catch {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    setMessages([]);
    lastMsgTime.current = null;
    fetchMessages(selectedCompany.id, true);
  }, [selectedCompany, fetchMessages]);

  useEffect(() => {
    if (!selectedCompany) return;
    const iv = setInterval(() => fetchMessages(selectedCompany.id, false), 3000);
    return () => clearInterval(iv);
  }, [selectedCompany, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!selectedCompany || !input.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${BASE}api/messages/super-admin/${selectedCompany.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setMessages(prev => [...prev, data]);
      lastMsgTime.current = data.createdAt;
      setInput("");
      fetchSummary();
    } catch {
      setError("خطأ في الإرسال");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Group messages by date
  const dateGroups: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    const last = dateGroups[dateGroups.length - 1];
    if (!last || last.date !== d) dateGroups.push({ date: d, msgs: [msg] });
    else last.msgs.push(msg);
  }

  return (
    <div style={{ display: "flex", height: 580, background: "rgba(5,13,31,0.9)", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(0,245,255,0.1)" }} dir="rtl">
      {/* Companies sidebar */}
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(0,245,255,0.07)", background: "rgba(255,255,255,0.02)", width: selectedCompany ? 0 : "100%", overflow: "hidden", transition: "width 0.2s", flexShrink: 0 }} className="md:!w-64">
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,245,255,0.07)", flexShrink: 0 }}>
          <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, margin: 0 }}>
            <MessageCircle size={14} style={{ color: "#a855f7" }} /> دردشة الدعم
          </h3>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>اختر شركة للمحادثة</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {companies.map(c => {
            const entry = summary[c.id];
            const unread = entry?.unread ?? 0;
            const lastMsg = entry?.lastMsg;
            const isSelected = selectedCompany?.id === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedCompany(c)}
                style={{ width: "100%", textAlign: "right", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: isSelected ? "rgba(0,245,255,0.06)" : "transparent", borderRight: isSelected ? "2px solid #00f5ff" : "2px solid transparent", cursor: "pointer", display: "block", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: isSelected ? "rgba(0,245,255,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${isSelected ? "rgba(0,245,255,0.25)" : "rgba(255,255,255,0.08)"}` }}>
                    <Building2 size={16} style={{ color: isSelected ? "#00f5ff" : "rgba(255,255,255,0.4)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      {unread > 0 && (
                        <span style={{ background: "#a855f7", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{unread}</span>
                      )}
                    </div>
                    {lastMsg && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{lastMsg.content}</p>}
                    {lastMsg && <p style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{formatDate(lastMsg.createdAt)}</p>}
                  </div>
                </div>
              </button>
            );
          })}
          {companies.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>لا توجد شركات</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedCompany ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Chat Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,245,255,0.07)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <button onClick={() => setSelectedCompany(null)} className="md:hidden" style={{ padding: 4, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
              <ArrowRight size={16} />
            </button>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={15} style={{ color: "#00f5ff" }} />
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: 0 }}>{selectedCompany.name}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>قناة الدعم الفني</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Loader2 size={28} style={{ color: "#a855f7" }} className="animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.2)" }}>
                <MessageCircle size={40} style={{ marginBottom: 10, opacity: 0.2 }} />
                <p style={{ fontSize: 13 }}>لا توجد رسائل</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>ابدأ المحادثة مع {selectedCompany.name}</p>
              </div>
            ) : (
              dateGroups.map(group => (
                <div key={group.date} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "0 6px" }}>{formatDate(group.msgs[0].createdAt)}</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                  {group.msgs.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} isMe={msg.senderType === "super_admin"} />
                  ))}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 12, borderTop: "1px solid rgba(248,113,113,0.2)", flexShrink: 0 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(0,245,255,0.07)", background: "rgba(255,255,255,0.02)", flexShrink: 0 }}>
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={`رسالة إلى ${selectedCompany.name}...`}
                style={{ flex: 1, padding: "9px 14px", borderRadius: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 13, outline: "none" }} />
              <button type="submit" disabled={!input.trim() || sending}
                style={{ width: 38, height: 38, borderRadius: 11, border: "none", background: input.trim() && !sending ? "linear-gradient(135deg, rgba(0,245,255,0.8), rgba(168,85,247,0.6))" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: !input.trim() || sending ? "not-allowed" : "pointer", flexShrink: 0, opacity: !input.trim() || sending ? 0.4 : 1 }}>
                {sending ? <Loader2 size={15} style={{ color: "#fff" }} className="animate-spin" /> : <Send size={15} style={{ color: "#fff" }} />}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex" style={{ flex: 1, alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)" }}>
          <div style={{ textAlign: "center" }}>
            <MessageCircle size={48} style={{ margin: "0 auto 12px", opacity: 0.15 }} />
            <p style={{ fontSize: 13 }}>اختر شركة من القائمة لبدء المحادثة</p>
          </div>
        </div>
      )}
    </div>
  );
}
