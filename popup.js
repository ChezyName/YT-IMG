//setup links
const links = document.querySelectorAll('.ext-link');
links.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        chrome.tabs.create({ url: link.href });
    });
});

//load settings handler
document.addEventListener('DOMContentLoaded', async () => {
    log("Loaded Settings Popup Manager")
    const settings = await getCurrentSettings()
    let currentLimit = settings.MaxImagesPerComment

    const inputField = document.getElementById('cats')
    const decBtn = document.getElementById('btn-decrement')
    const incBtn = document.getElementById('btn-increment')

    function updateStepperState(newValue) {
        currentLimit = newValue
        inputField.value = newValue
        UpdateSetting("MaxImagesPerComment", newValue)
    }

    updateStepperState(currentLimit)

    decBtn.addEventListener('click', async () => {
       updateStepperState(currentLimit - 1)
    })

    incBtn.addEventListener('click', async () => {
        updateStepperState(currentLimit + 1)
    })
})