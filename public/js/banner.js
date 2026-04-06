// ==================== BANNER & NAV CONTROLLER ====================

function updateBannerAndNav() {
  const wrapper     = document.getElementById("profileBannerWrapper");
  const navbar      = document.getElementById("navbar");
  const mainContent = document.getElementById("mainContent");

  if (!currentUser) {
    wrapper.style.display = "none";
    navbar.classList.add("hidden-nav");
    mainContent.style.marginTop = "0";
    return;
  }

  wrapper.style.display = "block";

  const initial = currentUser.username.charAt(0).toUpperCase();
  document.getElementById("bannerAvatarInitial").textContent = initial;

  document.getElementById("bannerName").textContent =
    currentUser.fullName || currentUser.username;

  const badge = document.getElementById("bannerRoleBadge");

  if (currentUser.role === "admin") {
    badge.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
    badge.className = "banner-role-badge badge-admin";
    document.getElementById("bannerTagline").textContent =
      "Administrator · Full Access";
    navbar.classList.remove("hidden-nav");
  } else {
    badge.innerHTML = '<i class="fas fa-user"></i> Member';
    badge.className = "banner-role-badge badge-user";
    document.getElementById("bannerTagline").textContent =
      "Creative Portfolio · Viewer";
    navbar.classList.add("hidden-nav");
  }

  requestAnimationFrame(() => {
    mainContent.style.marginTop = wrapper.offsetHeight + "px";
  });
}

function recalcMargin() {
  const wrapper     = document.getElementById("profileBannerWrapper");
  const mainContent = document.getElementById("mainContent");
  if (wrapper && wrapper.style.display !== "none") {
    mainContent.style.marginTop = wrapper.offsetHeight + "px";
  }
}

window.addEventListener("resize", recalcMargin);

if (window.ResizeObserver) {
  const ro = new ResizeObserver(recalcMargin);
  ro.observe(document.getElementById("profileBannerWrapper"));
}

// Override completeLogin
(function () {
  const _orig = window.completeLogin;
  window.completeLogin = function () {
    if (_orig) _orig.call(this);
    updateBannerAndNav();
  };
})();

// Override logout
(function () {
  window.handleLogout = async function () {
    currentUser = null;
    localStorage.removeItem("currentUser");

    updateUIForLoggedOutUser();
    updateBannerAndNav();

    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

    openAuthModal();
    showNotification("Logged out successfully", "success");
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  updateBannerAndNav();
  setTimeout(updateBannerAndNav, 50);
});