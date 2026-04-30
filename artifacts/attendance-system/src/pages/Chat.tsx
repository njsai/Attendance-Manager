import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Users, Headphones, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL;

interface Message {
  id: number;
  companyId: number;
  senderId: number | null;
  senderType: string;
  senderName: string;
  channel: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-IQ", { weekday: "short", month: "short", day: "numeric" });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-600",
  manager: "bg-blue-600",
  employee: "bg-slate-600",
  super_admin: "bg-indigo-700",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  manager: "مشرف",
  employee: "موظف",
  super_admin: "مدير النظام",
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
            ? "bg-blue-600 text-white rounded-tr-sm"
            : msg.senderType === "super_admin"
            ? "bg-indigo-700/80 text-white rounded-tl-sm border border-indigo-500/30"
            : "bg-white/10 text-white/90 rounded-tl-sm"
        }`}>
          {msg.content}
        </div>
        <span className="text-xs text-white/30 px-1">{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [channel, setChannel] = useState<"internal" | "support">("internal");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsgTime = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const params = new URLSearchParams({ channel });
      if (!initial && lastMsgTime.current) {
        params.set("since", lastMsgTime.current);
      }
      const res = await fetch(`${BASE}api/messages?${params}`, { credentials: "include" });
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
  }, [channel]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastMsgTime.current = null;
    fetchMessages(true);
  }, [fetchMessages, channel]);

  useEffect(() => {
    const iv = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(iv);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${BASE}api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text, channel }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setMessages(prev => [...prev, data]);
      lastMsgTime.current = data.createdAt;
      setInput("");
    } catch {
      setError("خطأ في الإرسال");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (!user) return null;

  const isAdmin = user.role === "admin" || user.role === "manager";

  const channelInfo = {
    internal: {
      icon: Users,
      label: "الدردشة الداخلية",
      desc: "التواصل بين الموظفين والإدارة",
      color: "text-blue-400",
    },
    support: {
      icon: Headphones,
      label: "الدعم الفني",
      desc: "التواصل مع مزود الخدمة",
      color: "text-indigo-400",
    },
  };

  const info = channelInfo[channel];

  // Group messages by date
  const dateGroups: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    const last = dateGroups[dateGroups.length - 1];
    if (!last || last.date !== d) {
      dateGroups.push({ date: d, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] bg-[#0f1623] rounded-2xl overflow-hidden border border-white/10 shadow-2xl" dir="rtl">
      {/* Channel tabs */}
      <div className="flex border-b border-white/10 bg-[#111827] flex-shrink-0">
        {(["internal", "support"] as const).map(ch => {
          const ci = channelInfo[ch];
          const Icon = ci.icon;
          const active = channel === ch;
          return (
            <button key={ch} onClick={() => setChannel(ch)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all border-b-2 ${
                active
                  ? `border-blue-500 text-white bg-white/5`
                  : "border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}>
              <Icon className={`w-4 h-4 ${active ? ci.color : ""}`} />
              <span>{ci.label}</span>
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-[#111827] flex-shrink-0 flex items-center gap-3">
        <info.icon className={`w-5 h-5 ${info.color}`} />
        <div>
          <p className="text-white font-semibold text-sm">{info.label}</p>
          <p className="text-white/40 text-xs">{info.desc}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">لا توجد رسائل بعد</p>
            <p className="text-xs mt-1">كن أول من يبدأ المحادثة!</p>
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
                <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === user.id} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
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
            placeholder="اكتب رسالة..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
          />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0">
            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </form>
      </div>
    </div>
  );
}
