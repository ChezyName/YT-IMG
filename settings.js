const defaultSettings = {
  MaxImagesPerComment: 1, //just like tiktok, it only allows one image
  UploadedImages: [], //What images we uploaded - just like favorites but as URLS
  Favorites: [] //What images we have favorited
}

var currentSettings = {
  ...defaultSettings
};

//Get from Cache / Local Storage
async function getCurrentSettings() {
  if (!chrome.runtime || !chrome.runtime.id) {
    logErr("Extension context was invalidated. Stopping storage lookup.");
    return defaultSettings;
  }

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
    const userValue = result[key];

    if (userValue !== undefined && typeof userValue === expectedType) {
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

  currentSettings.UploadedImages.push(URL)
  await SaveUserSettings()
}

async function SaveUserSettings() {
  await chrome.storage.local.set({
    ...currentSettings
  });
}