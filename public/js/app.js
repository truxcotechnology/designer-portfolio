// ==================== STATE ====================
let currentUser = null;
let currentPage = "logos";
let currentUploadType = null;
let lightboxCurrentIndex = 0;
let lightboxCurrentType = null;
let lightboxZoom = 1;
let pendingNavigation = null;
let navigationItems = [];
let galleryDataByType = {};

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  checkStoredSession();
  loadNavigation();
  setupEventListeners();
  setupScreenshotProtection();
  setupScrollEffects();

  // 🔐 Show login modal if user is not logged in
  if (!currentUser) {
    openAuthModal();
  }

  // ✅ SILENT NOTIFICATION AFTER 10 SECONDS
  setTimeout(() => {
    showNotification("hlo", "info");
  }, 10000);
});

// ==================== NAVIGATION MANAGEMENT ====================
async function loadNavigation() {
  try {
    const res = await fetch("/api/navigation");
    navigationItems = await res.json();
    renderNavigation();
    
    for (let item of navigationItems) {
      await loadGalleryForType(item.folder);
      renderGalleryForType(item.folder);
    }

    // ✅ OPEN DEFAULT PAGE
    if (navigationItems.length > 0) {
      navigateTo(navigationItems[0].folder);
    }

  } catch (err) {
    console.error("Failed to load navigation:", err);
    navigationItems = [];
  }
}

function renderNavigation() {
  const navMenu = document.getElementById("navMenu");
  
  // Remove old nav items (keep only auth item)
  const navItems = navMenu.querySelectorAll(".nav-item:not(.nav-auth)");
  navItems.forEach(item => item.remove());

  // Add navigation items before auth
  const authItem = navMenu.querySelector(".nav-item.nav-auth");
  navigationItems.forEach(item => {
    const li = document.createElement("li");
    li.className = "nav-item";
    li.innerHTML = `
      <a 
        href="#${item.folder}"
        onclick="handleProtectedNav('${item.folder}')"
        class="nav-link"
        data-page="${item.folder}"
      >
        <i class="fas ${item.icon}"></i> ${item.label}
      </a>
    `;
    navMenu.insertBefore(li, authItem);
  });
}

async function addNavigationItem() {
  const label = document.getElementById("navItemLabel").value.trim();
  const icon = document.getElementById("navItemIcon").value.trim();

  if (!label || !icon) {
    showNotification("Label and icon are required", "error");
    return;
  }

  try {
    const res = await fetch("/api/navigation/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, icon }),
    });

    const data = await res.json();

    if (data.success) {
      showNotification(`Navigation item "${label}" added successfully`, "success");
      document.getElementById("navItemLabel").value = "";
      document.getElementById("navItemIcon").value = "";
      
      // Reload navigation
      await loadNavigation();
      updateNavManagementUI();
    } else {
      showNotification(data.message || "Failed to add navigation item", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Error adding navigation item", "error");
  }
}

async function deleteNavigationItem(id) {
  if (!confirm("Delete this navigation item? This cannot be undone.")) return;

  const deleteFolder = confirm("Also delete the associated folder and all files?");

  try {
    const res = await fetch(`/api/navigation/${id}?deleteFolder=${deleteFolder}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (data.success) {
      showNotification("Navigation item deleted", "success");
      await loadNavigation();
      updateNavManagementUI();
    } else {
      showNotification(data.message || "Failed to delete", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Error deleting navigation item", "error");
  }
}

function updateNavManagementUI() {
  const navItemsList = document.getElementById("navItemsList");
  navItemsList.innerHTML = navigationItems
    .map(
      (item) => `
    <div class="nav-item-card">
      <div class="nav-item-info">
        <div class="nav-item-icon">
          <i class="fas ${item.icon}"></i>
        </div>
        <div class="nav-item-details">
          <h4>${item.label}</h4>
          <small>Folder: ${item.folder}</small>
          <p class="nav-item-stats">${galleryDataByType[item.folder]?.length || 0} files</p>
        </div>
      </div>
      <button 
        class="btn-danger-small" 
        onclick="deleteNavigationItem(${item.id})"
        title="Delete navigation item"
      >
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `
    )
    .join("");
}

function openNavManagement() {
  updateNavManagementUI();
  document.getElementById("navManagementModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeNavManagement() {
  document.getElementById("navManagementModal").classList.add("hidden");
  document.body.style.overflow = "";
}

// ==================== GALLERY LOADING ====================
async function loadGalleryForType(type) {
  try {
    const res = await fetch(`/uploads/${type}`);
    const files = await res.json();

    galleryDataByType[type] = files.map(url => ({
      url: url,
      name: url.split("/").pop(),
    }));

    // ✅ PRELOAD IMAGES
    galleryDataByType[type].forEach(item => {
      const img = new Image();
      img.src = item.url;
    });

    return galleryDataByType[type];
  } catch (err) {
    console.error(`Failed to load ${type}:`, err);
    galleryDataByType[type] = [];
    return [];
  }
}

function renderGalleryForType(type) {
  const items = galleryDataByType[type] || [];
  const pageId = type + "Page";
  const galleryId = type + "Gallery";
  const emptyId = type + "Empty";

  // Create page if it doesn't exist
  let page = document.getElementById(pageId);
  if (!page) {
    page = document.createElement("section");
    page.id = pageId;
    page.className = "page protected-page";
    
    const navItem = navigationItems.find(n => n.folder === type);
    const label = navItem ? navItem.label : type;
    
    page.innerHTML = `
      <div class="content-container">
<div class="admin-toolbar hidden" id="${type}AdminToolbar">          <button class="btn-primary" onclick="openUploadModal('${type}')">
            <i class="fas fa-cloud-upload-alt"></i> Upload to ${label}
          </button>
        </div>

        <div class="gallery-filter">
          <button class="filter-btn active" onclick="filterGallery('all', this)">
            All
          </button>
          <button class="filter-btn" onclick="filterGallery('recent', this)">
            Recent
          </button>
        </div>

        <div class="gallery masonry" id="${galleryId}"></div>

        <div id="${emptyId}" class="empty-state" style="display: none">
          <i class="fas fa-image"></i>
          <h3>No Files Yet</h3>
          <p>Check back soon for amazing content!</p>
        </div>
      </div>
    `;

    document.getElementById("dynamicPagesContainer").appendChild(page);
  }

  // Render gallery items
  const gallery = document.getElementById(galleryId);
  const emptyState = document.getElementById(emptyId);

  if (!items || items.length === 0) {
    gallery.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  gallery.innerHTML = items
    .map(
      (item, index) => `
    <div class="gallery-item">
      <div class="item-image-wrapper">
        <img src="${item.url}" alt="${item.name}" class="item-image" loading="lazy">
        <div class="item-overlay" onclick="openLightbox('${type}', ${index})">
          <i class="fas fa-expand"></i>
        </div>
        ${
          currentUser && currentUser.role === "admin"
            ? `
          <button class="delete-btn" onclick="deleteContent('${item.url}')">
            <i class="fas fa-trash"></i>
          </button>
        `
            : ""
        }
      </div>
    </div>
  `
    )
    .join("");
    // ✅ SHOW ADMIN TOOLBAR AFTER RENDER
if (currentUser && currentUser.role === "admin") {
  const toolbar = document.getElementById(`${type}AdminToolbar`);
  if (toolbar) toolbar.style.display = "flex";
}
}

// ==================== SCREENSHOT PROTECTION ====================
function setupScreenshotProtection() {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showNotification("Right-click is disabled", "warning");
  });

  document.addEventListener("dragstart", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => e.preventDefault());
  document.addEventListener("copy", (e) => {
    e.preventDefault();
    showNotification("Copying is disabled", "warning");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "PrintScreen") {
      e.preventDefault();
      showScreenshotGuard();
    }

    if (e.ctrlKey) {
      const blockedKeys = ["u", "s", "p", "c", "x", "a"];
      if (blockedKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
        showNotification("Action blocked", "warning");
      }
    }

    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key))) {
      e.preventDefault();
    }
  });

  window.addEventListener("blur", activateWatermark);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) activateWatermark();
    else deactivateWatermark();
  });

  setInterval(() => {
    if (
      window.outerWidth - window.innerWidth > 160 ||
      window.outerHeight - window.innerHeight > 160
    ) {
      activateWatermark();
    }
  }, 1000);

  document.body.classList.add("no-select");
}

function activateWatermark() {
  const overlay = document.getElementById("watermarkOverlay");
  if (overlay) overlay.classList.add("active");
}

function deactivateWatermark() {
  const overlay = document.getElementById("watermarkOverlay");
  if (overlay) {
    setTimeout(() => overlay.classList.remove("active"), 300);
  }
}

function showScreenshotGuard() {
  const guard = document.getElementById("screenshotGuard");
  guard.classList.remove("hidden");
  navigator.clipboard?.writeText("").catch(() => {});
  setTimeout(() => {
    guard.classList.add("hidden");
  }, 2000);
}

// ==================== SCROLL EFFECTS ====================
function setupScrollEffects() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// ==================== SESSION MANAGEMENT ====================
function checkStoredSession() {
  const storedUser = localStorage.getItem("currentUser");

  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      updateUIForLoggedInUser();
    } catch (error) {
      console.error("Session parse error:", error);
      updateUIForLoggedOutUser();
    }
  } else {
    updateUIForLoggedOutUser();
  }
}

function updateUIForLoggedInUser() {
  const authButton = document.getElementById("authButton");
  const userMenu = document.getElementById("userMenu");
  const adminDropdown = document.getElementById("adminNavDropdown");

  authButton.style.display = "none";
  userMenu.style.display = "block";

  const initial = currentUser.username.charAt(0).toUpperCase();
  document.getElementById("userAvatar").textContent = initial;
  document.getElementById("userAvatarLg").textContent = initial;
  document.getElementById("userGreeting").textContent = currentUser.username;
  document.getElementById("dropdownName").textContent = currentUser.username;
  document.getElementById("dropdownRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Member";

  // Show admin options if admin
  if (currentUser.role === "admin") {
    adminDropdown.style.display = "block";
    navigationItems.forEach(item => {
      const toolbar = document.getElementById(`${item.folder}AdminToolbar`);
      if (toolbar) toolbar.style.display = "flex";
    });
  } else {
    adminDropdown.style.display = "none";
    navigationItems.forEach(item => {
      const toolbar = document.getElementById(`${item.folder}AdminToolbar`);
      if (toolbar) toolbar.style.display = "none";
    });
  }

  updateProfilePage();
}

function updateUIForLoggedOutUser() {
  const authButton = document.getElementById("authButton");
  const userMenu = document.getElementById("userMenu");

  authButton.style.display = "inline-flex";
  userMenu.style.display = "none";

  navigationItems.forEach(item => {
    const toolbar = document.getElementById(`${item.folder}AdminToolbar`);
    if (toolbar) toolbar.style.display = "none";
  });
}

function updateProfilePage() {
  if (!currentUser) return;

  document.getElementById("profileName").textContent =
    currentUser.fullName || currentUser.username;
  document.getElementById("profileRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Member";
  document.getElementById("profileEmail").textContent = currentUser.email;
  document.getElementById("profileDate").textContent =
    new Date().toLocaleDateString();
  document.getElementById("profileType").textContent =
    currentUser.role === "admin" ? "Admin" : "Free";
}

// ==================== PROTECTED NAVIGATION ====================
function handleProtectedNav(page) {
  if (currentUser) {
    navigateTo(page);
  } else {
    pendingNavigation = page;
    openAuthModal();
    showNotification("Please login to access this content", "info");
  }
}

// ==================== AUTH ====================
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      currentUser = {
        id: data.role === "admin" ? 1 : 2,
        username: username,
        fullName: data.role === "admin" ? "Admin" : "User",
        email: data.role === "admin" ? "admin@truxco.tech" : "user@gmail.com",
        role: data.role,
        createdAt: new Date().toISOString(),
      };

      completeLogin();
    } else {
      showNotification("Invalid credentials", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Server error. Try again.", "error");
  }
}
function completeLogin() {
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  updateUIForLoggedInUser();
  closeAuthModal();
  showNotification(`Welcome back, ${currentUser.username}!`, "success");

  // ✅ 🔥 PRE-RENDER ALL GALLERIES (IMPORTANT)
  navigationItems.forEach(item => {
    renderGalleryForType(item.folder);
  });

  // Navigate
  if (pendingNavigation) {
    navigateTo(pendingNavigation);
    pendingNavigation = null;
  } else {
    if (navigationItems.length > 0) {
      navigateTo(navigationItems[0].folder);
    }
  }

  if (currentUser.role === "admin") {
    loadAdminContent();
  }
}


async function handleLogout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  updateUIForLoggedOutUser();
  closeUserDropdown();

  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  openAuthModal();
  showNotification("Logged out successfully", "success");
}

// ==================== MODAL FUNCTIONS ====================
function openAuthModal() {
  document.getElementById("authModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAuthModal() {
  document.getElementById("authModal").classList.add("hidden");
  document.body.style.overflow = "";

  const fields = ["loginUsername", "loginPassword"];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.className = "fas fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fas fa-eye";
  }
}

function toggleUserDropdown() {
  const menu = document.getElementById("dropdownMenu");
  menu.classList.toggle("show");
}

function closeUserDropdown() {
  const menu = document.getElementById("dropdownMenu");
  if (menu) menu.classList.remove("show");
}

function openUploadModal(uploadType) {
  currentUploadType = uploadType;
  const navItem = navigationItems.find(n => n.folder === uploadType);
  const label = navItem ? navItem.label : uploadType;

  document.getElementById("uploadTitle").textContent = `Upload to ${label}`;
  document.getElementById("uploadModal").classList.remove("hidden");
}

function closeUploadModal() {
  document.getElementById("uploadModal").classList.add("hidden");
  document.getElementById("filePreview").style.display = "none";
  document.getElementById("uploadArea").style.display = "block";
  document.getElementById("fileInput").value = "";
  document.getElementById("fileTitle").value = "";
  document.body.style.overflow = "";
}

// ==================== UPLOAD HANDLING ====================
function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("uploadArea").classList.add("dragover");
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("uploadArea").classList.remove("dragover");
}

function handleDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("uploadArea").classList.remove("dragover");

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(event) {
  const files = event.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function processFile(file) {
  if (!file.type.startsWith("image/")) {
    showNotification("Please select an image file", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showNotification("File size must be less than 5MB", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("previewImage").src = e.target.result;
    document.getElementById("filePreview").style.display = "block";
    document.getElementById("uploadArea").style.display = "none";
    document.getElementById("fileTitle").value = file.name.replace(/\.[^/.]+$/, "");
  };
  reader.readAsDataURL(file);
}

function removePreview() {
  document.getElementById("filePreview").style.display = "none";
  document.getElementById("uploadArea").style.display = "block";
  document.getElementById("fileInput").value = "";
  document.getElementById("fileTitle").value = "";
}

async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const fileTitle = document.getElementById("fileTitle").value.trim();

  const file = fileInput.files[0];
  if (!file) return alert("Select a file first");

  if (!fileTitle) {
    showNotification("Please enter title", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", fileTitle); // ✅ send title

  try {
    const res = await fetch(`/upload?type=${currentUploadType}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      showNotification("File uploaded successfully", "success");
      closeUploadModal();

      await loadGalleryForType(currentUploadType);
      renderGalleryForType(currentUploadType);
    } else {
      showNotification("Upload failed: " + data.message, "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Upload error", "error");
  }
}

async function deleteContent(fileUrl) {
  if (!confirm("Are you sure you want to delete this file?")) return;

  try {
    const url = new URL(fileUrl, window.location.origin);
    const segments = url.pathname.split("/");

    const filename = segments.pop();
    const type = segments.pop();

    const res = await fetch(`/uploads/${type}/${filename}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (data.success) {
      showNotification("File deleted successfully", "success");
      await loadGalleryForType(type);
      renderGalleryForType(type);
    } else {
      showNotification(data.message || "Delete failed", "error");
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
  const navMenu = document.getElementById("navMenu");
  const hamburger = document.getElementById("hamburger");
  navMenu.classList.remove("active");
  hamburger.classList.remove("active");

  closeUserDropdown();

  // Admin page protection
  if (page === "admin" && (!currentUser || currentUser.role !== "admin")) {
    showNotification("Admin access required", "error");
    return;
  }

  // Profile/Settings page protection
  if (page === "profile" && !currentUser) {
    openAuthModal();
    pendingNavigation = page;
    return;
  }

  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  // Show target page
  const pageElement = document.getElementById(page + "Page");
  if (pageElement) {
    pageElement.classList.add("active");
  }

  // Update nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navLink) {
    navLink.classList.add("active");
  }

  // Load/render content
  if (navigationItems.find(n => n.folder === page)) {
    renderGalleryForType(page);
  }

  if (page === "admin") {
    loadAdminContent();
  }
  if (page === "profile") {
    updateProfilePage();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  currentPage = page;
}

function toggleMobileMenu() {
  const navMenu = document.getElementById("navMenu");
  const hamburger = document.getElementById("hamburger");
  navMenu.classList.toggle("active");
  hamburger.classList.toggle("active");
}

function filterGallery(filter, btn) {
  btn.closest(".gallery-filter")
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  if (navigationItems.find(n => n.folder === currentPage)) {
    renderGalleryForType(currentPage);
  }
}

// ==================== LIGHTBOX WITH ZOOM ====================
function openLightbox(type, index) {
  lightboxCurrentType = type;
  lightboxCurrentIndex = index;
  lightboxZoom = 1;

  const items = galleryDataByType[type] || [];
  const item = items[index];

  if (!item) return;

  const img = document.getElementById("lightboxImage");
  img.src = item.url;
  img.style.transform = `scale(1)`;

  document.getElementById("zoomLevel").textContent = "100%";
  document.getElementById("lightbox").classList.remove("hidden");
  document.body.style.overflow = "hidden";

  setupLightboxZoom();
}

function closeLightbox() {
  document.getElementById("lightbox").classList.add("hidden");
  document.body.style.overflow = "";
  lightboxZoom = 1;
}

function navigateLightbox(direction) {
  const items = galleryDataByType[lightboxCurrentType] || [];
  if (!items || items.length === 0) return;

  lightboxCurrentIndex += direction;

  if (lightboxCurrentIndex < 0) lightboxCurrentIndex = items.length - 1;
  if (lightboxCurrentIndex >= items.length) lightboxCurrentIndex = 0;

  const item = items[lightboxCurrentIndex];
  const img = document.getElementById("lightboxImage");

  lightboxZoom = 1;
  img.src = item.url;
  img.style.transform = `scale(1)`;

  document.getElementById("zoomLevel").textContent = "100%";
}

function zoomLightboxImage(zoomChange) {
  const img = document.getElementById("lightboxImage");
  const newZoom = lightboxZoom + zoomChange;

  if (newZoom >= 0.5 && newZoom <= 4) {
    lightboxZoom = newZoom;
    img.style.transform = `scale(${lightboxZoom})`;
    document.getElementById("zoomLevel").textContent = Math.round(lightboxZoom * 100) + "%";
  }
}

function setupLightboxZoom() {
  const lightboxContent = document.getElementById("lightboxContent");

  lightboxContent.onwheel = null;

  lightboxContent.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomChange = e.deltaY > 0 ? -0.1 : 0.1;
      zoomLightboxImage(zoomChange);
    }
  }, { passive: false });

  let lastDistance = 0;
  lightboxContent.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (lastDistance > 0) {
        const delta = distance - lastDistance;
        const zoomChange = delta > 0 ? 0.05 : -0.05;
        zoomLightboxImage(zoomChange);
      }

      lastDistance = distance;
    }
  }, { passive: false });

  lightboxContent.addEventListener("touchend", () => {
    lastDistance = 0;
  });
}

async function loadAdminContent() {
  if (!currentUser || currentUser.role !== "admin") return;

  let totalFiles = 0;
  for (let item of navigationItems) {
    const files = galleryDataByType[item.folder] || [];
    totalFiles += files.length;
  }

  document.getElementById("adminNavCount").textContent = navigationItems.length;
  document.getElementById("adminTotalFiles").textContent = totalFiles;
  document.getElementById("adminUserCount").textContent = "1";
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer");

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;

  const iconMap = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };

  notification.innerHTML = `
    <i class="fas fa-${iconMap[type] || "info-circle"}"></i>
    <span>${message}</span>
  `;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("removing");
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      const authModal = document.getElementById("authModal");
      if (e.target.closest("#authModal") && !currentUser) {
        return;
      }
      closeAuthModal();
      closeUploadModal();
      closeNavManagement();
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-dropdown")) {
      closeUserDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox.classList.contains("hidden")) {
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          zoomLightboxImage(0.1);
        }
        if (e.key === "-") {
          e.preventDefault();
          zoomLightboxImage(-0.1);
        }
        if (e.key === "0") {
          e.preventDefault();
          lightboxZoom = 1;
          document.getElementById("lightboxImage").style.transform = `scale(1)`;
          document.getElementById("zoomLevel").textContent = "100%";
        }
      }
    }
  });
}

async function changePassword() {
  const res = await fetch("/admin/change-password", {
    method: "POST",
  });

  const data = await res.json();

  if (data.success) {
    alert("New user credentials sent to email");
  } else {
    alert("Failed");
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}