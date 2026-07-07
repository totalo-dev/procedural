document.addEventListener("DOMContentLoaded", () => {
    const focusBtn = document.getElementById("focus-mode-btn");

    if (focusBtn) {
        focusBtn.addEventListener("click", () => {
            const isFocusMode = document.body.classList.toggle("focus-mode");

            if (isFocusMode) {
                focusBtn.textContent = "Restaurar Interface";
                focusBtn.setAttribute("aria-label", "Restaurar Interface");
            } else {
                focusBtn.textContent = "Modo Foco";
                focusBtn.setAttribute("aria-label", "Ativar Modo Foco");
            }
        });
    }
});
