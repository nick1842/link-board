"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function cleanUrl(url) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function safeFileName(file) {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  return `${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
}

async function compressImage(file, maxWidth = 1600, quality = 0.75) {
  if (!file || !file.type.startsWith("image/")) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Image compression failed."));

          resolve(
            new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image."));
    };

    img.src = objectUrl;
  });
}

function DropdownSection({ title, children, defaultOpen = false }) {
  return (
    <details className="dropdownPanel" open={defaultOpen}>
      <summary>{title}</summary>
      <section className="panel">{children}</section>
    </details>
  );
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
  const [linkImageFile, setLinkImageFile] = useState(null);

  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [newAlbum, setNewAlbum] = useState("");
  const [photoAlbumId, setPhotoAlbumId] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState("ALL");
  const [openPhotoMenu, setOpenPhotoMenu] = useState(null);

  const [uploadingLinkImage, setUploadingLinkImage] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
    await loadAlbums();
    await loadPhotos();
  }

  async function uploadToBucket(bucket, file) {
    if (!file) return null;

    const compressedFile = await compressImage(file);
    const fileName = safeFileName(compressedFile);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedFile);

    if (error) {
      console.error("Upload error:", error);
      alert("Image upload failed.");
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) return console.error("Error loading categories:", error);
    setCategories(data || []);
  }

  async function createCategory() {
    if (!newCategory.trim()) return;

    const { error } = await supabase.from("categories").insert({
      name: newCategory.trim(),
    });

    if (error) {
      alert("There was an error creating the category.");
      return;
    }

    setNewCategory("");
    loadCategories();
  }

  async function loadLinks() {
    const { data, error } = await supabase
      .from("links")
      .select("*, categories(*), comments(*), reactions(*)")
      .order("created_at", { ascending: false });

    if (error) return console.error("Error loading links:", error);
    setLinks(data || []);
  }

  async function saveLink() {
    if (!url.trim()) return;

    setUploadingLinkImage(true);

    const finalUrl = cleanUrl(url.trim());

    const previewRes = await fetch("/api/preview", {
      method: "POST",
      body: JSON.stringify({ url: finalUrl }),
    });

    const preview = await previewRes.json();
    const uploadedImageUrl = await uploadToBucket("link-images", linkImageFile);

    const { error } = await supabase.from("links").insert({
      url: finalUrl,
      custom_name: customName.trim() || null,
      category_id: categoryId || null,
      title: preview.title,
      description: preview.description,
      image: preview.image,
      custom_image: uploadedImageUrl,
    });

    setUploadingLinkImage(false);

    if (error) {
      alert("There was an error saving the link.");
      return;
    }

    setUrl("");
    setCustomName("");
    setCategoryId("");
    setLinkImageFile(null);

    const fileInput = document.getElementById("linkImageInput");
    if (fileInput) fileInput.value = "";

    loadLinks();
  }

  async function deleteLink(linkId) {
    if (!confirm("Delete this link?")) return;
    await supabase.from("links").delete().eq("id", linkId);
    loadLinks();
  }

  async function editLinkName(link) {
    const newName = prompt("Enter a new name:", link.custom_name || link.title || "");
    if (newName === null) return;

    await supabase
      .from("links")
      .update({ custom_name: newName.trim() || null })
      .eq("id", link.id);

    loadLinks();
  }

  async function changeLinkCategory(linkId, newCategoryId) {
    await supabase
      .from("links")
      .update({ category_id: newCategoryId || null })
      .eq("id", linkId);

    loadLinks();
  }

  async function addReaction(linkId, emoji) {
    const visitorId = localStorage.getItem("visitor_id");

    await supabase.from("reactions").insert({
      link_id: linkId,
      emoji,
      visitor_id: visitorId,
    });

    loadLinks();
  }

  async function addComment(linkId, text) {
    if (!text.trim()) return;

    await supabase.from("comments").insert({
      link_id: linkId,
      guest_name: guestName.trim() || "Anonymous",
      comment: text.trim(),
    });

    loadLinks();
  }

  async function loadAlbums() {
    const { data, error } = await supabase
      .from("albums")
      .select("*")
      .order("name", { ascending: true });

    if (error) return console.error("Error loading albums:", error);
    setAlbums(data || []);
  }

  async function createAlbum() {
    if (!newAlbum.trim()) return;

    const { error } = await supabase.from("albums").insert({
      name: newAlbum.trim(),
    });

    if (error) {
      alert("There was an error creating the album.");
      return;
    }

    setNewAlbum("");
    loadAlbums();
  }

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("photos")
      .select("*, albums(*), photo_albums(*, albums(*))")
      .order("created_at", { ascending: false });

    if (error) return console.error("Error loading photos:", error);
    setPhotos(data || []);
  }

  async function uploadPhoto() {
    if (photoFiles.length === 0) {
      alert("Choose at least one photo first.");
      return;
    }

    setUploadingPhoto(true);

    for (const file of photoFiles) {
      const uploadedPhotoUrl = await uploadToBucket("photos", file);
      if (!uploadedPhotoUrl) continue;

      const { data: newPhoto, error } = await supabase
        .from("photos")
        .insert({
          image_url: uploadedPhotoUrl,
          caption: photoCaption.trim() || null,
          album_id: photoAlbumId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Photo save error:", error);
        continue;
      }

      if (photoAlbumId) {
        await supabase.from("photo_albums").insert({
          photo_id: newPhoto.id,
          album_id: photoAlbumId,
        });
      }
    }

    setUploadingPhoto(false);
    setPhotoFiles([]);
    setPhotoCaption("");
    setPhotoAlbumId("");

    const fileInput = document.getElementById("photoUploadInput");
    if (fileInput) fileInput.value = "";

    loadPhotos();
  }

  async function deletePhoto(photoId) {
    if (!confirm("Delete this photo?")) return;

    await supabase.from("photos").delete().eq("id", photoId);
    setOpenPhotoMenu(null);
    loadPhotos();
  }

  async function addPhotoToAlbum(photoId) {
    if (albums.length === 0) {
      alert("Create an album first.");
      return;
    }

    const albumList = albums
      .map((album, index) => `${index + 1}. ${album.name}`)
      .join("\n");

    const choice = prompt(`Choose an album number:\n\n${albumList}`);
    if (!choice) return;

    const selected = albums[Number(choice) - 1];

    if (!selected) {
      alert("Invalid album number.");
      return;
    }

    const { error } = await supabase.from("photo_albums").insert({
      photo_id: photoId,
      album_id: selected.id,
    });

    if (error) {
      alert("That photo may already be in that album.");
      return;
    }

    setOpenPhotoMenu(null);
    loadPhotos();
  }

  function downloadPhoto(photo) {
    const link = document.createElement("a");
    link.href = photo.image_url;
    link.download = photo.caption || "photo";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpenPhotoMenu(null);
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

  const filteredPhotos =
    selectedAlbum === "ALL"
      ? photos
      : photos.filter((photo) =>
          photo.photo_albums?.some((pa) => pa.album_id === selectedAlbum)
        );

  return (
    <main className="page">
      <header className="hero">
        <h1>My Link Board</h1>
        <p>Save links, upload photos, organize albums, and let people comment.</p>
      </header>

      <DropdownSection title="Add a Link" defaultOpen={true}>
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

          <input
            id="linkImageInput"
            type="file"
            accept="image/*"
            onChange={(e) => setLinkImageFile(e.target.files[0])}
          />

          <button onClick={saveLink} disabled={uploadingLinkImage}>
            {uploadingLinkImage ? "Uploading..." : "Save Link"}
          </button>
        </div>
      </DropdownSection>

      <DropdownSection title="Create Category">
        <h2>Create Category</h2>

        <div className="form">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Example: School, Music, Videos"
          />
          <button onClick={createCategory}>Add Category</button>
        </div>
      </DropdownSection>

      <DropdownSection title="Search Links" defaultOpen={true}>
        <h2>Search Links</h2>

        <input
          className="fullInput"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, URL, or description"
        />
      </DropdownSection>

      <DropdownSection title="Create Album">
        <h2>Create Album</h2>

        <div className="form">
          <input
            value={newAlbum}
            onChange={(e) => setNewAlbum(e.target.value)}
            placeholder="Example: Vacation, Friends, School"
          />
          <button onClick={createAlbum}>Add Album</button>
        </div>
      </DropdownSection>

      <DropdownSection title="Upload Photos">
        <h2>Upload Photos</h2>

        <div className="form">
          <input
            id="photoUploadInput"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
          />

          <input
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="Optional caption for all selected photos"
          />

          <select value={photoAlbumId} onChange={(e) => setPhotoAlbumId(e.target.value)}>
            <option value="">Only ALL album</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                Also add to {album.name}
              </option>
            ))}
          </select>

          <button onClick={uploadPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto
              ? "Compressing & Uploading..."
              : `Upload ${photoFiles.length > 1 ? photoFiles.length + " Photos" : "Photo"}`}
          </button>
        </div>
      </DropdownSection>

      <DropdownSection title="Photo Albums">
        <h2>Photo Albums</h2>

        <select
          className="fullInput"
          value={selectedAlbum}
          onChange={(e) => setSelectedAlbum(e.target.value)}
        >
          <option value="ALL">ALL</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>

        <div className="photoGrid">
          {filteredPhotos.map((photo) => (
            <div className="photoCard" key={photo.id}>
              <div className="photoMenuWrap">
                <button
                  className="photoMenuButton"
                  onClick={() =>
                    setOpenPhotoMenu(openPhotoMenu === photo.id ? null : photo.id)
                  }
                >
                  ⋯
                </button>

                {openPhotoMenu === photo.id && (
                  <div className="photoMenu">
                    <button onClick={() => downloadPhoto(photo)}>Download</button>
                    <button onClick={() => addPhotoToAlbum(photo.id)}>
                      Add to Album
                    </button>
                    <button className="deleteBtn" onClick={() => deletePhoto(photo.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <img src={photo.image_url} alt="" />

              <p>{photo.caption || "No caption"}</p>

              <span>
                Albums:{" "}
                {photo.photo_albums?.length
                  ? ["ALL", ...photo.photo_albums.map((pa) => pa.albums?.name)].join(
                      ", "
                    )
                  : "ALL"}
              </span>
            </div>
          ))}
        </div>
      </DropdownSection>

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
      {(link.custom_image || link.image) && (
        <img src={link.custom_image || link.image} alt="" />
      )}

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