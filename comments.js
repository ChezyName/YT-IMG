function ProcessComments() {
    const commentElements = document.querySelectorAll('#content-text:not([yt-img])')
    if (commentElements.length === 0) return
    log(`Found ${commentElements.length} Comments.`)

    commentElements.forEach(ProcessComment)
}

const imgRegex = /img:\/\/(\S+)/g
function ProcessComment(comment) {
    // Mark as used
    comment.setAttribute('yt-img', 'processed')

    const text = comment.textContent

    //uses multiple APIs, mainly imgur, giphy, tenor, and raw urls
    const newHTML = text.replace(imgRegex, (match, url) => {
        let HTML = GetImageFromURL(url)
        if (HTML == undefined) {
            return url
        }
    })

    // Swap out the text for our newly injected elements
    if (newHTML != text) {
        comment.innerHTML = newHTML
    }
}