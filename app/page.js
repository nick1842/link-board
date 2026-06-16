"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

function cleanUrl(url) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function safeFileName(file) {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const randomId = Math.random().toString(36).substring(2, 15);
  return `${Date.now()}-${randomId}-${cleanName}`;
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
  const [linkScreen, setLinkScreen] = useState("main");
  const [datingTime, setDatingTime] = useState("");

  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [newAlbum, setNewAlbum] = useState("");
  const [photoAlbumId, setPhotoAlbumId] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState("ALL");
  const [openPhotoMenu, setOpenPhotoMenu] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  const [uploadingLinkImage, setUploadingLinkImage] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [showPhotoTools, setShowPhotoTools] = useState(false);
  const [photoScreen, setPhotoScreen] = useState("main");

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadNotifications = notifications.filter(
  (n) => n.read === false
).length;

useEffect(() => {
  function updateDatingTime() {
    const startDate = new Date("2024-09-21T00:00:00");
    const now = new Date();

    let diff = Math.floor((now - startDate) / 1000);

    const days = Math.floor(diff / 86400);
    diff %= 86400;

    const hours = Math.floor(diff / 3600);
    diff %= 3600;

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    setDatingTime(`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`);
  }

  updateDatingTime();
  const timer = setInterval(updateDatingTime, 1000);

  return () => clearInterval(timer);
}, []);

  useEffect(() => {
    loadEverything();

    let id = localStorage.getItem("visitor_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("visitor_id", id);
    }

    const refreshInterval = setInterval(() => {
      loadPhotos();
      loadAlbums();
      loadLinks();
      loadNotifications();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (viewerIndex === null) return;

      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") previousPhoto();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerIndex, photos, selectedAlbum]);

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return links;

    return links.filter((link) => {
      return (
        link.url?.toLowerCase().includes(q) ||
        link.title?.toLowerCase().includes(q) ||
        link.custom_name?.toLowerCase().includes(q) ||
        link.description?.toLowerCase().includes(q) ||
        link.categories?.name?.toLowerCase().includes(q)
      );
    });
  }, [links, search]);

  const filteredPhotos = useMemo(() => {
    if (selectedAlbum === "ALL") return photos;

    return photos.filter((photo) =>
      photo.photo_albums?.some((pa) => pa.album_id === selectedAlbum)
    );
  }, [photos, selectedAlbum]);

  const currentPhoto =
    viewerIndex === null ? null : filteredPhotos[viewerIndex] || null;

  async function loadEverything() {
    await loadCategories();
    await loadLinks();
    await loadAlbums();
    await loadPhotos();
    await loadNotifications();
  }

  async function loadNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

      console.log("Notifications loaded:", data);

    if (error) {
      console.error("Error loading notifications:", error);
      return;
    }

    setNotifications(data || []);
  }

  async function createNotification(type, message) {
    const { error } = await supabase.from("notifications").insert([
      {
        type,
        message,
        read: false,
      },
    ]);

    if (error) {
      console.error("Error creating notification:", error);
      return;
    }

    
    await loadNotifications();
  }
  
  async function markNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) {
    console.error("Error marking notifications read:", error);
    return;
  }

  await loadNotifications();
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
  async function clearNotifications() {
  const confirmed = confirm("Are you sure you want to clear all notifications?");
  if (!confirmed) return;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .not("id", "is", null);

  if (error) {
    console.error("Error clearing notifications:", error);
    alert(error.message);
    return;
  }

  setNotifications([]);
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
    await loadCategories();
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

    try {
      const finalUrl = cleanUrl(url.trim());

      const previewRes = await fetch("/api/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: finalUrl }),
      });

      const preview = await previewRes.json();
      const uploadedImageUrl = await uploadToBucket("link-images", linkImageFile);

      const { error } = await supabase.from("links").insert([
        {
          url: finalUrl,
          custom_name: customName.trim() || null,
          category_id: categoryId || null,
          title: preview.title,
          description: preview.description,
          image: preview.image,
          custom_image: uploadedImageUrl,
        },
      ]);

      if (error) {
        console.error("Link save error:", error);
        alert("There was an error saving the link.");
        return;
      }

      await createNotification(
        "link",
        `${guestName || "Someone"} added a new link`
      );

      setUrl("");
      setCustomName("");
      setCategoryId("");
      setLinkImageFile(null);

      const fileInput = document.getElementById("linkImageInput");
      if (fileInput) fileInput.value = "";

      await loadLinks();
      await loadNotifications();
    } catch (err) {
      console.error("Save link failed:", err);
      alert("Save link failed. Check the console.");
    } finally {
      setUploadingLinkImage(false);
    }
  }

  async function deleteLink(linkId) {
    if (!confirm("Delete this link?")) return;

    await supabase.from("links").delete().eq("id", linkId);
    await loadLinks();
  }

  async function editLinkName(link) {
    const newName = prompt(
      "Enter a new name:",
      link.custom_name || link.title || ""
    );

    if (newName === null) return;

    await supabase
      .from("links")
      .update({ custom_name: newName.trim() || null })
      .eq("id", link.id);

    await loadLinks();
  }

  async function changeLinkCategory(linkId, newCategoryId) {
    await supabase
      .from("links")
      .update({ category_id: newCategoryId || null })
      .eq("id", linkId);

    await loadLinks();
  }

async function addReaction(linkId, emoji) {
  let visitorId = localStorage.getItem("visitor_id");

  if (!visitorId) {
    visitorId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("visitor_id", visitorId);
  }

  const { data: existingReaction, error: findError } = await supabase
    .from("reactions")
    .select("*")
    .eq("link_id", linkId)
    .eq("emoji", emoji)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (findError) {
    console.error("Reaction lookup error:", findError);
    alert("Reaction lookup failed. Check console.");
    return;
  }

  if (existingReaction) {
    const { error: deleteError } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existingReaction.id);

    if (deleteError) {
      console.error("Reaction delete error:", deleteError);
      alert("Reaction delete failed. This is probably a Supabase RLS policy issue.");
      return;
    }
  } 
  else {
  const { error: insertError } = await supabase.from("reactions").insert({
    link_id: linkId,
    emoji,
    visitor_id: visitorId,
  });

  if (insertError) {
    console.error("Reaction insert error:", insertError);
    alert("Reaction insert failed. Check console.");
    return;
  }

  await createNotification(
    "reaction",
    `${guestName.trim() || "Someone"} reacted ${emoji} to a link`
  );
}
  await loadLinks();
}

async function addComment(linkId, text) {
  if (!text.trim()) return;

  const name = guestName.trim() || "Anonymous";

  await supabase.from("comments").insert({
    link_id: linkId,
    guest_name: name,
    comment: text.trim(),
  });

  await createNotification("comment", `${name} commented on a link`);

  await loadLinks();
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

  await createNotification(
    "album",
    `${guestName.trim() || "Someone"} created album "${newAlbum.trim()}"`
  );

  setNewAlbum("");
  await loadAlbums();
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

    try {
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
          console.error("Photo insert error:", error);
          continue;
        }

        if (photoAlbumId && newPhoto?.id) {
          await supabase.from("photo_albums").insert({
            photo_id: newPhoto.id,
            album_id: photoAlbumId,
          });
        }
      }

      await createNotification(
        "photo",
        `${guestName || "Someone"} uploaded photo(s)`
      );

      setPhotoFiles([]);
      setPhotoCaption("");
      setPhotoAlbumId("");

      const input = document.getElementById("photoUploadInput");
      if (input) input.value = "";

      await loadPhotos();
      await loadAlbums();
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Photo upload failed. Check the console.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePhoto(photoId) {
    if (!confirm("Delete this photo?")) return;

    await supabase.from("photo_albums").delete().eq("photo_id", photoId);
    await supabase.from("photos").delete().eq("id", photoId);

    setOpenPhotoMenu(null);
    setViewerIndex(null);

    await loadPhotos();
  }

  async function addPhotoToAlbum(photoId) {
    if (albums.length === 0) {
      alert("Create an album first.");
      return;
    }

    const albumName = prompt(
      `Type the album name:\n\n${albums.map((a) => a.name).join("\n")}`
    );

    if (!albumName) return;

    const album = albums.find(
      (a) => a.name.toLowerCase() === albumName.trim().toLowerCase()
    );

    if (!album) {
      alert("Album not found.");
      return;
    }

    const { error } = await supabase.from("photo_albums").insert({
      photo_id: photoId,
      album_id: album.id,
    });

    if (error) {
      console.error("Add to album error:", error);
      alert("Could not add photo to album.");
      return;
    }

    setOpenPhotoMenu(null);
    await loadPhotos();
  }

  function downloadPhoto(photo) {
    const a = document.createElement("a");
    a.href = photo.image_url;
    a.download = "photo.jpg";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openViewer(index) {
    setViewerIndex(index);
    setOpenPhotoMenu(null);
  }

  function closeViewer() {
    setViewerIndex(null);
    setOpenPhotoMenu(null);
  }

  function nextPhoto() {
    if (filteredPhotos.length === 0) return;
    setViewerIndex((prev) =>
      prev === null ? 0 : (prev + 1) % filteredPhotos.length
    );
  }

  function previousPhoto() {
    if (filteredPhotos.length === 0) return;
    setViewerIndex((prev) =>
      prev === null
        ? 0
        : (prev - 1 + filteredPhotos.length) % filteredPhotos.length
    );
  }

  function handleTouchEnd(e) {
    if (touchStartX === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextPhoto();
      else previousPhoto();
    }

    setTouchStartX(null);
  }

  return (
    <main className="page">
      <header className="hero">
        <div className="heroTop">
          <h1>THE APP</h1>
          <Link href="/messages" className="messagesHomeButton">
  💬
</Link>

          <button
  className="bombButton"
  onClick={async () => {
    const nextValue = !showNotifications;
    setShowNotifications(nextValue);

    if (nextValue) {
      await markNotificationsRead();
    }
  }}
>
  💣
  {unreadNotifications > 0 && (
    <span className="notificationBadge">{unreadNotifications}</span>
  )}
</button>
        </div>

        <p></p>

        <div className="datingCounter">
  <h2>Nimori🤫</h2>
  <p>{datingTime}</p>
</div>

        {showNotifications && (
          <div className="notificationPanel">
  <div className="notificationHeader">
    <h3>Notifications</h3>

    <button
      className="clearNotificationsBtn"
      onClick={clearNotifications}
    >
      Clear All
    </button>
  </div>
            {notifications.length === 0 ? (
              <p>No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="notificationItem">
                  {n.message}
                </div>
              ))
            )}
          </div>
        )}
      </header>

      <DropdownSection title="Add a Link🔗" defaultOpen={false}>
        <div className="linkHeader">
          {linkScreen === "main" ? (
            <button
              className="smallIconButton"
              onClick={() => setLinkScreen("createCategory")}
            >
              +
            </button>
          ) : (
            <button className="backButton" onClick={() => setLinkScreen("main")}>
              Back
            </button>
          )}

          <h2>
            {linkScreen === "main" && "Add a Link"}
            {linkScreen === "createCategory" && "Create Category"}
            {linkScreen === "searchLinks" && "Search Links"}
          </h2>

          {linkScreen === "main" ? (
            <button
              className="smallIconButton"
              onClick={() => setLinkScreen("searchLinks")}
            >
              🔍
            </button>
          ) : (
            <div style={{ width: "44px" }} />
          )}
        </div>

        {linkScreen === "main" && (
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

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
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
        )}

        {linkScreen === "createCategory" && (
          <div className="form">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Example: School, Music, Videos"
            />

            <button
              onClick={async () => {
                await createCategory();
                setLinkScreen("main");
              }}
            >
              Add Category
            </button>
          </div>
        )}

        {linkScreen === "searchLinks" && (
          <input
            className="fullInput"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, URL, or description"
          />
        )}
      </DropdownSection>

      <DropdownSection title="Photos📸" defaultOpen={false}>
        <div className="photosHeader">
          <h2>
            {photoScreen === "main" && "Photos"}
            {photoScreen === "createAlbum" && "Create Album"}
            {photoScreen === "uploadPhotos" && "Upload Photos"}
          </h2>

          {photoScreen === "main" ? (
            <div className="plusMenuWrap">
              <button
                className="plusButton"
                onClick={() => setShowPhotoTools(!showPhotoTools)}
              >
                +
              </button>

              {showPhotoTools && (
                <div className="plusMenu">
                  <button
                    onClick={() => {
                      setPhotoScreen("createAlbum");
                      setShowPhotoTools(false);
                    }}
                  >
                    Create Album
                  </button>

                  <button
                    onClick={() => {
                      setPhotoScreen("uploadPhotos");
                      setShowPhotoTools(false);
                    }}
                  >
                    Upload Photos
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="backButton" onClick={() => setPhotoScreen("main")}>
              Back
            </button>
          )}
        </div>

        {photoScreen === "createAlbum" && (
          <div className="photoTools">
            <div className="form">
              <input
                value={newAlbum}
                onChange={(e) => setNewAlbum(e.target.value)}
                placeholder="Example: Vacation, Friends, School"
              />

              <button
                onClick={async () => {
                  await createAlbum();
                  setPhotoScreen("main");
                }}
              >
                Add Album
              </button>
            </div>
          </div>
        )}

        {photoScreen === "uploadPhotos" && (
          <div className="photoTools">
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

              <select
                value={photoAlbumId}
                onChange={(e) => setPhotoAlbumId(e.target.value)}
              >
                <option value="">Only ALL album</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    Also add to {album.name}
                  </option>
                ))}
              </select>

              <button
                onClick={async () => {
                  await uploadPhoto();
                  setPhotoScreen("main");
                }}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto
                  ? "Compressing & Uploading..."
                  : `Upload ${
                      photoFiles.length > 1
                        ? photoFiles.length + " Photos"
                        : "Photo"
                    }`}
              </button>
            </div>
          </div>
        )}

        {photoScreen === "main" && (
          <>
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

            <div
  className="photoGrid"
  style={{
    maxHeight: "70vh",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: "8px",
  }}
>
  {filteredPhotos.map((photo, index) => (
                <div className="photoCard" key={photo.id}>
                  <div className="photoMenuWrap">
                    <button
                      className="photoMenuButton"
                      onClick={() =>
                        setOpenPhotoMenu(
                          openPhotoMenu === photo.id ? null : photo.id
                        )
                      }
                    >
                      ⋯
                    </button>

                    {openPhotoMenu === photo.id && (
                      <div className="photoMenu">
                        <button onClick={() => downloadPhoto(photo)}>
                          Download
                        </button>
                        <button onClick={() => addPhotoToAlbum(photo.id)}>
                          Add to Album
                        </button>
                        <button
                          className="deleteBtn"
                          onClick={() => deletePhoto(photo.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <img
                    src={photo.image_url}
                    alt=""
                    onClick={() => openViewer(index)}
                  />

                  <p>{photo.caption || " "}</p>

                  <span>
                    Albums:{" "}
                    {photo.photo_albums?.length
                      ? [
                          "ALL",
                          ...photo.photo_albums.map((pa) => pa.albums?.name),
                        ].join(", ")
                      : "ALL"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
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

      {currentPhoto && (
        <div className="viewerOverlay" onClick={closeViewer}>
          <div
            className="viewerContent"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={handleTouchEnd}
          >
            <button className="viewerClose" onClick={closeViewer}>
              ×
            </button>

            <button className="viewerArrow viewerArrowLeft" onClick={previousPhoto}>
              ‹
            </button>

            <button className="viewerArrow viewerArrowRight" onClick={nextPhoto}>
              ›
            </button>

            <div className="viewerMenuWrap">
              <button
                className="viewerMenuButton"
                onClick={() =>
                  setOpenPhotoMenu(openPhotoMenu === "viewer" ? null : "viewer")
                }
              >
                ⋯
              </button>

              {openPhotoMenu === "viewer" && (
                <div className="viewerMenu">
                  <button onClick={() => downloadPhoto(currentPhoto)}>
                    Download
                  </button>
                  <button onClick={() => addPhotoToAlbum(currentPhoto.id)}>
                    Add to Album
                  </button>
                  <button
                    className="deleteBtn"
                    onClick={() => deletePhoto(currentPhoto.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <img className="viewerImage" src={currentPhoto.image_url} alt="" />

            <div className="viewerInfo">
              <p>{currentPhoto.caption || "No caption"}</p>
              <span>
                Albums:{" "}
                {currentPhoto.photo_albums?.length
                  ? [
                      "ALL",
                      ...currentPhoto.photo_albums.map((pa) => pa.albums?.name),
                    ].join(", ")
                  : "ALL"}
              </span>
            </div>
          </div>
        </div>
           )}
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
  const [customEmojiOpen, setCustomEmojiOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");

  const presetEmojis = ["👍", "❤️", "😂", "🔥"];

  const reactionCounts = {};
  link.reactions?.forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  const customEmojis = Object.keys(reactionCounts).filter(
    (emoji) => !presetEmojis.includes(emoji)
  );

  function submitCustomEmoji(e) {
    e.preventDefault();

    const emoji = customEmoji.trim();
    if (!emoji) return;

    onReact(link.id, emoji);
    setCustomEmoji("");
    setCustomEmojiOpen(false);
  }

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
        {presetEmojis.map((emoji) => (
          <button key={emoji} onClick={() => onReact(link.id, emoji)}>
            {emoji} {reactionCounts[emoji] || 0}
          </button>
        ))}

        {customEmojis.map((emoji) => (
          <button key={emoji} onClick={() => onReact(link.id, emoji)}>
            {emoji} {reactionCounts[emoji] || 0}
          </button>
        ))}

        <button onClick={() => setCustomEmojiOpen(!customEmojiOpen)}>
          ➕
        </button>
      </div>

      {customEmojiOpen && (
        <form className="emojiForm" onSubmit={submitCustomEmoji}>
          <input
            autoFocus
            value={customEmoji}
            onChange={(e) => setCustomEmoji(e.target.value)}
            placeholder="Pick emoji"
            maxLength={4}
          />

          <button type="submit">React</button>
        </form>
      )}

      <div className="comments">
        <h3>Comments</h3>

        {link.comments?.length === 0 && (
          <p className="emptyText">No comments yet.</p>
        )}

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