// JS Exports

/**
 * Open Popup Event Handler
 * @function openPopup
 * @param {Event} [event]
 */
export async function openPopup(event) {
    console.debug('openPopup:', event)
    event?.preventDefault()
    try {
        const windows = await chrome.windows.getAll()
        await chrome.windows.update(windows[0].id, { focused: true })
        await chrome.action.openPopup({ windowId: windows[0].id })
    } catch (e) {
        console.log(e)
    }
}

/**
 * Open Side Panel Callback
 * @function openSidePanel
 * @param {MouseEvent} [event]
 */
export function openSidePanel(event) {
    console.debug('openSidePanel:', event)
    if (chrome.sidePanel) {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            // noinspection JSIgnoredPromiseFromCall
            chrome.sidePanel.open({ windowId: tab.windowId })
        })
    } else if (chrome.sidebarAction) {
        // noinspection JSUnresolvedReference
        chrome.sidebarAction.open()
    } else {
        console.log('Side Panel Not Supported')
        if (event) {
            return
        }
    }
    if (event) {
        window.close()
    }
}

/**
 * Open Extension Panel
 * TODO: Determine why this is not working consistently...
 * @function openExtPanel
 * @param {String} [url]
 * @param {Number} [width]
 * @param {Number} [height]
 * @param {String} [type]
 * @return {Promise<chrome.windows.Window>}
 */
export async function openExtPanel(
    url = '/html/popup.html',
    width = 0,
    height = 0,
    type = 'panel'
) {
    let { lastPanelID, panelSize } = await chrome.storage.local.get([
        'lastPanelID',
        'panelSize',
    ])
    console.debug('lastPanelID, panelSize:', lastPanelID, panelSize)
    const size = panelSize?.split('x') || [0, 0]
    console.debug('size:', size)
    width = parseInt(width || size[0] || 340)
    height = parseInt(height || size[1] || 600)
    console.debug(`openExtPanel: ${url}`, width, height)
    try {
        const window = await chrome.windows.get(lastPanelID)
        if (window) {
            console.debug(`%c Window found: ${window.id}`, 'color: Lime')
            return await chrome.windows.update(lastPanelID, {
                focused: true,
            })
        }
    } catch (e) {
        console.log(e)
    }
    const window = await chrome.windows.create({ type, url, width, height })
    // NOTE: Code after windows.create is not executed on the first pop-out...
    console.debug(`%c Created new window: ${window.id}`, 'color: Magenta')
    // chrome.storage.local.set({ lastPanelID: window.id })
    return window
}

/**
 * Show Bootstrap Toast
 * @function showToast
 * @param {String} message
 * @param {String} type
 */
export function showToast(message, type = 'success') {
    console.debug(`showToast: ${type}: ${message}`)
    const clone = document.querySelector('.d-none .toast')
    const container = document.getElementById('toast-container')
    if (clone && container) {
        const element = clone.cloneNode(true)
        element.querySelector('.toast-body').innerHTML = message
        element.classList.add(`text-bg-${type}`)
        container.appendChild(element)
        const toast = new bootstrap.Toast(element)
        element.addEventListener('mousemove', () => toast.hide())
        toast.show()
    } else {
        console.info('Missing clone or container:', clone, container)
    }
}

/**
 * DeBounce Function
 * @function debounce
 * @param {Function} fn
 * @param {Number} timeout
 */
export function debounce(fn, timeout = 250) {
    let timeoutID
    return (...args) => {
        clearTimeout(timeoutID)
        timeoutID = setTimeout(() => fn(...args), timeout)
    }
}

/**
 * @function updatePlatform
 * @return {Promise<any>}
 */
export async function updatePlatform() {
    const platform = await chrome.runtime.getPlatformInfo()
    console.debug('updatePlatform:', platform)
    const splitCls = (cls) => cls.split(' ').filter(Boolean)
    if (platform.os === 'android' && typeof document !== 'undefined') {
        // document.querySelectorAll('[class*="mobile-"]').forEach((el) => {
        document
            .querySelectorAll(
                '[data-mobile-add],[data-mobile-remove],[data-mobile-replace]'
            )
            .forEach((el) => {
                if (el.dataset.mobileAdd) {
                    for (const cls of splitCls(el.dataset.mobileAdd)) {
                        // console.debug('mobileAdd:', cls)
                        el.classList.add(cls)
                    }
                }
                if (el.dataset.mobileRemove) {
                    for (const cls of splitCls(el.dataset.mobileRemove)) {
                        // console.debug('mobileAdd:', cls)
                        el.classList.remove(cls)
                    }
                }
                if (el.dataset.mobileReplace) {
                    const split = splitCls(el.dataset.mobileReplace)
                    // console.debug('mobileReplace:', split)
                    for (let i = 0; i < split.length; i += 2) {
                        const one = split[i]
                        const two = split[i + 1]
                        // console.debug(`replace: ${one} >> ${two}`)
                        el.classList.replace(one, two)
                    }
                }
            })
    }
    return platform
}

// /**
//  *
//  * @param {String} type
//  * @param {Object} [data]
//  * @return {Promise<Any>}
//  */
// export async function sendOffscreen(type, data = {}) {
//     await chrome.offscreen.createDocument({
//         url: 'html/offscreen.html',
//         reasons: [chrome.offscreen.Reason.LOCAL_STORAGE],
//         justification: 'Access local storage.',
//     })
//     const message = { target: 'offscreen', type, data }
//     // noinspection JSIgnoredPromiseFromCall
//     return chrome.runtime.sendMessage(message)
// }

// /**
//  * @function localStorageFn
//  * @param {String} key
//  * @param {String} [value]
//  * @return {Promise<String>}
//  */
// export async function localStorageFn(key, value) {
//     console.debug(`localStorageFn: ${key}`, value)
//     if (typeof localStorage !== 'undefined') {
//         console.debug('%c Firefox: localStorage', 'color: Orange')
//         if (value) {
//             localStorage.setItem(key, value)
//         }
//         return localStorage.getItem(key)
//     } else if (chrome.offscreen) {
//         console.debug('%c Chrome: offscreen', 'color: DodgerBlue')
//         if (value) {
//             await sendOffscreen('storage', { key, value })
//         }
//         return sendOffscreen('storage', { key })
//     }
// }
