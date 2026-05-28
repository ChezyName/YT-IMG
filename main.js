//Minimal JS that handles registering on page load
//Should register the page watcher to watch for new comments loading
//as well as actually hook to the comment changer

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
log("Loaded")