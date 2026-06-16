"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const bottomRef = useRef(null);
  const [readReceipts, setReadReceipts] = useState([]);

  useEffect(() => {
  let id = localStorage.getItem("visitor_id");

  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("visitor_id", id);
  }

  setVisitorId(id);
  loadMessages();
  markMessagesRead(id);
  loadReadReceipts();

  const channel = supabase
    .channel("messages-live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        setMessages((currentMessages) => [
          ...currentMessages,
          payload.new,
        ]);

        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
    const id = localStorage.getItem("visitor_id");
if (id) {
  await markMessagesRead(id);
}
  }

  async function loadReadReceipts() {
  const { data, error } = await supabase
    .from("message_reads")
    .select("*");

  if (error) {
    console.error("Error loading read receipts:", error);
    return;
  }

  setReadReceipts(data || []);
}

async function markMessagesRead(id) {
  if (!id) return;

  const now = new Date().toISOString();

  localStorage.setItem("messages_last_read_at", now);

  await supabase
    .from("message_reads")
    .delete()
    .eq("visitor_id", id);

  const { error } = await supabase.from("message_reads").insert({
    visitor_id: id,
    last_read_at: now,
  });

  if (error) {
    console.error("Error marking messages read:", error);
  }
}

  async function sendMessage() {
  if (!messageText.trim()) return;

  const { error } = await supabase.from("messages").insert({
    guest_name: guestName.trim() || "Anonymous",
    message: messageText.trim(),
    visitor_id: visitorId,
  });

  if (error) {
    console.error("Error sending message:", error);
    alert("Message failed to send.");
    return;
  }

  setMessageText("");

  await loadMessages(); // ADD THIS
}

  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <main className="messagesPage">
      <header className="messagesHeader">
        <button
  className="backChatButton"
  onClick={async () => {
    const now = new Date().toISOString();
    localStorage.setItem("messages_last_read_at", now);

    if (visitorId) {
      await markMessagesRead(visitorId);
    }

    window.location.href = "/";
  }}
>
  ←
</button>

        <div>
          <h1>Messages</h1>
          <p>Chat together here</p>
        </div>
      </header>

      <div className="chatNameBox">
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <section className="messagesList">
        {messages.length === 0 ? (
          <p className="noMessages">No messages yet. Start the chat 💬</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.visitor_id === visitorId;

            return (
              <div
                key={msg.id}
                className={`messageRow ${isMine ? "mine" : "theirs"}`}
              >
                <div className="messageBubble">
  {!isMine && <strong>{msg.guest_name || "Anonymous"}</strong>}
  <p>{msg.message}</p>
  <span>{formatTime(msg.created_at)}</span>

  {isMine && (
    <small className="readReceipt">
      {readReceipts.some(
        (r) =>
          r.visitor_id !== visitorId &&
          new Date(r.last_read_at) > new Date(msg.created_at)
      )
        ? "Read"
        : "Delivered"}
    </small>
  )}
</div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </section>

      <div className="messageComposer">
        <input
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />

        <button onClick={sendMessage}>Send</button>
      </div>
    </main>
  );
}