//setup links
const links = document.querySelectorAll('.ext-link');
links.forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    chrome.tabs.create({
      url: link.href
    });
  });
});

async function triggerCommentRefresh() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!activeTab || !activeTab.id) return;

  chrome.tabs.sendMessage(activeTab.id, {
    action: "reprocess_comments"
  }, (response) => {
    if (chrome.runtime.lastError) {
      logErr("Could not reach content script. Try refreshing the webpage.");
    } else {
      log("Content script responded:", response);
    }
  });
}

//load settings handler
document.addEventListener('DOMContentLoaded', async () => {
  log("Loaded Settings Popup Manager")
  const settings = await getCurrentSettings()
  let currentLimit = settings.MaxImagesPerComment

  const inputField = document.getElementById('cats')
  const decBtn = document.getElementById('btn-decrement')
  const incBtn = document.getElementById('btn-increment')

  function updateStepperState(newValue) {
    newValue = Math.max(1, newValue)
    var updateUI = newValue != currentLimit
    currentLimit = newValue

    inputField.value = currentLimit
    UpdateSetting("MaxImagesPerComment", currentLimit)

    if (updateUI) triggerCommentRefresh() //refresh the comments screen
  }

  updateStepperState(currentLimit)

  decBtn.addEventListener('click', async () => {
    updateStepperState(currentLimit - 1)
  })

  incBtn.addEventListener('click', async () => {
    updateStepperState(currentLimit + 1)
  })
})