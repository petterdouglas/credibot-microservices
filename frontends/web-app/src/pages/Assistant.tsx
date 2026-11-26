import { useEffect, useRef, useState, type FormEvent } from "react";
import { webApi } from "../api/web";
import { Button, ErrorBox } from "../components/ui";

interface Msg { from: "user" | "bot"; text: string }

export default function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Oi! Posso explicar taxas e prazos e consultar o status do seu empréstimo. O que você quer saber?" },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { from: "user", text: message }]);
    setText(""); setBusy(true); setError(undefined);
    try {
      const r = await webApi.chat(message);
      setMsgs((m) => [...m, { from: "bot", text: r.reply }]);
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Assistente</h1>
      <div className="h-[55vh] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.from === "user" ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{m.text}</p>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Consultando o assistente…</p>}
        <div ref={end} />
      </div>
      <ErrorBox error={error} />
      <form onSubmit={send} className="flex gap-2">
        <input
          value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Qual taxa para R$ 500?"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        />
        <Button type="submit" disabled={busy || !text.trim()}>Enviar</Button>
      </form>
    </>
  );
}
