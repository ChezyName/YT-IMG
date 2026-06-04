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

async function main() {
  log("Loading Settings");
  await getCurrentSettings();

  const observer = new MutationObserver((mutations) => {
    let rawContentChanged = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.id === "content-text" || node.querySelector('#content-text')) {
              rawContentChanged = true;
              break;
            }
          }
        }
      }

      if (mutation.type === "childList" && mutation.target.nodeType === Node.ELEMENT_NODE) {
        const targetComment = mutation.target.closest('#content-text');

        if (targetComment && targetComment.hasAttribute("yt-img")) {
          if (targetComment.querySelector("a")) {
            log("Detected live text rewrite on processed comment. Resetting layout flag.");
            targetComment.removeAttribute("yt-img");
            rawContentChanged = true;
          }
        }
      }

      if (rawContentChanged) break;
    }

    if (rawContentChanged) {
      ProcessComments();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  ProcessComments();
  log("Fully Loaded");
}

main();