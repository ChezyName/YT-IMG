//Saved so we don't have to re-create the image
const cachedImages = new Map() //keeps the raw, clones to export

//Gets the image for either the cache locally, or from the network
function GetImageFromURL(URL) {
  if(cachedImages.has(URL)) {
    let img = cachedImages.get(URL);
    return img ? img.cloneNode(true) : null;
  }

  return new Promise((resolve) => {
    const img = new Image()
    
    img.style.maxWidth = "80%"
    img.style.display = "block"
    img.setAttribute("referrerpolicy", "no-referrer")

    img.onload = () => {
      //create final image
      const wrapper = document.createElement('div')
      wrapper.style.margin = "0.75em 0"; //75% of line height of spacing 
      wrapper.appendChild(img)

      //save to cache before releasing
      cachedImages.set(URL, wrapper)
      resolve(wrapper.cloneNode(true))
    }

    img.onerror = (event) => {
        validationCache.set(URL, null)
        logFatal(`${URL} Prodcued ${event}`)
        resolve(null)
    }

    img.src = URL
  })
}