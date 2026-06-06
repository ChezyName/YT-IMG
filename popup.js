// Setup runtime target link redirect mappings cleanly
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
      logErr("Could not reach content script execution port context mapping.");
    } else {
      log("Content script reprocess callback sequence success metrics:", response);
    }
  });
}

const notFoundImages = (type) => {
  return `
  <div style="grid-column: span 2; text-align: center; color: var(--sub-text); font-size: 13px; padding: 40px 0;">
    No ${type} images found.
  </div>
  `;
};

document.addEventListener('DOMContentLoaded', async () => {
  log("Initializing Refreshed Modernized UI Manager Thread Context...");

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.classList.add('light-theme');
  }

  let settings = await getCurrentSettings();
  let currentLimit = settings.MaxImagesPerComment;
  let activeFilterTab = 'all';

  const settingsPane = document.getElementById('settings');
  const imagesPane = document.getElementById('images');
  const imgContainer = document.getElementById('images-row');

  // Control button mapping parameters
  const decBtn = document.getElementById('btn-dec');
  const incBtn = document.getElementById('btn-inc');
  const stepperVal = document.getElementById('stepper-val');

  const navToGallery = document.getElementById('nav-to-gallery');
  const navToSettings = document.getElementById('nav-to-settings');

  const tabAll = document.getElementById('tab-all');
  const tabSaved = document.getElementById('tab-saved');
  const tabFavorites = document.getElementById('tab-favorites');

  // Synchronize internal stepper control display counters
  async function updateStepperState(newLimit) {
    if (newLimit < 1) return;
    currentLimit = newLimit;
    stepperVal.textContent = currentLimit;
    await UpdateSetting("MaxImagesPerComment", currentLimit);
    await triggerCommentRefresh();
  }

  updateStepperState(currentLimit);

  decBtn.addEventListener('click', () => updateStepperState(currentLimit - 1));
  incBtn.addEventListener('click', () => updateStepperState(currentLimit + 1));

  navToGallery.addEventListener('click', () => {
    settingsPane.classList.remove('active');
    imagesPane.classList.add('active');
    renderGalleryView();
  });

  navToSettings.addEventListener('click', () => {
    imagesPane.classList.remove('active');
    settingsPane.classList.add('active');
  });

  //Filterers
  tabAll.addEventListener('click', () => {
    if (activeFilterTab === 'all') return;
    activeFilterTab = 'all';
    tabAll.classList.add('active');
    tabFavorites.classList.remove('active');
    tabSaved.classList.remove('active');
    renderGalleryView();
  });

  tabSaved.addEventListener('click', () => {
    if (activeFilterTab === 'saved') return;
    activeFilterTab = 'saved';
    tabSaved.classList.add('active');
    tabFavorites.classList.remove('active');
    tabAll.classList.remove('active');
    renderGalleryView();
  });

  tabFavorites.addEventListener('click', () => {
    if (activeFilterTab === 'favorites') return;
    activeFilterTab = 'favorites';
    tabFavorites.classList.add('active');
    tabSaved.classList.remove('active');
    tabAll.classList.remove('active');
    renderGalleryView();
  });

  async function renderGalleryView() {
    imgContainer.innerHTML = '';
    settings = await getCurrentSettings();

    let urls =
      activeFilterTab === "all" ? [...settings.UploadedImages, ...settings.Favorites] :
      activeFilterTab === "saved" ? settings.UploadedImages : settings.Favorites;
    if (!Array.isArray(urls) || urls.length === 0) {
      imgContainer.innerHTML = notFoundImages(
        activeFilterTab == "all" ? "" : activeFilterTab === "saved" ? "Saved" : "Favorited"
      );
      return;
    }

    const uniqueUrls = [...new Set(urls)];

    for (const imgURL of uniqueUrls) {
      const card = document.createElement('div');
      card.className = 'image-card';

      const createMuiFallback = () => {
        const fallbackNode = document.createElement('div');
        fallbackNode.style.display = 'flex';
        fallbackNode.style.alignItems = 'center';
        fallbackNode.style.justifyContent = 'center';
        fallbackNode.innerHTML = `
          <svg style="width: 32px; height: 32px; fill: #cc0000;" viewBox="0 0 24 24">
            <path d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z"></path>
          </svg>
        `;
        return fallbackNode;
      };

      try {
        if (typeof GetImageFromURL === 'function') {
          const result = await GetImageFromURL(imgURL);

          if (result) {
            if (result instanceof HTMLElement) {
              const nestedImg = result.querySelector('img') || result;
              if (nestedImg) {
                const clonedImg = nestedImg.cloneNode(true);

                clonedImg.style.width = '100%';
                clonedImg.style.height = '100%';
                clonedImg.style.maxWidth = '100%';
                clonedImg.style.maxHeight = '100%';
                clonedImg.style.objectFit = 'cover';
                clonedImg.style.objectPosition = 'center';
                clonedImg.style.display = 'block';
                clonedImg.style.margin = '0';

                card.appendChild(clonedImg);
              } else {
                card.appendChild(createMuiFallback());
              }
            } else {
              card.insertAdjacentHTML('beforeend', result);
            }
          } else {
            card.appendChild(createMuiFallback());
          }
        } else {
          const baseNativeImg = new Image();
          baseNativeImg.src = imgURL;
          baseNativeImg.style.width = '100%';
          baseNativeImg.style.height = '100%';
          baseNativeImg.style.objectFit = 'cover';
          baseNativeImg.onerror = () => baseNativeImg.replaceWith(createMuiFallback());
          card.appendChild(baseNativeImg);
        }
      } catch (err) {
        console.error(`Exception context breakdown parsing individual image asset data-stream: ${imgURL}`, err);
        card.appendChild(createMuiFallback());
      }

      imgContainer.appendChild(card);
    }
  }
});