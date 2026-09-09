(function (global) {
  var STORAGE_KEY = "bhang-theme";

  function normalizeTheme(value) {
    return value === "light" || value === "dark" ? value : "dark";
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return "dark";
    }
  }

  function writeStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* private mode / quota */
    }
  }

  function applyTheme(theme) {
    var next = normalizeTheme(theme);
    document.documentElement.setAttribute("data-theme", next);
    writeStoredTheme(next);
    return next;
  }

  function toggleTheme() {
    return applyTheme(readStoredTheme() === "light" ? "dark" : "light");
  }

  var MOON =
    '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"></path></svg>';
  var SUN =
    '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';

  function paintToggle(btn, theme) {
    var label =
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.innerHTML = theme === "dark" ? MOON : SUN;
  }

  function mountThemeToggle(footer) {
    if (!footer || footer.querySelector(".theme-toggle")) return null;

    var nav = footer.querySelector(".footer-nav");
    if (!nav) {
      nav = document.createElement("div");
      nav.className = "footer-nav";
      while (footer.firstChild) nav.appendChild(footer.firstChild);
      footer.appendChild(nav);
    }

    var wrap = document.createElement("div");
    wrap.className = "footer-theme";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    paintToggle(btn, readStoredTheme());
    btn.addEventListener("click", function () {
      paintToggle(btn, toggleTheme());
    });
    wrap.appendChild(btn);
    footer.appendChild(wrap);
    return btn;
  }

  // Apply early when this file loads (head script already set attribute).
  applyTheme(readStoredTheme());

  global.BhangTheme = {
    STORAGE_KEY: STORAGE_KEY,
    readStoredTheme: readStoredTheme,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    mountThemeToggle: mountThemeToggle,
  };
})(window);
