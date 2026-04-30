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
  admin: "bg-purple-600",
  manager: "bg-blue-600",
  employee: "bg-slate-600",
  super_admin: "bg-indigo-700",
};

function Avatar({ name, role }: { name: string; role: string }) {
  const bg = ROLE_COLORS[role] ?? "bg-slate-600";
  return (
    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {name.charAt(0)}
    </div>
  );
}

function MessageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {!isMe && <Avatar name={msg.senderName} role={msg.senderType} />}
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!isMe && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/80">{msg.senderName}</span>
            <span className="text-xs text-white/40">{ROLE_LABELS[msg.senderType] ?? msg.senderType}</span>
          </div>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
          isMe
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white/10 text-white/90 rounded-tl-sm"
        }`}>
          {msg.content}
        </div>
        <span className="text-xs text-white/30 px-1">{formatTime(msg.createdAt)}</span>
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
    <div className="flex h-[600px] bg-[#0f1623] rounded-2xl overflow-hidden border border-white/10" dir="rtl">
      {/* Companies sidebar */}
      <div className={`flex flex-col border-l border-white/10 bg-[#111827] transition-all ${selectedCompany ? "w-0 md:w-64 overflow-hidden" : "w-full md:w-64"}`}>
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-indigo-400" /> دردشة الدعم
          </h3>
          <p className="text-white/40 text-xs mt-0.5">اختر شركة للمحادثة</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {companies.map(c => {
            const entry = summary[c.id];
            const unread = entry?.unread ?? 0;
            const lastMsg = entry?.lastMsg;
            const isSelected = selectedCompany?.id === c.id;
            return (
              <button key={c.id} onClick={() => setSelectedCompany(c)}
                className={`w-full text-right p-4 border-b border-white/5 transition-all hover:bg-white/5 ${isSelected ? "bg-indigo-600/20 border-indigo-500/20" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-indigo-600/40" : "bg-white/10"}`}>
                    <Building2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white text-sm font-medium truncate">{c.name}</span>
                      {unread > 0 && (
                        <span className="bg-indigo-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-white/40 text-xs truncate mt-0.5">{lastMsg.content}</p>
                    )}
                    {lastMsg && (
                      <p className="text-white/25 text-xs">{formatDate(lastMsg.createdAt)}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {companies.length === 0 && (
            <div className="p-6 text-center text-white/30 text-xs">لا توجد شركات</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedCompany ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 bg-[#111827] flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setSelectedCompany(null)} className="md:hidden text-white/50 hover:text-white p-1">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{selectedCompany.name}</p>
              <p className="text-white/40 text-xs">قناة الدعم الفني</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">لا توجد رسائل</p>
                <p className="text-xs mt-1">ابدأ المحادثة مع {selectedCompany.name}</p>
              </div>
            ) : (
              dateGroups.map(group => (
                <div key={group.date} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30 px-2">{formatDate(group.msgs[0].createdAt)}</span>
                    <div className="flex-1 h-px bg-white/10" />
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
            <div className="px-4 py-2 flex items-center gap-2 bg-red-500/10 text-red-400 text-xs border-t border-red-500/20 flex-shrink-0">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10 bg-[#111827] flex-shrink-0">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`رسالة إلى ${selectedCompany.name}...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all"
              />
              <button type="submit" disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0">
                {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-white/20">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">اختر شركة من القائمة لبدء المحادثة</p>
          </div>
        </div>
      )}
    </div>
  );
}
