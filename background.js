//uploads data to catbox.moe -> sends back the link post save
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background is fulfilling request', request)
  if (request.action === "upload_url") {
    fetch(request.targetUrl)
      .then(res => {
        if (!res.ok) throw new Error("Could not pull original source GIF data.");
        return res.blob();
      })
      .then(gifBlob => {
        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", gifBlob, "animated.gif");

        return fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: formData
        });
      })
      .then(response => response.text())
      .then(textUrl => {
        if (textUrl && textUrl.trim().startsWith("http")) {
          sendResponse({
            success: true,
            url: textUrl.trim()
          });
        } else {
          sendResponse({
            success: false,
            error: textUrl
          });
        }
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    return true;
  }

  if (request.action === "upload") {

    try {
      const byteCharacters = atob(request.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: request.fileType
      });

      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", blob, request.fileName);

      console.log("Background service worker initiating network fetch to Catbox...");

      fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP Error Status: ${response.status}`);
          }
          return response.text();
        })
        .then(textUrl => {
          if (textUrl && textUrl.trim().startsWith("http")) {
            sendResponse({
              success: true,
              url: textUrl.trim()
            });
          } else {
            sendResponse({
              success: false,
              error: textUrl ? textUrl.trim() : "Empty server response."
            });
          }
        })
        .catch(error => {
          sendResponse({
            success: false,
            error: error.message || "Network fetch operation failed."
          });
        });

    } catch (parseError) {
      sendResponse({
        success: false,
        error: `Serialization failure: ${parseError.message}`
      });
    }

    return true;
  }
});