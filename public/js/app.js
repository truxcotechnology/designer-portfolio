// ==================== STATE ====================
let currentUser = null;
let currentPage = "logos";
let currentUploadType = null;
let lightboxCurrentIndex = 0;
let lightboxCurrentType = null;
let pendingNavigation = null;
let currentGalleryItems = [];
let logosGalleryItems = [];
let bannersGalleryItems = [];
let designsGalleryItems = [];
let printsGalleryItems = [];
let lightboxItems = [];

// Registered users storage
let registeredUsers = JSON.parse(
  localStorage.getItem("registeredUsers") || "[]",
);

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  checkStoredSession();
  updateStats();
  setupEventListeners();
  setupScreenshotProtection();
  setupScrollEffects();

  // 🔐 Show login modal if user is not logged in
  if (!currentUser) {
    openAuthModal();
  }
});

// ==================== SCREENSHOT PROTECTION ====================
function setupScreenshotProtection() {
  // Disable right click globally
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showNotification("Right-click is disabled", "warning");
  });

  // Disable drag
  document.addEventListener("dragstart", (e) => e.preventDefault());

  // Disable text selection
  document.addEventListener("selectstart", (e) => e.preventDefault());

  // Disable copy
  document.addEventListener("copy", (e) => {
    e.preventDefault();
    showNotification("Copying is disabled", "warning");
  });

  // Disable key shortcuts
  document.addEventListener("keydown", (e) => {
    // PrintScreen
    if (e.key === "PrintScreen") {
      e.preventDefault();
      showScreenshotGuard();
    }

    // Ctrl combinations
    if (e.ctrlKey) {
      const blockedKeys = ["u", "s", "p", "c", "x", "a"];
      if (blockedKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
        showNotification("Action blocked", "warning");
      }
    }

    // DevTools
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key))
    ) {
      e.preventDefault();
    }
  });

  // Blur / tab switch protection
  window.addEventListener("blur", activateWatermark);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) activateWatermark();
    else deactivateWatermark();
  });

  // Periodic devtools detection
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
// ==================== AUTO RELOAD / HEARTBEAT ====================
function startAutoReloadLog() {
  setInterval(() => {
    console.log("hi");

    // If you actually want page reload every 10 sec, uncomment below
    // location.reload();
  }, 10000); // 10 seconds
}

// Call it on load
document.addEventListener("DOMContentLoaded", () => {
  startAutoReloadLog();
});

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

function addDynamicWatermark() {
  const watermark = document.createElement("div");
  watermark.innerText = `© 2026 Truxco Technologies. All rights reserved`;

  watermark.style.position = "fixed";
  watermark.style.top = "50%";
  watermark.style.left = "50%";
  watermark.style.transform = "translate(-50%, -50%) rotate(-30deg)";
  watermark.style.opacity = "0.15";
  watermark.style.fontSize = "40px";
  watermark.style.pointerEvents = "none";
  watermark.style.zIndex = "9999";

  document.body.appendChild(watermark);
}

function showScreenshotGuard() {
  const guard = document.getElementById("screenshotGuard");
  guard.classList.remove("hidden");

  // Copy blank content to clipboard to prevent screenshot
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
  const adminNavItem = document.getElementById("adminNavItem");

  authButton.style.display = "none";
  userMenu.style.display = "block";

  const initial = currentUser.username.charAt(0).toUpperCase();
  document.getElementById("userAvatar").textContent = initial;
  document.getElementById("userAvatarLg").textContent = initial;
  document.getElementById("userGreeting").textContent = currentUser.username;
  document.getElementById("dropdownName").textContent = currentUser.username;
  document.getElementById("dropdownRole").textContent =
    currentUser.role === "admin" ? "Administrator" : "Member";

  // Show/hide admin elements
  if (currentUser.role === "admin") {
    adminNavItem.style.display = "block";
    document.getElementById("logosAdminToolbar").style.display = "flex";
    document.getElementById("bannersAdminToolbar").style.display = "flex";
    document.getElementById("designsAdminToolbar").style.display = "flex";
    document.getElementById("printsAdminToolbar").style.display = "flex";
  } else {
    adminNavItem.style.display = "none";
    document.getElementById("logosAdminToolbar").style.display = "none";
    document.getElementById("bannersAdminToolbar").style.display = "none";
    document.getElementById("designsAdminToolbar").style.display = "none";
    document.getElementById("printsAdminToolbar").style.display = "none";
  }

  // Update profile page
  updateProfilePage();
}

function updateUIForLoggedOutUser() {
  const authButton = document.getElementById("authButton");
  const userMenu = document.getElementById("userMenu");
  const adminNavItem = document.getElementById("adminNavItem");

  authButton.style.display = "inline-flex";
  userMenu.style.display = "none";
  adminNavItem.style.display = "none";

  document.getElementById("logosAdminToolbar").style.display = "none";
  document.getElementById("bannersAdminToolbar").style.display = "none";
  document.getElementById("designsAdminToolbar").style.display = "none";
  document.getElementById("printsAdminToolbar").style.display = "none";
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
  // If user is logged in, navigate directly
  if (currentUser) {
    navigateTo(page);
    loadContent(page);
  } else {
    // Store the intended destination
    pendingNavigation = page;
    // Show login modal
    openAuthModal();
    showNotification("Please login to access this content", "info");
  }
}

function uploadFile() {
  console.log("Uploading type:", currentUploadType);
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first");
  const uploadType = document.getElementById("uploadTypeInput").value;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", uploadType);

  fetch(`/upload?type=${currentUploadType}`, {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then(async (data) => {
      if (data.success) {
        showNotification(
          `${currentUploadType} uploaded successfully`,
          "success",
        );
        closeUploadModal();

        if (currentUploadType === "logos") {
          await loadLogos();
        } else if (currentUploadType === "banners") {
          await loadBanners();
        } else if (currentUploadType === "designs") {
          await loadDesigns();
        } else if (currentUploadType === "prints") {
          await loadPrints();
        }
      } else {
        showNotification("Upload failed: " + data.message, "error");
      }
    })
    .catch((err) => {
      console.error(err);
      showNotification("Upload error", "error");
    });
}

// Load gallery dynamically
async function loadGallery(type) {
  const res = await fetch(`/uploads/${type}/`);
  if (!res.ok) throw new Error("Failed to fetch " + type);
  const files = await res.json();
  return files;
}

// Load on page load
window.onload = () => {
  loadGallery("logos");
  loadGallery("banners");
};

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
      //addDynamicWatermark();
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

  // Navigate to pending page if exists
  if (pendingNavigation) {
    navigateTo(pendingNavigation);
    loadContent(pendingNavigation);
    pendingNavigation = null;
  } else {
    navigateTo("logos");
  }

  // Load admin content if admin
  if (currentUser.role === "admin") {
    loadAdminContent();
  }
}

async function handleLogout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  updateUIForLoggedOutUser();
  closeUserDropdown();

  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  // Show login modal instead of navigating to home
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

  // Reset forms
  const fields = [
    "loginUsername",
    "loginPassword",
    "regFullName",
    "regUsername",
    "regEmail",
    "regPassword",
  ];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const agreeTerms = document.getElementById("agreeTerms");
  if (agreeTerms) agreeTerms.checked = false;
}

function switchToLogin() {
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");
  document.getElementById("loginTabBtn").classList.add("active");
  document.getElementById("registerTabBtn").classList.remove("active");
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
  document.getElementById("uploadTypeInput").value = uploadType;
  currentUploadType = uploadType;

  const uploadTitle = document.getElementById("uploadTitle");
  if (uploadType === "logos") {
    uploadTitle.textContent = "Upload Logo";
  } else if (uploadType === "banners") {
    uploadTitle.textContent = "Upload Banner";
  } else if (uploadType === "designs") {
    uploadTitle.textContent = "Upload Design";
  } else if (uploadType === "prints") {
    uploadTitle.textContent = "Upload Print";
  }
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
  // Validate file type
  if (!file.type.startsWith("image/")) {
    showNotification("Please select an image file", "error");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("File size must be less than 5MB", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("previewImage").src = e.target.result;
    document.getElementById("filePreview").style.display = "block";
    document.getElementById("uploadArea").style.display = "none";
    document.getElementById("fileTitle").value = file.name.replace(
      /\.[^/.]+$/,
      "",
    );
  };
  reader.readAsDataURL(file);
}

function removePreview() {
  document.getElementById("filePreview").style.display = "none";
  document.getElementById("uploadArea").style.display = "block";
  document.getElementById("fileInput").value = "";
  document.getElementById("fileTitle").value = "";
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    // localStorage might be full with base64 images
    console.warn("Storage full, clearing old data");
    showNotification(
      "Storage limit reached. Some data may not persist.",
      "warning",
    );
  }
}

// ==================== CONTENT LOADING ====================
function loadContent(type) {
  if (type === "logos") loadLogos();
  if (type === "banners") loadBanners();
  if (type === "designs") loadDesigns();
  if (type === "prints") loadPrints();
}

async function loadLogos() {
  const gallery = document.getElementById("logosGallery");
  const emptyState = document.getElementById("logosEmpty");

  try {
    const res = await fetch("/uploads/logos");
    const logos = await res.json();
    logosGalleryItems = logos.map((file) => ({
      url: file,
      name: file.split("/").pop(),
    }));

    if (!logos || logos.length === 0) {
      gallery.innerHTML = "";
      emptyState.style.display = "block";
      return [];
    }

    emptyState.style.display = "none";
    gallery.innerHTML = logosGalleryItems
      .map(
        (item, index) => `
      <div class="gallery-item">
        <div class="item-image-wrapper">
          <img src="${item.url}" alt="${item.name}" class="item-image" loading="lazy">

          <div class="item-overlay">
            <i class="fas fa-expand" onclick="openLightbox('logos', ${index})"></i>
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
    `,
      )
      .join("");

    return logosGalleryItems;
  } catch (err) {
    console.error(err);
    gallery.innerHTML = "";
    emptyState.style.display = "block";
    return [];
  }
}

async function loadBanners() {
  const gallery = document.getElementById("bannersGallery");
  const emptyState = document.getElementById("bannersEmpty");

  try {
    const res = await fetch("/uploads/banners");
    const banners = await res.json();

    if (!banners || banners.length === 0) {
      gallery.innerHTML = "";
      emptyState.style.display = "block";
      return [];
    }

    emptyState.style.display = "none";
    bannersGalleryItems = banners.map((filename) => ({
      url: `/uploads/banners/${filename}`,
      name: filename,
    }));

    gallery.innerHTML = bannersGalleryItems
      .map(
        (item, index) => `
      <div class="gallery-item">
        <div class="item-image-wrapper">

          <img src="${item.url}" alt="${item.name}" class="item-image" loading="lazy">

          <div class="item-overlay" onclick="openLightbox('banners', ${index})">
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
    `,
      )
      .join("");

    return bannersGalleryItems;
  } catch (err) {
    console.error(err);
    gallery.innerHTML = "";
    emptyState.style.display = "block";
    return [];
  }
}

async function loadPrints() {
  const gallery = document.getElementById("printsGallery");
  const emptyState = document.getElementById("printsEmpty");

  try {
    const res = await fetch("/uploads/prints");
    const prints = await res.json();

    if (!prints || prints.length === 0) {
      gallery.innerHTML = "";
      emptyState.style.display = "block";
      return [];
    }

    emptyState.style.display = "none";
    printsGalleryItems = prints.map((filename) => ({
      url: `/uploads/prints/${filename}`,
      name: filename,
    }));
    gallery.innerHTML = printsGalleryItems
      .map(
        (item, index) => `
      <div class="gallery-item">
        <div class="item-image-wrapper">

          <img src="${item.url}" alt="${item.name}" class="item-image" loading="lazy">

          <div class="item-overlay" onclick="openLightbox('prints', ${index})">
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
    `,
      )
      .join("");

    return printsGalleryItems;
  } catch (err) {
    console.error(err);
    gallery.innerHTML = "";
    emptyState.style.display = "block";
    return [];
  }
}

async function loadDesigns() {
  const gallery = document.getElementById("designsGallery");
  const emptyState = document.getElementById("designsEmpty");

  try {
    const res = await fetch("/uploads/designs");
    const designs = await res.json();

    if (!designs || designs.length === 0) {
      gallery.innerHTML = "";
      emptyState.style.display = "block";
      return [];
    }

    emptyState.style.display = "none";
    designsGalleryItems = designs.map((filename) => ({
      url: `/uploads/designs/${filename}`,
      name: filename,
    }));

    gallery.innerHTML = designsGalleryItems
      .map(
        (item, index) => `
      <div class="gallery-item">
        <div class="item-image-wrapper">
          
          <img src="${item.url}" alt="${item.name}" class="item-image" loading="lazy">

          <!-- Lightbox -->
          <div class="item-overlay" onclick="openLightbox('designs', ${index})">
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
    `,
      )
      .join("");

    return designsGalleryItems;
  } catch (err) {
    console.error(err);
    gallery.innerHTML = "";
    emptyState.style.display = "block";
    return [];
  }
}

async function loadAdminContent() {
  if (!currentUser || currentUser.role !== "admin") return;

  const logos = await loadLogos();
  const banners = await loadBanners();
  const prints = await loadPrints();
  const designs = await loadDesigns();
  document.getElementById("adminLogoCount").textContent = logos.length;
  document.getElementById("adminBannerCount").textContent = banners.length;
  document.getElementById("adminPrintCount").textContent = prints.length;
  document.getElementById("adminDesignCount").textContent = designs.length;
  document.getElementById("adminUserCount").textContent =
    registeredUsers.length + 1; // +1 for admin
}

function updateStats() {
  loadLogos().then((logos) => {
    document.getElementById("totalLogos").textContent = logos.length;
  });
  loadBanners().then((banners) => {
    document.getElementById("totalBanners").textContent = banners.length;
  });
  loadDesigns().then((designs) => {
    document.getElementById("totalDesigns").textContent = designs.length;
  });
  loadPrints().then((prints) => {
    document.getElementById("totalPrints").textContent = prints.length;
  });
}
async function deleteContent(fileUrl) {
  if (!confirm("Are you sure you want to delete this file?")) return;

  try {
    const url = new URL(fileUrl, window.location.origin);
    const segments = url.pathname.split("/");

    const filename = segments.pop();
    const type = segments.pop();

    console.log("DELETE:", `/uploads/${type}/${filename}`);

    const res = await fetch(`/uploads/${type}/${filename}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (data.success) {
      alert("Deleted successfully");

      if (type === "logos") await loadLogos();
      if (type === "designs") await loadDesigns();
      if (type === "prints") await loadPrints();
      if (type === "banners") await loadBanners();
    } else {
      alert(data.message || "Delete failed");
    }
  } catch (err) {
    console.error("Delete error:", err);
  }
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
  // Close mobile menu
  const navMenu = document.getElementById("navMenu");
  const hamburger = document.getElementById("hamburger");
  navMenu.classList.remove("active");
  hamburger.classList.remove("active");

  // Close dropdown
  closeUserDropdown();

  // Admin page protection
  if (page === "admin" && (!currentUser || currentUser.role !== "admin")) {
    showNotification("Admin access required", "error");
    return;
  }

  // Profile/Settings page protection
  if ((page === "profile" || page === "settings") && !currentUser) {
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

  // Load content for the page
  if (page === "logos") loadLogos();
  if (page === "banners") loadBanners();
  if (page === "designs") loadDesigns();
  if (page === "prints") loadPrints();
  if (page === "admin") loadAdminContent();
  if (page === "profile") updateProfilePage();

  // Scroll to top
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
  // Update active filter button
  btn
    .closest(".gallery-filter")
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // For now, just reload (could implement actual filtering)
  if (currentPage === "logos") loadLogos();
  if (currentPage === "banners") loadBanners();
  if (currentPage === "designs") loadDesigns();
  if (currentPage === "prints") loadPrints();
}

// ==================== LIGHTBOX ====================
function openLightbox(type, index) {
  lightboxCurrentType = type;
  lightboxCurrentIndex = index;

  let items;
  switch (type) {
    case "logos":
      items = logosGalleryItems;
      break;
    case "banners":
      items = bannersGalleryItems;
      break;
    case "designs":
      items = designsGalleryItems;
      break;
    case "prints":
      items = printsGalleryItems;
      break;
    default:
      items = [];
  }

  lightboxItems = items;
  const item = items[index];

  if (!item) return;

  document.getElementById("lightboxImage").src = item.url;
  document.getElementById("lightboxTitle").textContent = item.name;
  document.getElementById("lightboxDate").textContent =
    new Date().toLocaleDateString();
  document.getElementById("lightbox").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").classList.add("hidden");
  document.body.style.overflow = "";
}

function navigateLightbox(direction) {
  if (!lightboxItems || lightboxItems.length === 0) return;

  lightboxCurrentIndex += direction;

  if (lightboxCurrentIndex < 0) lightboxCurrentIndex = lightboxItems.length - 1;
  if (lightboxCurrentIndex >= lightboxItems.length) lightboxCurrentIndex = 0;

  const item = lightboxItems[lightboxCurrentIndex];
  document.getElementById("lightboxImage").src = item.url;
  document.getElementById("lightboxTitle").textContent = item.name;
  document.getElementById("lightboxDate").textContent =
    new Date().toLocaleDateString();
}

// ==================== CONTACT FORM ====================
function handleContactSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("contactName").value;
  const email = document.getElementById("contactEmail").value;
  const subject = document.getElementById("contactSubject").value;
  const message = document.getElementById("contactMessage").value;

  // Simulate form submission
  showNotification(`Thank you ${name}! Your message has been sent.`, "success");

  // Reset form
  event.target.reset();
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

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.classList.add("removing");
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Close modals on backdrop click (but NOT auth modal when user not logged in)
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      // Check if this is the auth modal and user is not logged in
      const authModal = document.getElementById("authModal");
      if (e.target.closest("#authModal") && !currentUser) {
        // Don't close auth modal if user is not logged in
        return;
      }
      closeAuthModal();
      closeUploadModal();
    });
  });

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-dropdown")) {
      closeUserDropdown();
    }
  });

  // Password strength indicator
  const regPassword = document.getElementById("regPassword");
  if (regPassword) {
    regPassword.addEventListener("input", (e) => {
      const strength = calculatePasswordStrength(e.target.value);
      const bar = document.querySelector(".strength-bar");
      if (bar) {
        bar.style.width = strength.percent + "%";
        bar.style.background = strength.color;
      }
    });
  }

  // Keyboard navigation for lightbox
  document.addEventListener("keydown", (e) => {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox.classList.contains("hidden")) {
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    }
  });
}

// ==================== UTILITIES ====================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calculatePasswordStrength(password) {
  let score = 0;

  if (password.length >= 6) score += 20;
  if (password.length >= 10) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  let color = "#ef4444"; // red
  if (score >= 60) color = "#f59e0b"; // yellow
  if (score >= 80) color = "#10b981"; // green

  return { percent: score, color };
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
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

// ==================== PRINT & DOWNLOAD ====================
function printDesign(designUrl) {
  const printWindow = window.open(designUrl, "_blank");
  printWindow.addEventListener("load", () => {
    printWindow.print();
  });
}

function downloadDesign(designUrl, fileName) {
  const link = document.createElement("a");
  link.href = designUrl;
  link.download = fileName || "design";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}