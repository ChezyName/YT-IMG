//Refresh comments from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reprocess_comments") {
    log("Received refresh command from popup UI.");
    ReProcessComments();
    sendResponse({
      status: "success",
      commentsUpdated: true
    });
  }
  return false;
});

// CRITICAL FIX: Add 'true' at the end to catch the event on the CAPTURE phase.
// This intercepts the paste before YouTube's framework can cancel/stop propagation.
document.addEventListener('paste', (event) => {
  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  if (clipboardData.files && clipboardData.files.length > 0) {
    const file = clipboardData.files[0];
    if (file.type.startsWith('image/')) {
      log(`User pasted a raw image binary file object: ${file.name} (${file.type})`);
      log(`Uploading to Catbox -> URL in a few moments, temp URL here: [LOADING/FILE/HERE}`)
    }
  }
}, true);

async function main() {
  log("Loading Settings");
  await getCurrentSettings();

  const observer = new MutationObserver((mutations) => {
    let rawContentChanged = false;
    let structuralUIMutation = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {

            if (node.id === "footer" || node.querySelector('#footer') || node.querySelector('#emoji-button')) {
              structuralUIMutation = true;
            }

            if (node.id === "content-text" || node.querySelector('#content-text')) {
              rawContentChanged = true;
            }
          }
        }
      }

      if (mutation.type === "childList" && mutation.target.nodeType === Node.ELEMENT_NODE) {
        const targetComment = mutation.target.closest('#content-text');
        if (targetComment && targetComment.hasAttribute("yt-img")) {
          if (targetComment.querySelector("a")) {
            targetComment.removeAttribute("yt-img");
            rawContentChanged = true;
          }
        }
      }
    }

    if (structuralUIMutation) {
      InjectExtensionButtons();
    }
    if (rawContentChanged) {
      ProcessComments();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  InjectExtensionButtons();
  ProcessComments();
  log("Fully Loaded");
}

main();