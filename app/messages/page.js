"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let id = localStorage.getItem("visitor_id");

    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("visitor_id", id);
    }

    setVisitorId(id);
    loadMessages();

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
          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some(
              (msg) => msg.id === payload.new.id
            );

            if (alreadyExists) return currentMessages;

            return [...currentMessages, payload.new];
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

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
          onClick={() => {
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