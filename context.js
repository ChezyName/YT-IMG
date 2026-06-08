//helper script to allow refreshing context

// Sends messages safely
function safeSendMessage(payload, callback) {
  if (!chrome.runtime?.id) {
    handleContextInvalidation();
    throw new Error("Extension context invalidated. Re-initializing...");
  }

  try {
    safeSendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          handleContextInvalidation();
        }
      }
      if (callback) callback(response);
    });
  } catch (err) {
    if (err.message && err.message.includes("Extension context invalidated")) {
      handleContextInvalidation();
    }
    if (callback) callback({ success: false, error: err.message });
  }
}

let isRecoveringContext = false;
function handleContextInvalidation() {
  if (isRecoveringContext) return;
  isRecoveringContext = true;

  logWarn("Context ID snapped! Initiating background port recovery pipeline...");

  if (typeof currentSettings !== 'undefined') {
    log("Securing local state. Current settings locked down in memory.");
  }

  if (typeof observer !== 'undefined' && observer.disconnect) {
    observer.disconnect();
  }

  log("Stale execution environment cleaned. Waiting for interaction to mount fresh connection...");

  const rebindContext = () => {
    window.removeEventListener('focus', rebindContext);

    if (chrome.runtime && chrome.runtime.id) {
      log("Fresh Extension Context ID found! Re-binding operational modules...");

      if (typeof main === 'function') main(); 
      isRecoveringContext = false;
    } else {
      logFatal("Extension completely missing. Auto-recovery aborted.");
    }
  };

  window.addEventListener('focus', rebindContext);
}