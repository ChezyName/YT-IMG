const defaultSettings = {
  MaxImagesPerComment: 1, //just like tiktok, it only allows one image
  UploadedImages: [], //What images we uploaded - just like favorites but as URLS
  Favorites: [] //What images we have favorited
}

var currentSettings = {
  ...defaultSettings
};

let isContextDead = false

//Get from Cache / Local Storage
async function getCurrentSettings() {
  if (!chrome.runtime || !chrome.runtime.id) {
    if (!isContextDead) {
      logErr("Extension context was invalidated. Switching over to safe local in-memory fallback snapshot.");
      isContextDead = true;
      
      const tryReviveContext = () => {
        window.removeEventListener('focus', tryReviveContext);
        if (chrome.runtime && chrome.runtime.id) {
          log("Fresh Extension Context detected on focus! Storage lines re-opened.");
          isContextDead = false;
        }
      };
      window.addEventListener('focus', tryReviveContext);
    }
    
    return currentSettings;
  }

  try {
    const result = await chrome.storage.local.get(Object.keys(defaultSettings));
    //log(`Received User Settings: ${JSON.stringify(result)}`);

    if (!result || Object.keys(result).length === 0) {
      log("No valid settings found. Initializing storage with defaults...");
      currentSettings = {
        ...defaultSettings
      };
      await SaveUserSettings();
      return currentSettings;
    }

    const validatedSettings = {};
    let storageNeedsUpdate = false;

    for (const key of Object.keys(defaultSettings)) {
      const expectedType = typeof defaultSettings[key];
      let userValue = result[key];

      if (userValue !== undefined && typeof userValue === expectedType) {
        if (Array.isArray(userValue)) {
          const originalLength = userValue.length;
          userValue = [...new Set(userValue)];
          
          if (userValue.length !== originalLength) {
            log(`Found and cleaned up ${originalLength - userValue.length} duplicates in key '${key}'.`);
            storageNeedsUpdate = true;
          }
        }

        validatedSettings[key] = userValue;
      } else {
        log(`Key '${key}' was invalid or missing. Auto-healing with default.`);
        validatedSettings[key] = defaultSettings[key];
        storageNeedsUpdate = true;
      }
    }

    currentSettings = validatedSettings;

    if (storageNeedsUpdate) {
      log("Syncing cleaned settings schema back to local storage...");
      await SaveUserSettings();
    }
  } catch (err) {
    logErr("Storage stream blocked mid-transit. Dropping back to memory cache securely.", err);
    return currentSettings;
  }

  return currentSettings;
}

async function UpdateSetting(key, value) {
  if (key in defaultSettings) {
    currentSettings[key] = value
    log(`Updated ${key} to ${value}`)
    await SaveUserSettings()
  } else {
    logErr(`Key '${key}' does not exist in default settings blueprint.`)
  }
}

async function AddUploadedImage(URL) {
  if (!Array.isArray(currentSettings.UploadedImages)) {
    currentSettings.UploadedImages = []
  }

  if (currentSettings.UploadedImages.includes(URL)) {
    log(`UploadedImage: Duplicate detected, dropping: ${URL}`);
    return;
  }

  currentSettings.UploadedImages.push(URL)
  log(`UploadedImage to DB: ${URL}`)
  await SaveUserSettings()
}

async function SaveImage(URL) {
  if (!Array.isArray(currentSettings.Favorites)) {
    currentSettings.Favorites = []
  }

  if (currentSettings.Favorites.includes(URL)) {
    log(`Favorited: Duplicate detected, dropping: ${URL}`);
    return;
  }

  currentSettings.Favorites.push(URL)
  log(`Favorited Image to DB: ${URL}`)
  await SaveUserSettings()
}

async function SaveUserSettings() {
  await chrome.storage.local.set({
    ...currentSettings
  });
}