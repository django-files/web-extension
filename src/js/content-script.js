// JS Content Script

const openSidebarBtn = document.getElementById('openSidebar')
const closeSidebarBtn = document.getElementById('closeSidebar')

chrome.storage.sync.get(['auth', 'options']).then((result) => {
    // Check of Django Files Site
    if (window.location.origin !== result?.auth?.url) {
        return
    }
    // Check if on Preview Page
    if (openSidebarBtn) {
        if (result?.options?.previewSidebar) {
            openSidebarBtn.click()
        } else {
            closeSidebarBtn.click()
        }
        openSidebarBtn.addEventListener('click', toggleSidebar)
        closeSidebarBtn.addEventListener('click', toggleSidebar)
    }
})

/**
 * Open Sidebar Click Callback
 * @function openSidebar
 * @param {MouseEvent} event
 */
function toggleSidebar(event) {
    console.log('toggleSidebar:', event)
    saveOption(event.target.id === 'closeSidebar')
}

/**
 * Save Sidebar Option
 * @function saveOption
 * @param {Boolean} closeSidebar
 */
function saveOption(closeSidebar) {
    chrome.storage.sync.get(['options']).then((result) => {
        if (result?.options) {
            result.options.previewSidebar = !closeSidebar
            result.options.previewSidebar = browser.storage.sync.set({
                options: result.options,
            })
            console.log('result?.options:', result?.options)
        }
    })
}
