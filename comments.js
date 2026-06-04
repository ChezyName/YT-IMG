function ProcessComments() {
    const commentElements = document.querySelectorAll('#content-text:not([yt-img])')
    if (commentElements.length === 0) return
    log(`Found ${commentElements.length} Comments.`)

    commentElements.forEach(ProcessComment)
}

// A regex that matches clean direct image URLs
const directImageRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi;

async function ProcessComment(comment) {
  comment.setAttribute('yt-img', 'processed');

  const links = comment.querySelectorAll('a');
  if (links.length === 0) return;

  for (const link of links) {
    const fullURL = link.href || link.textContent.trim();

    if (fullURL.match(/\.(?:png|jpg|jpeg|gif|webp)(?:\?|#|$)/i)) {
      
      const loadedImage = await GetImageFromURL(fullURL);
      if (loadedImage) {
        link.replaceWith(loadedImage);
        log(`Successfully embedded image: ${fullURL}`);
      }
    }
  }
}