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

  let text = comment.textContent;
  let modified = false;

  log(`Testing: ${comment}`)

  const directMatches = [...text.matchAll(directImageRegex)];
  for (const match of directMatches) {
    const [fullURL] = match;
    
    const works = await isValidImage(fullURL);
    log(`${fullURL} ${works ? "is" : "is NOT"} a valid image URL.`)
    if (works) {
      text = text.replace(fullURL, GetImageFromURL(fullURL));
      modified = true;
    }
  }

  if (modified) {
    comment.innerHTML = text;
  }
}