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

/// A regex that matches clean direct image URLs
const directImageRegex = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?/gi;

async function ProcessComment(comment) {
  let settings = await getCurrentSettings();
  const currentMax = settings.MaxImagesPerComment;
  const SavedImages = settings.Favorites;
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

      var skipButtonPlacement = false;
      if (typeof SavedImages !== 'undefined' && SavedImages.includes(fullURL)) {
        console.log(`Image already exists in database, skipping button injection: ${fullURL}`);
        skipButtonPlacement = true;
      }

      const loadedMarkup = await GetImageFromURL(fullURL);
      if (loadedMarkup) {
        currentCount++;

        // Extract the raw underlying image node element
        const actualImg = loadedMarkup.querySelector('img') || loadedMarkup;

        actualImg.setAttribute('data-original-link', link.outerHTML);
        actualImg.style.display = "block";
        actualImg.style.maxWidth = "100%";
        actualImg.style.height = "auto";
        actualImg.style.borderRadius = "8px"; 

        // 1. OUTER WRAPPER: Keeps the image explicitly isolated on its own new line block
        const blockLineWrapper = document.createElement('div');
        blockLineWrapper.className = "yt-img-block-line";
        blockLineWrapper.style.display = "block"; // Enforces separate row line break rule
        blockLineWrapper.style.width = "100%";
        blockLineWrapper.style.marginTop = "0.75em";
        blockLineWrapper.style.marginBottom = "0.75em";

        // 2. INNER LAYER: Shrinks exactly to the image's dimensions to serve as the absolute top/right anchor bounds
        const positioningAnchor = document.createElement('div');
        positioningAnchor.className = "yt-img-render-container";
        positioningAnchor.style.position = "relative";
        positioningAnchor.style.display = "inline-flex"; // Shrinks perfectly to child image width
        positioningAnchor.style.maxWidth = "100%";

        const saveBtn = document.createElement('button');
        saveBtn.type = "button";
        saveBtn.title = "Save Image";
        saveBtn.setAttribute("aria-label", "Save Image via YT-IMG");
        
        // Pinned perfectly relative to the inner positioning anchor (the visual graphic edge)
        saveBtn.style.position = "absolute";
        saveBtn.style.top = "8px";   
        saveBtn.style.right = "8px";
        saveBtn.style.zIndex = "10";
        saveBtn.style.width = "32px";
        saveBtn.style.height = "32px";
        saveBtn.style.borderRadius = "50%";
        saveBtn.style.border = "none";
        saveBtn.style.cursor = "pointer";
        saveBtn.style.display = "flex";
        saveBtn.style.alignItems = "center";
        saveBtn.style.justifyContent = "center";
        saveBtn.style.opacity = "0";
        saveBtn.style.outline = "none";
        saveBtn.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.4)"; 
        saveBtn.style.transition = "opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease, transform 0.1s ease";
        
        const isDarkMode = document.documentElement.hasAttribute('dark');
        const systemColor = isDarkMode ? "var(--yt-spec-text-primary, #fff)" : "#000000";

        // Style presets matching light/dark contexts
        saveBtn.style.backgroundColor = isDarkMode ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.85)";
        saveBtn.style.color = systemColor;

        // Bookmark vector shape markup
        saveBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" style="fill: currentcolor; pointer-events: none; display: block;">
            <path d="M0 0h24v24H0V0z" fill="none"/>
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
          </svg>
        `;

        // Micro-interaction handlers bound to the anchor container element
        positioningAnchor.addEventListener('mouseenter', () => saveBtn.style.opacity = "1");
        positioningAnchor.addEventListener('mouseleave', () => saveBtn.style.opacity = "0");
        
        saveBtn.addEventListener('mouseenter', () => {
          saveBtn.style.backgroundColor = isDarkMode ? "rgba(0, 0, 0, 0.95)" : "rgba(255, 255, 255, 1)";
          saveBtn.style.color = isDarkMode ? "#ffffff" : "#000000";
          saveBtn.style.transform = "scale(1.05)";
        });

        saveBtn.addEventListener('mouseleave', () => {
          saveBtn.style.backgroundColor = isDarkMode ? "rgba(0, 0, 0, 0.75)" : "rgba(255, 255, 255, 0.85)";
          saveBtn.style.color = systemColor;
          saveBtn.style.transform = "none";
        });

        saveBtn.addEventListener('click', handleSaveClick.bind(null, fullURL));
        function handleSaveClick(lockedURL, e) {
          e.preventDefault();
          e.stopPropagation();
          
          if (e.currentTarget) {
            e.currentTarget.remove();
          }
          
          SaveImage(lockedURL);
        }

        // Structural Tree Append Chains:
        // link gets replaced by blockLineWrapper (ensuring the new line break matches)
        link.replaceWith(blockLineWrapper);
        
        // Assemble the absolute composition inner structure
        blockLineWrapper.appendChild(positioningAnchor);
        positioningAnchor.appendChild(actualImg);
        
        if (!skipButtonPlacement) {
          positioningAnchor.appendChild(saveBtn);
        }
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
      loadImageUploader(customBtn, footer);
    });

    btnContainer.appendChild(customBtn);
    emojiSpan.parentNode.insertBefore(btnContainer, emojiSpan.nextSibling);
  });
}

async function loadImageUploader(anchorBtn, footerElement) {
  const existingPopup = document.getElementById('yt-img-uploader-popup');
  if (existingPopup) {
    existingPopup.remove();
    return;
  }

  const commentBoxContainer = footerElement.closest('ytd-commentbox, #comment-box');
  const targetInput = commentBoxContainer 
    ? commentBoxContainer.querySelector('#contenteditable-root, textarea, [contenteditable="true"]')
    : document.activeElement;

  let settings = await getCurrentSettings();
  let currentFilter = 'all'; 

  const popup = document.createElement('div');
  popup.id = 'yt-img-uploader-popup';
  
  const isDarkMode = document.documentElement.hasAttribute('dark');
  const textColor = isDarkMode ? '#fff' : '#030303';
  const subTextColor = isDarkMode ? '#aaa' : '#606060';
  const borderColor = isDarkMode ? '#333' : '#e5e5e5';
  const hoverBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const activeBg = isDarkMode ? '#3f3f3f' : '#e0e0e0';

  popup.style.position = 'absolute';
  popup.style.zIndex = '10000';
  popup.style.width = '320px';
  popup.style.maxHeight = '400px'; 
  popup.style.borderRadius = '12px';
  popup.style.boxShadow = isDarkMode ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.15)';
  popup.style.backgroundColor = isDarkMode ? '#212121' : '#ffffff';
  popup.style.border = `1px solid ${borderColor}`;
  popup.style.padding = '12px';
  popup.style.display = 'flex';
  popup.style.flexDirection = 'column';
  popup.style.gap = '10px';
  popup.style.boxSizing = 'border-box';

  // Dynamic Positioning
  const rect = anchorBtn.getBoundingClientRect();
  popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;

  const header = document.createElement('div');
  header.style.fontSize = '14px';
  header.style.fontWeight = '500';
  header.style.padding = '0 2px';
  header.style.color = textColor;
  header.textContent = 'Select Image';
  popup.appendChild(header);

  const filterRow = document.createElement('div');
  filterRow.style.display = 'flex';
  filterRow.style.justifyContent = 'center'; 
  filterRow.style.alignItems = 'center';
  filterRow.style.gap = '6px';
  filterRow.style.paddingBottom = '6px';
  filterRow.style.borderBottom = `1px solid ${borderColor}`;

  const createFilterTab = (label, filterType, isIcon = false) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.style.borderRadius = '16px';
    tab.style.border = 'none';
    tab.style.cursor = 'pointer';
    tab.style.fontWeight = '500';
    tab.style.transition = 'background-color 0.15s ease, color 0.15s ease';
    tab.style.display = 'inline-flex';
    tab.style.alignItems = 'center';
    tab.style.justifyContent = 'center';

    if (isIcon) {
      tab.style.padding = '6px';
      tab.style.width = '28px';
      tab.style.height = '28px';
      tab.title = 'Upload Image';
      tab.innerHTML = `
        <svg style="width: 18px; height: 18px; fill: currentcolor;" viewBox="0 0 24 24">
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
        </svg>
      `;
    } else {
      tab.textContent = label;
      tab.style.fontSize = '12px';
      tab.style.padding = '5px 12px';
    }

    const updateTabStyle = () => {
      if (currentFilter === filterType) {
        tab.style.backgroundColor = activeBg;
        tab.style.color = textColor;
      } else {
        tab.style.backgroundColor = isDarkMode ? '#333' : '#eee';
        tab.style.color = subTextColor;
      }
    };

    tab.addEventListener('click', () => {
      currentFilter = filterType;
      updateMainContentArea();
      Array.from(filterRow.children).forEach(child => child.updateStyle?.());
    });

    tab.updateStyle = updateTabStyle;
    updateTabStyle();
    return tab;
  };

  filterRow.appendChild(createFilterTab('All', 'all'));
  filterRow.appendChild(createFilterTab('Saved', 'saved'));
  filterRow.appendChild(createFilterTab('Favorites', 'favorites'));
  filterRow.appendChild(createFilterTab('', 'upload', true)); 
  popup.appendChild(filterRow);

  const bodyContainer = document.createElement('div');
  bodyContainer.style.overflowY = 'auto';
  bodyContainer.style.overflowX = 'hidden';
  bodyContainer.style.flex = '1';
  bodyContainer.style.display = 'flex';
  bodyContainer.style.flexDirection = 'column';
  popup.appendChild(bodyContainer);

  const gridContainer = document.createElement('div');
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
  gridContainer.style.gap = '8px';
  gridContainer.style.width = '100%';

  const uploadZone = document.createElement('div');
  uploadZone.style.border = `2px dashed ${borderColor}`;
  uploadZone.style.borderRadius = '8px';
  uploadZone.style.padding = '30px 10px';
  uploadZone.style.textAlign = 'center';
  uploadZone.style.cursor = 'pointer';
  uploadZone.style.fontSize = '13px';
  uploadZone.style.color = subTextColor;
  uploadZone.style.transition = 'background-color 0.2s, border-color 0.2s';
  uploadZone.style.display = 'flex';
  uploadZone.style.flexDirection = 'column';
  uploadZone.style.alignItems = 'center';
  uploadZone.style.justifyContent = 'center';
  uploadZone.style.gap = '8px';
  uploadZone.style.height = '160px';
  uploadZone.style.boxSizing = 'border-box';
  uploadZone.innerHTML = `
    <svg style="width: 32px; height: 32px; fill: ${subTextColor};" viewBox="0 0 24 24">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
    </svg>
    <span>Drag image here or click to upload</span>
  `;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  uploadZone.appendChild(fileInput);

  async function updateMainContentArea() {
    bodyContainer.innerHTML = '';

    if (currentFilter === 'upload') {
      bodyContainer.appendChild(uploadZone);
      return;
    }

    bodyContainer.appendChild(gridContainer);
    gridContainer.innerHTML = '';
    
    settings = await getCurrentSettings();

    let list = [];
    if (currentFilter === 'all') {
      list = [...new Set([...settings.UploadedImages, ...settings.Favorites])];
    } else if (currentFilter === 'saved') {
      list = settings.UploadedImages;
    } else if (currentFilter === 'favorites') {
      list = settings.Favorites;
    }

    if (list.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.gridColumn = 'span 2';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.fontSize = '12px';
      emptyMsg.style.color = subTextColor;
      emptyMsg.style.padding = '30px 0';
      emptyMsg.textContent = 'No images available.';
      gridContainer.appendChild(emptyMsg);
      return;
    }

    for (const imgUrl of list) {
      const card = document.createElement('div');
      card.style.position = 'relative';
      card.style.width = '100%';
      card.style.aspectRatio = '1 / 1'; 
      card.style.borderRadius = '8px';
      card.style.cursor = 'pointer';
      card.style.border = `1px solid ${isDarkMode ? '#2d2d2d' : '#f0f0f0'}`;
      card.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#fcfcfc';
      card.style.boxSizing = 'border-box';
      card.style.overflow = 'hidden'; 
      card.style.transition = 'transform 0.1s ease, border-color 0.15s ease';

      // Centering wrapper layouts
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'center';

      card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.02)';
        card.style.borderColor = isDarkMode ? '#555' : '#ccc';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'none';
        card.style.borderColor = isDarkMode ? '#2d2d2d' : '#f0f0f0';
      });

      // MUI Fallback Function
      const createMuiFallback = () => {
        const iconDiv = document.createElement('div');
        iconDiv.style.width = '100%';
        iconDiv.style.height = '100%';
        iconDiv.style.display = 'flex';
        iconDiv.style.alignItems = 'center';
        iconDiv.style.justifyContent = 'center';
        iconDiv.style.backgroundColor = isDarkMode ? '#141414' : '#f9f9f9';
        iconDiv.innerHTML = `
          <svg style="width: 32px; height: 32px; fill: ${isDarkMode ? '#ff4d4d' : '#cc0000'};" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z"></path>
          </svg>
        `;
        return iconDiv;
      };

      // Execution Engine mapping utilizing caching asynchronously
      if (typeof GetImageFromURL === 'function') {
        try {
          const cachedNode = await GetImageFromURL(imgUrl);
          if (cachedNode) {
            const nestedImg = cachedNode.querySelector('img');
            if (nestedImg) {
              const displayImg = nestedImg.cloneNode(true);
              
              // FORCE 100% SIZING OVERRIDES
              displayImg.style.width = '100%';
              displayImg.style.height = '100%';
              displayImg.style.maxWidth = '100%';
              displayImg.style.maxHeight = '100%';
              displayImg.style.objectFit = 'cover'; 
              displayImg.style.objectPosition = 'center'; 
              displayImg.style.display = 'block';
              
              card.appendChild(displayImg);
            } else {
              card.appendChild(createMuiFallback());
            }
          } else {
            card.appendChild(createMuiFallback());
          }
        } catch (e) {
          card.appendChild(createMuiFallback());
        }
      } else {
        const standardImg = new Image();
        standardImg.src = imgUrl;
        standardImg.style.width = '100%';
        standardImg.style.height = '100%';
        standardImg.style.objectFit = 'cover';
        standardImg.style.objectPosition = 'center';
        standardImg.style.display = 'block';
        standardImg.onerror = () => {
          standardImg.replaceWith(createMuiFallback());
        };
        card.appendChild(standardImg);
      }

      // Selection Insertion Handler
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (targetInput) {
          insertTextAtCursor(targetInput, ` ${imgUrl} `);
        } else {
          logWarn("Could not map structural textbox root for placement context.");
        }
        popup.remove();
      });

      gridContainer.appendChild(card);
    }
  }

  // When User Wants to Upload File via the UI popup
  async function processSelectedFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const labelSpan = uploadZone.querySelector('span');
    labelSpan.textContent = 'Uploading...';
    uploadZone.style.pointerEvents = 'none';

    try {
      const reader = new FileReader();
      reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const base64String = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        safeSendMessage({
          action: "upload",
          fileData: base64String,
          fileName: file.name || "uploaded_image.png",
          fileType: file.type
        }, async (response) => {
          if (response && response.success && response.url) {
            log(`Upload execution successful: ${response.url}`);
            
            if (typeof AddUploadedImage === 'function') {
              await AddUploadedImage(response.url);
            }
            
            labelSpan.textContent = 'Upload complete!';
            setTimeout(() => {
              labelSpan.textContent = 'Drag image here or click to upload';
              uploadZone.style.pointerEvents = 'auto';
              currentFilter = 'saved';
              Array.from(filterRow.children).forEach(child => child.updateStyle?.());
              updateMainContentArea();
            }, 1200);

          } else {
            const errMsg = response?.error || 'Unknown upload mapping exception.';
            logFatal(`Upload process breakdown: ${errMsg}`);
            labelSpan.textContent = 'Upload failed';
            setTimeout(() => {
              labelSpan.textContent = 'Drag image here or click to upload';
              uploadZone.style.pointerEvents = 'auto';
            }, 2000);
          }
        });
      };
      
      reader.readAsArrayBuffer(file); 
      
    } catch(err) {
      logFatal(`Exception encountered parsing file data stream: ${err.message}`);
      labelSpan.textContent = 'Upload failed';
      uploadZone.style.pointerEvents = 'auto';
    }
  }

  // Trigger file prompt on view container click interaction
  uploadZone.addEventListener('click', (e) => {
    if (e.target === fileInput) return;
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  });

  // Drag and Drop interface mapping hooks
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.style.backgroundColor = hoverBg;
      uploadZone.style.borderColor = isDarkMode ? '#aaa' : '#606060';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.style.backgroundColor = 'transparent';
      uploadZone.style.borderColor = borderColor;
    }, false);
  });

  uploadZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  }, false);

  // Paint views initial state context setup
  await updateMainContentArea();
  document.body.appendChild(popup);

  // Close popup logic tracking hooks
  const closePopupHandler = (event) => {
    if (!popup.contains(event.target) && !anchorBtn.contains(event.target)) {
      popup.remove();
      document.removeEventListener('click', closePopupHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closePopupHandler);
  }, 50);
}