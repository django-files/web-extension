// JS for offscreen.html

chrome.runtime.onMessage.addListener(onMessage)

/**
 * On Message Callback
 * @function onMessage
 * @param {Object} message
 * @property {String} target
 * @property {String} type
 * @property {Any} data
 * @param {MessageSender} sender
 * @param {Function} sendResponse
 */
function onMessage(message, sender, sendResponse) {
    console.debug('%c onMessage:', 'color: Lime', message, sender)
    try {
        if (message.target !== 'offscreen') {
            console.debug('Not offscreen message.')
            return
        }
        if (message.type === 'clipboard') {
            handleClipboardWrite(message.data)
        } else {
            console.warn('Unknown message for offscreen:', message)
        }
    } catch (e) {
        console.error(e.toString())
        sendResponse(e.toString())
    } finally {
        console.debug('window.close')
        window.close()
    }
}

function handleClipboardWrite(data) {
    console.debug('handleClipboardWrite:', data)
    if (typeof data !== 'string') {
        throw new TypeError(`Value must be "string" got: "${typeof data}"`)
    }
    // const el = document.createElement('textarea')
    // document.body.appendChild(el)
    const textEl = document.getElementById('text')
    textEl.value = data
    textEl.select()
    document.execCommand('copy')
    console.debug('%c handleClipboardWrite: SUCCESS', 'color: Lime')
}

// function handleClipboardWrite(data) {
//     console.debug('handleClipboardWrite2:', data)
//     if (typeof data !== 'string') {
//         throw new TypeError(`Value must be "string" got: "${typeof data}"`)
//     }
//     // noinspection JSIgnoredPromiseFromCall
//     navigator.clipboard.writeText(data)
//     console.debug('%c handleClipboardWrite: SUCCESS', 'color: Lime')
// }
