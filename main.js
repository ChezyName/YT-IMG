//Minimal JS that handles registering on page load
//Should register the page watcher to watch for new comments loading
//as well as actually hook to the comment changer

//Refresh comments from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reprocess_comments") {
        log("Received refresh command from popup UI.");
        ReProcessComments();
        sendResponse({ status: "success", commentsUpdated: true });
    }
    return false; 
});

//Load this function once
async function main() {
  //Init settings
  log("Loading Settings")
  await getCurrentSettings()

  //Init content observer
  const observer = new MutationObserver((mutations) => {
    // Whenever the DOM changes, check for new comments
    ProcessComments()
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  ProcessComments()
  log("Fully Loaded")
}

main()