import { Download, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    standaloneNavigator.standalone === true
  );
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return (
    /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 820px), (pointer: coarse)").matches
  );
}

export default function InstallAppPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [nativeInstallAvailable, setNativeInstallAvailable] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const ios = isIosDevice();

  useEffect(() => {
    if (!isMobileDevice() || isStandaloneMode()) return;

    try {
      if (sessionStorage.getItem("nandini-install-dismissed") === "1") return;
    } catch {
      // Storage can be unavailable in strict private modes; the prompt can still work.
    }

    const showTimer = window.setTimeout(() => setVisible(true), 900);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setNativeInstallAvailable(true);
      setShowSteps(false);
      setVisible(true);
    };

    const handleInstalled = () => {
      deferredPromptRef.current = null;
      setVisible(false);
      setNativeInstallAvailable(false);
      try {
        localStorage.setItem("nandini-pwa-installed", "1");
      } catch {
        // Non-essential install bookkeeping only.
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem("nandini-install-dismissed", "1");
    } catch {
      // Dismissal still works for the current render.
    }
  };

  const install = async () => {
    const installPrompt = deferredPromptRef.current;
    if (!installPrompt) {
      setShowSteps(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    deferredPromptRef.current = null;
    setNativeInstallAvailable(false);

    if (choice?.outcome === "accepted") {
      setVisible(false);
      return;
    }

    try {
      sessionStorage.setItem("nandini-install-dismissed", "1");
    } catch {
      // Non-essential.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="install-app-prompt" aria-label="Install Nandini app">
      <button
        type="button"
        className="install-app-dismiss"
        aria-label="Dismiss install option"
        onClick={dismiss}
      >
        <X size={17} />
      </button>

      <div className="install-app-main">
        <img src="/app-icon.svg" alt="" className="install-app-icon" draggable={false} />
        <div className="install-app-copy">
          <strong>Install Nandini</strong>
          <span>Keep it on your home screen and open it like an app.</span>
        </div>
      </div>

      {showSteps ? (
        <div className="install-app-steps" role="status">
          {ios ? (
            <>
              <Share2 size={16} aria-hidden="true" />
              <span>
                In Safari, tap <b>Share</b> → <b>Add to Home Screen</b> → <b>Add</b>.
              </span>
            </>
          ) : (
            <>
              <Download size={16} aria-hidden="true" />
              <span>
                Open your browser menu <b>⋮</b> → <b>Install app</b> or <b>Add to Home screen</b>.
              </span>
            </>
          )}
        </div>
      ) : null}

      <button type="button" className="install-app-action" onClick={() => void install()}>
        <Download size={17} />
        {nativeInstallAvailable ? "Install app" : ios ? "How to install" : "Install"}
      </button>
    </aside>
  );
}
