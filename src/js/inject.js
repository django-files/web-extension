// Content Script JS inject.js

console.log('inject.js')

const openSidebarBtn = document.getElementById('openSidebar')
const closeSidebarBtn = document.getElementById('closeSidebar')

chrome.storage.sync.get(['options']).then((result) => {
    console.log('result?.options:', result?.options)
    if (result?.options?.previewSidebar) {
        console.log('openSidebar.click')
        openSidebarBtn.click()
    } else {
        console.log('closeSidebar.click')
        closeSidebarBtn.click()
    }
    openSidebarBtn.addEventListener('click', toggleSidebar)
    closeSidebarBtn.addEventListener('click', toggleSidebar)
})

/**
 * Open Sidebar Click Callback
 * @function openSidebar
 * @param {MouseEvent} event
 */
function toggleSidebar(event) {
    console.log('toggleSidebar:', event)
    const close = event.target.id === 'closeSidebar'
    saveOption(close)
}

/**
 * Save Sidebar Option
 * @function saveOption
 * @param {Boolean} closeSidebar
 */
function saveOption(closeSidebar) {
    chrome.storage.sync.get(['options']).then((result) => {
        console.log('result?.options:', result?.options)
        if (result?.options) {
            result.options.previewSidebar = !closeSidebar
            result.options.previewSidebar = browser.storage.sync.set({
                options: result.options,
            })
        }
    })
}
