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