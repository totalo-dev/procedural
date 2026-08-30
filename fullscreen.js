document.addEventListener("DOMContentLoaded", () => {
    const fullscreenBtn = document.getElementById("fullscreen-btn");

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
            if (!isFullscreen) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
                    document.documentElement.webkitRequestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) { /* IE11 */
                    document.documentElement.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { /* Safari */
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { /* IE11 */
                    document.msExitFullscreen();
                }
            }
        });

        // Listen for fullscreen changes to update the button text
        document.addEventListener('fullscreenchange', updateFullscreenButton);
        document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
        document.addEventListener('msfullscreenchange', updateFullscreenButton);

        function updateFullscreenButton() {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
            const lang = window.currentLang || 'pt';
            const trans = window.translations || {
                pt: { fullscreen: "Tela Cheia", exit_fullscreen: "Sair Tela Cheia" },
                en: { fullscreen: "Fullscreen", exit_fullscreen: "Exit Fullscreen" }
            };

            if (isFullscreen) {
                fullscreenBtn.setAttribute("data-i18n", "exit_fullscreen");
                fullscreenBtn.textContent = trans[lang].exit_fullscreen;
                fullscreenBtn.setAttribute("aria-label", trans[lang].exit_fullscreen);
            } else {
                fullscreenBtn.setAttribute("data-i18n", "fullscreen");
                fullscreenBtn.textContent = trans[lang].fullscreen;
                fullscreenBtn.setAttribute("aria-label", trans[lang].fullscreen);
            }
        }
    }
});
