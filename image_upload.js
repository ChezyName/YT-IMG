// image_upload.js - Content Script Context

document.addEventListener('paste', async (event) => {
  const clipboardData = event.clipboardData || window.clipboardData;
  if (!clipboardData) return;

  const activeElement = document.activeElement;
  if (!activeElement || !activeElement.matches('#contenteditable-root, textarea, [contenteditable="true"]')) {
    return;
  }

  // accepts gifs
  const htmlData = clipboardData.getData('text/html');
  if (htmlData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, 'text/html');
    const imgElement = doc.querySelector('img');

    if (imgElement && imgElement.src && imgElement.src.toLowerCase().includes('.gif')) {
      event.preventDefault(); // Stop native static PNG behavior

      const gifUrl = imgElement.src;
      console.log(`Animated GIF detected: ${gifUrl}`);

      // OPTIMIZATION: If it's already a live internet URL, just drop it in directly!
      if (gifUrl.startsWith('http://') || gifUrl.startsWith('https://')) {
        console.log("Image is already hosted online. Inserting direct link immediately.");
        insertTextAtCursor(activeElement, gifUrl);
        return; // Execution finished perfectly, no bandwidth wasted!
      }

      // EDGE CASE: If it's a local data blob string (data:image/gif;base64,...), we must upload it
      if (gifUrl.startsWith('data:')) {
        const tempId = Math.floor(Math.random() * 1000000);
        const placeholderText = `[Uploading Base64 GIF: ${tempId}]`;
        insertTextAtCursor(activeElement, placeholderText);

        UploadGifFromURL(gifUrl).then((result) => {
          if (result.success) {
            replacePlaceholderWithURL(activeElement, placeholderText, result.url);
          } else {
            replacePlaceholderWithURL(activeElement, placeholderText, `[GIF Upload Failed: ${result.error}]`);
          }
        });
        return;
      }
    }
  }

  // normal image upload
  if (clipboardData.files && clipboardData.files.length > 0) {
    const file = clipboardData.files[0];
    if (file.type.startsWith('image/')) {
      event.preventDefault();

      const tempId = Math.floor(Math.random() * 1000000);
      const placeholderText = `[Uploading Image: ${tempId}]`;
      insertTextAtCursor(activeElement, placeholderText);

      UploadImage(file).then((result) => {
        if (result.success) {
          replacePlaceholderWithURL(activeElement, placeholderText, result.url);
        } else {
          replacePlaceholderWithURL(activeElement, placeholderText, `[Upload Failed: ${result.error}]`);
        }
      });
    }
  }
}, true);

// sends data to background worker as GIF
async function UploadGifFromURL(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: "upload_url",
      targetUrl: url
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        resolve(response);
      }
    });
  });
}

// send local data to background worker
async function UploadImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      chrome.runtime.sendMessage({
        action: "upload",
        fileData: base64String,
        fileName: file.name || "pasted_image.png",
        fileType: file.type
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

function replacePlaceholderWithURL(inputElement, placeholder, finalUrl) {
  //save the image
  AddUploadedImage(finalUrl)

  if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
    if (inputElement.value.includes(placeholder)) {
      inputElement.value = inputElement.value.replace(placeholder, finalUrl);
    }
  } else {
    if (inputElement.innerHTML.includes(placeholder)) {
      inputElement.innerHTML = inputElement.innerHTML.replace(placeholder, finalUrl);
    }
  }
  inputElement.dispatchEvent(new Event('input', {
    bubbles: true
  }));
}

//saves to comment
function insertTextAtCursor(inputElement, textToInsert) {
  inputElement.focus();
  if (typeof inputElement.selectionStart === 'number' && typeof inputElement.selectionEnd === 'number') {
    const startPos = inputElement.selectionStart;
    const endPos = inputElement.selectionEnd;
    const currentText = inputElement.value;
    inputElement.value = currentText.substring(0, startPos) + textToInsert + currentText.substring(endPos);
    inputElement.selectionStart = inputElement.selectionEnd = startPos + textToInsert.length;
  } else {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(textToInsert);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  inputElement.dispatchEvent(new Event('input', {
    bubbles: true
  }));
}