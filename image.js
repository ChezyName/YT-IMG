//Returns image from URL
function GetImageFromURL(URL) {
  return `
    <br>
    <a href="${URL}" target="_blank" rel="noopener noreferrer">
      <img src="${URL}" style="max-width: 100%; max-height: 350px; border-radius: 8px; display: block; margin: 8px 0; border: 1px solid rgba(255,255,255,0.1);" />
    </a>
    <br>
  `;
}

function isValidImage(URL) {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            resolve(true);
        };

        img.onerror = () => {
            resolve(false);
        };

        img.src = URL;
    });
}