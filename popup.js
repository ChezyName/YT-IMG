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

const notFoundImages = (type) => {
  return `
  <h2 style="width: 100%; height: auto; text-align: center; color: red">
    No Images ${type}
  </h2>
  `
}

//load settings handler
document.addEventListener('DOMContentLoaded', async () => {
  log("Loaded Settings Popup Manager")
  const settings = await getCurrentSettings()
  let currentLimit = settings.MaxImagesPerComment

  const settingsPopup = document.getElementById('settings')
  const imagesPopup = document.getElementById('images')
  imagesPopup.style.display = 'none' //hide by default

  const inputField = document.getElementById('num-comments')
  const decBtn = document.getElementById('btn-decrement')
  const incBtn = document.getElementById('btn-increment')

  const imgTitle = document.getElementById('image-title')
  const savedImages = document.getElementById('btn-saved')
  const favoriteImages = document.getElementById('btn-favorites')
  const savedImages2 = document.getElementById('btn-saved-change')
  const favoriteImages2 = document.getElementById('btn-favorites-change')

  const returnButton = document.getElementById('btn-back')
  const imgContainer = document.getElementById('images-row')

  function updateStepperState(newValue) {
    newValue = Math.max(0, newValue)
    var updateUI = newValue != currentLimit
    currentLimit = newValue

    inputField.value = currentLimit
    UpdateSetting("MaxImagesPerComment", currentLimit)

    if (updateUI) triggerCommentRefresh() //refresh the comments screen
  }

  let ImagesShown = false
  function showImage(type) {
    ImagesShown = true;
    imgTitle.innerHTML = type == "saved" ? "Saved" : "Favorited"

    imagesPopup.style.display = ImagesShown ? 'flex' : 'none'
    settingsPopup.style.display = !ImagesShown ? 'flex' : 'none'

    //reset image container
    imgContainer.innerHTML = ""

    let urls = type == "saved" ? settings.UploadedImages : settings.Favorites
    if (!Array.isArray(urls) || urls.length == 0) {
      imgContainer.innerHTML = notFoundImages(type == "saved" ? "Saved" : "Favorited")
      return
    }

    //filter for dupes
    const uniqueUrls = [...new Set(urls)];
    const imagePromises = uniqueUrls.map(imgURL => GetImageFromURL(imgURL));
    
    Promise.all(imagePromises)
    .then((resolvedImages) => {
      resolvedImages.forEach(img => {
        if (img) {
          imgContainer.appendChild(img);
        }
      });
    })
    .catch(err => console.error("Error processing batch images:", err));
  }

  updateStepperState(currentLimit)

  decBtn.addEventListener('click', async () => {
    updateStepperState(currentLimit - 1)
  })

  incBtn.addEventListener('click', async () => {
    updateStepperState(currentLimit + 1)
  })

  savedImages.addEventListener('click', () => { showImage('saved') })
  savedImages2.addEventListener('click', () => { showImage('saved') })
  favoriteImages.addEventListener('click', () => { showImage('favorite') })
  favoriteImages2.addEventListener('click', () => { showImage('favorite') })
  returnButton.addEventListener('click', () => {
    ImagesShown = false;
    imagesPopup.style.display = ImagesShown ? 'flex' : 'none'
    settingsPopup.style.display = !ImagesShown ? 'flex' : 'none'
  })
})