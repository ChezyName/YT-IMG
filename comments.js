function ProcessComments() {
    const commentElements = document.querySelectorAll('#content-text:not([yt-img])')
    if (commentElements.length === 0) return

    commentElements.forEach(ProcessComment)
}

async function ReProcessComments() {
  const currentMax = (await getCurrentSettings()).MaxImagesPerComment;
  log(`Refreshing the Comments to have ${currentMax} Items`);

  const processedComments = document.querySelectorAll('#content-text[yt-img="processed"]');

  processedComments.forEach(comment => {
    const embeddedImages = comment.querySelectorAll('div[data-original-link]');

    embeddedImages.forEach(img => {
      const originalHTML = img.getAttribute('data-original-link');
      if (originalHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        const originalLinkNode = tempDiv.firstChild;

        img.replaceWith(originalLinkNode);
      }
    });

    comment.removeAttribute('yt-img');
  });

  //Slight Delay
  setTimeout(() => {
    ProcessComments();
  }, 1);
}

// A regex that matches clean direct image URLs
const directImageRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi;

async function ProcessComment(comment) {
  const currentMax = (await getCurrentSettings()).MaxImagesPerComment;
  comment.setAttribute('yt-img', 'processed');

  const links = comment.querySelectorAll('a');
  if (links.length === 0) return;

  let currentCount = 0;

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
      currentCount++;

      const loadedImage = await GetImageFromURL(fullURL);
      if (loadedImage) {
        loadedImage.setAttribute('data-original-link', link.outerHTML);
        link.replaceWith(loadedImage);
      }
    }
  }
}