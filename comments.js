function ProcessComments() {
  const commentElements = document.querySelectorAll('#content-text:not([yt-img])')
  if (commentElements.length === 0) return

  commentElements.forEach(ProcessComment)
}

async function ReProcessComments() {
  const currentMax = (await getCurrentSettings()).MaxImagesPerComment;
  log(`Surgically updating comments to match limit: ${currentMax}`);

  const processedComments = document.querySelectorAll('#content-text[yt-img="processed"]');

  for (const comment of processedComments) {
    const embeddedImages = comment.querySelectorAll('[data-original-link]');
    const currentCount = embeddedImages.length;

    if (currentCount > currentMax) {
      log(`Removing ${currentCount - currentMax} excess image(s) from comment.`);

      for (let i = currentCount - 1; i >= currentMax; i--) {
        const img = embeddedImages[i];
        const originalHTML = img.getAttribute('data-original-link');

        if (originalHTML) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = originalHTML;
          const originalLinkNode = tempDiv.firstChild;

          img.replaceWith(originalLinkNode);
        }
      }

    } else if (currentCount < currentMax) {
      log(`Checking comment for more links to load into increased capacity.`);

      comment.removeAttribute('yt-img');
      await ProcessComment(comment);
    }
  }
}

// A regex that matches clean direct image URLs
const directImageRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi;

async function ProcessComment(comment) {
  const currentMax = (await getCurrentSettings()).MaxImagesPerComment;
  comment.setAttribute('yt-img', 'processed');

  const existingImages = comment.querySelectorAll('[data-original-link]');
  let currentCount = existingImages.length;

  const links = comment.querySelectorAll('a');
  if (links.length === 0) return;

  for (const link of links) {
    if (currentCount >= currentMax) {
      break;
    }

    const rawInput = link.href || link.textContent.trim();
    let destinationURL = rawInput;

    try {
      const outerURL = new URL(rawInput);
      if (outerURL.hostname.includes('youtube.com') && outerURL.pathname === '/redirect') {
        const nestedTarget = outerURL.searchParams.get('q');
        if (nestedTarget) destinationURL = decodeURIComponent(nestedTarget);
      }

      const finalCleanURL = new URL(destinationURL);
      var fullURL = finalCleanURL.origin + finalCleanURL.pathname;
    } catch (e) {
      var fullURL = destinationURL;
    }

    if (fullURL.match(/\.(?:png|jpg|jpeg|gif|webp)$/i)) {
      if (currentCount >= currentMax) {
        break;
      }

      const loadedImage = await GetImageFromURL(fullURL);
      if (loadedImage) {
        currentCount++;
        loadedImage.setAttribute('data-original-link', link.outerHTML);
        link.replaceWith(loadedImage);
      }
    }
  }
}

function InjectExtensionButtons() {
  const footers = document.querySelectorAll('#footer.ytd-commentbox:not([yt-img-box])');

  footers.forEach(footer => {
    footer.setAttribute('yt-img-box', 'attached');

    const emojiSpan = footer.querySelector('#emoji-button');
    if (!emojiSpan) return;

    const btnContainer = document.createElement('span');
    btnContainer.className = "style-scope ytd-commentbox yt-img-custom-btn-wrapper";
    btnContainer.style.display = "inline-flex";
    btnContainer.style.alignItems = "center";
    btnContainer.style.justifyContent = "center";
    btnContainer.style.verticalAlign = "middle";

    const customBtn = document.createElement('button');
    customBtn.type = "button";
    customBtn.className = "yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-only-default style-scope ytd-commentbox style-default";
    customBtn.title = "Insert Image Link";
    customBtn.setAttribute("aria-label", "Insert Image Link via YT-IMG");

    customBtn.style.background = "none";
    customBtn.style.border = "none";
    customBtn.style.cursor = "pointer";
    customBtn.style.padding = "0";
    customBtn.style.margin = "0 2px";
    customBtn.style.width = "36px";
    customBtn.style.height = "36px";
    customBtn.style.display = "inline-flex";
    customBtn.style.alignItems = "center";
    customBtn.style.justifyContent = "center";
    customBtn.style.borderRadius = "50%";
    customBtn.style.outline = "none";
    customBtn.style.boxShadow = "none";

    customBtn.style.transition = "background-color 0.2s cubic-bezier(0.0, 0.0, 0.2, 1)";

    const isDarkMode = document.documentElement.hasAttribute('dark');
    const systemColor = isDarkMode ? "var(--yt-spec-text-primary, #fff)" : "#000000";

    customBtn.style.color = systemColor;

    // MUI ImageSearchSharp 24px
    customBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" style="pointer-events: none; display: block; width: 24px; height: 24px; fill: currentcolor;">
        <path d="M0 0h24v24H0V0z" fill="none"/>
        <path d="M18 13v7H4V6h5.02c.05-.71.22-1.38.48-2H2v18h18v-7l-2-2zm-1.5 5h-11l2.75-3.53 1.96 2.36 2.75-3.54L16.5 18zm2.8-9.11c.44-.7.7-1.51.7-2.39C20 4.01 17.99 2 15.5 2S11 4.01 11 6.5s2.01 4.5 4.49 4.5c.88 0 1.7-.26 2.39-.7L21 13.42 22.42 12 19.3 8.89zM15.5 9C14.12 9 13 7.88 13 6.5S14.12 4 15.5 4 18 5.12 18 6.5 16.88 9 15.5 9z"/>
      </svg>
    `;

    customBtn.addEventListener('mouseenter', () => {
      customBtn.style.backgroundColor = "var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05))";
    });

    customBtn.addEventListener('mouseleave', () => {
      customBtn.style.backgroundColor = "transparent";
    });

    customBtn.addEventListener('focus', () => {
      customBtn.style.backgroundColor = "var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.1))";
    });

    customBtn.addEventListener('blur', () => {
      customBtn.style.backgroundColor = "transparent";
    });

    customBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      log("YT-IMG Action button clicked on comment bar.");
      loadImageUploader();
    });

    btnContainer.appendChild(customBtn);
    emojiSpan.parentNode.insertBefore(btnContainer, emojiSpan.nextSibling);
  });
}

async function loadImageUploader() {
  let settings = await getCurrentSettings();
  let savedImages = settings.UploadedImages
  let favoritedImages = settings.Favorites

  var finalStr = ""
  savedImages.forEach((item) => {
    finalStr = finalStr + "\n * " + item
  })

  alert(`SavedImages: ${finalStr}`);
}