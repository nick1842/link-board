"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function cleanUrl(url) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [links, setLinks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadEverything();

    let id = localStorage.getItem("visitor_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("visitor_id", id);
    }
  }, []);

  async function loadEverything() {
    await loadCategories();
    await loadLinks();
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    setCategories(data || []);
  }

  async function loadLinks() {
    const { data, error } = await supabase
      .from("links")
      .select("*, categories(*), comments(*), reactions(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading links:", error);
      return;
    }

    setLinks(data || []);
  }

  async function createCategory() {
    if (!newCategory.trim()) return;

    const { error } = await supabase.from("categories").insert({
      name: newCategory.trim(),
    });

    if (error) {
      console.error("Error creating category:", error);
      alert("There was an error creating the category.");
      return;
    }

    setNewCategory("");
    loadCategories();
  }

  async function saveLink() {
    if (!url.trim()) return;

    const finalUrl = cleanUrl(url.trim());

    const previewRes = await fetch("/api/preview", {
      method: "POST",
      body: JSON.stringify({ url: finalUrl }),
    });

    const preview = await previewRes.json();

    const { error } = await supabase.from("links").insert({
      url: finalUrl,
      custom_name: customName.trim() || null,
      category_id: categoryId || null,
      title: preview.title,
      description: preview.description,
      image: preview.image,
    });

    if (error) {
      console.error("Error saving link:", error);
      alert("There was an error saving the link.");
      return;
    }

    setUrl("");
    setCustomName("");
    setCategoryId("");
    loadLinks();
  }

  async function deleteLink(linkId) {
    const confirmDelete = confirm("Delete this link?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("links").delete().eq("id", linkId);

    if (error) {
      console.error("Error deleting link:", error);
      alert("There was an error deleting the link.");
      return;
    }

    loadLinks();
  }

  async function editLinkName(link) {
    const newName = prompt("Enter a new name:", link.custom_name || link.title || "");
    if (newName === null) return;

    const { error } = await supabase
      .from("links")
      .update({ custom_name: newName.trim() || null })
      .eq("id", link.id);

    if (error) {
      console.error("Error editing link:", error);
      alert("There was an error editing the link name.");
      return;
    }

    loadLinks();
  }

  async function changeLinkCategory(linkId, newCategoryId) {
    const { error } = await supabase
      .from("links")
      .update({ category_id: newCategoryId || null })
      .eq("id", linkId);

    if (error) {
      console.error("Error changing category:", error);
      alert("There was an error changing the category.");
      return;
    }

    loadLinks();
  }

  async function addReaction(linkId, emoji) {
    const visitorId = localStorage.getItem("visitor_id");

    const { error } = await supabase.from("reactions").insert({
      link_id: linkId,
      emoji,
      visitor_id: visitorId,
    });

    if (error) {
      console.error("Error adding reaction:", error);
    }

    loadLinks();
  }

  async function addComment(linkId, text) {
    if (!text.trim()) return;

    const { error } = await supabase.from("comments").insert({
      link_id: linkId,
      guest_name: guestName.trim() || "Anonymous",
      comment: text.trim(),
    });

    if (error) {
      console.error("Error adding comment:", error);
      alert("There was an error adding the comment.");
      return;
    }

    loadLinks();
  }

  const filteredLinks = links.filter((link) => {
    const allText = `
      ${link.custom_name || ""}
      ${link.title || ""}
      ${link.description || ""}
      ${link.url || ""}
      ${link.categories?.name || ""}
    `.toLowerCase();

    return allText.includes(search.toLowerCase());
  });

  return (
    <main className="page">
      <header className="hero">
        <h1>My Link Board</h1>
        <p>Save links, organize them, search them, and let people react or comment.</p>
      </header>

      <section className="panel">
        <h2>Add a Link</h2>

        <div className="form">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Optional link name"
          />

          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link"
          />

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <button onClick={saveLink}>Save Link</button>
        </div>
      </section>

      <section className="panel">
        <h2>Create Category</h2>

        <div className="form">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Example: School, Music, Videos"
          />
          <button onClick={createCategory}>Add Category</button>
        </div>
      </section>

      <section className="panel">
        <h2>Search Links</h2>

        <input
          className="fullInput"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, URL, or description"
        />
      </section>

      <input
        className="nameInput"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="Your name for comments, or leave blank for Anonymous"
      />

      <div className="grid">
        {filteredLinks.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            categories={categories}
            onReact={addReaction}
            onComment={addComment}
            onDelete={deleteLink}
            onEditName={editLinkName}
            onChangeCategory={changeLinkCategory}
          />
        ))}
      </div>
    </main>
  );
}

function LinkCard({
  link,
  categories,
  onReact,
  onComment,
  onDelete,
  onEditName,
  onChangeCategory,
}) {
  const [comment, setComment] = useState("");

  const reactionCounts = {};
  link.reactions?.forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return (
    <div className="card">
      {link.image && <img src={link.image} alt="" />}

      <div className="cardTop">
        <span className="category">{link.categories?.name || "No category"}</span>

        <div className="cardActions">
          <button onClick={() => onEditName(link)}>Edit Name</button>
          <button className="deleteBtn" onClick={() => onDelete(link.id)}>
            Delete
          </button>
        </div>
      </div>

      <h2>{link.custom_name || link.title || "Untitled Link"}</h2>

      {link.description && <p>{link.description}</p>}

      <a href={cleanUrl(link.url)} target="_blank" rel="noopener noreferrer">
        Open link
      </a>

      <select
        className="categorySelect"
        value={link.category_id || ""}
        onChange={(e) => onChangeCategory(link.id, e.target.value)}
      >
        <option value="">No category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <div className="reactions">
        {["👍", "❤️", "😂", "🔥"].map((emoji) => (
          <button key={emoji} onClick={() => onReact(link.id, emoji)}>
            {emoji} {reactionCounts[emoji] || 0}
          </button>
        ))}
      </div>

      <div className="comments">
        <h3>Comments</h3>

        {link.comments?.length === 0 && <p className="emptyText">No comments yet.</p>}

        {link.comments?.map((c) => (
          <p key={c.id}>
            <strong>{c.guest_name}:</strong> {c.comment}
          </p>
        ))}

        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment"
        />

        <button
          onClick={() => {
            onComment(link.id, comment);
            setComment("");
          }}
        >
          Comment
        </button>
      </div>
    </div>
  );
}