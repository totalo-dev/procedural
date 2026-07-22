document.addEventListener("DOMContentLoaded", () => {
    const focusBtn = document.getElementById("focus-mode-btn");

    if (focusBtn) {
        focusBtn.addEventListener("click", () => {
            const isFocusMode = document.body.classList.toggle("focus-mode");

            const lang = window.currentLang || 'pt';
            const trans = window.translations || {
                pt: { focus_mode: "Modo Foco", restore_interface: "Restaurar Interface" },
                en: { focus_mode: "Focus Mode", restore_interface: "Restore Interface" }
            };

            if (isFocusMode) {
                focusBtn.setAttribute("data-i18n", "restore_interface");
                focusBtn.textContent = trans[lang].restore_interface;
                focusBtn.setAttribute("aria-label", trans[lang].restore_interface);
            } else {
                focusBtn.setAttribute("data-i18n", "focus_mode");
                focusBtn.textContent = trans[lang].focus_mode;
                focusBtn.setAttribute("aria-label", trans[lang].focus_mode);
            }
        });
    }
});
