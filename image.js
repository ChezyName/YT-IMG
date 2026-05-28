async function URLCompress(RawURL) {
  const blob = new Blob([url]);
  const stream = blob.stream().pipeThrough(new CompressionStream('deflate'));
  
  const compressedResponse = new Response(stream);
  const buffer = await compressedResponse.arrayBuffer();
  
  const bytes = new Uint8Array(buffer);
  let binaryStr = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binaryStr += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binaryStr).replace(/=+$/, '');
}

async function URLDeCompress(CompressedURL) {
    try {
        let base64 = CompressedURL;
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }

        const binaryStr = atob(base64);
        const bytes = Uint8Array.from(binaryStr, char => char.charCodeAt(0));
        const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('deflate'));

        const rawURL = await new Response(stream).text();
        return rawURL;
    } catch (error) {
        logErr("Failed to decompress URL:", error);
        return null;
    }
}

let APIs = {
    "giphy": GetGiphyImage,
    "tenor": GetTenorImage,
    "imgur": GetImgurImage,
}

//Returns image from URL - tries multiple APIs
//raw url = img://raw/[compressed or raw url]
//giphy, tenor, imgur url = img://giphy/giphy_Id
//expects "type/id"
function GetImageFromURL(URL) {
    //try APIs first then raw url then final nothing if error
    let [base, ID] = URL.split(/\/(.*)/s);
    let LaunchFunction = APIs[base.toLowerCase()];
    log(`Using ${LaunchFunction ? LaunchFunction.name : GetRawImage.name} on ${ID} [${base}]`)
    let FinalHTML = LaunchFunction ? LaunchFunction(URL) : GetRawImage(URL);
    return FinalHTML
}

function GetGiphyImage(URL) {

}

function GetTenorImage(URL) {

}

function GetImgurImage(URL) {

}

function GetRawImage(URL) {

}