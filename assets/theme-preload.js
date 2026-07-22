(function () {
  try {
    var saved = localStorage.getItem("feg_theme");
    document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
  }
})();
