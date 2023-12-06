// JS Background Service Worker

chrome.runtime.onInstalled.addListener(onInstalled)
chrome.contextMenus.onClicked.addListener(contextMenuClick)
chrome.storage.onChanged.addListener(onChanged)

chrome.notifications.onClicked.addListener((notificationId) => {
    console.log(`notifications.onClicked: ${notificationId}`)
    chrome.notifications.clear(notificationId)
})

/**
 * Init Context Menus and Options
 * @function onInstalled
 * @param {InstalledDetails} details
 */
async function onInstalled(details) {
    console.log('onInstalled:', details)
    const ghUrl = 'https://github.com/django-files/web-extension'
    const defaultOptions = {
        recentFiles: '10',
        contextMenu: true,
        checkAuth: false,
        showUpdate: false,
        lastShownUpdate: '',
    }
    const options = await setDefaultOptions(defaultOptions)
    console.log('options:', options)
    if (options.contextMenu) {
        createContextMenus()
    }
    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage()
    } else if (options.showUpdate && details.reason === 'update') {
        const manifest = chrome.runtime.getManifest()
        if (options.lastShownUpdate !== manifest.version) {
            if (manifest.version !== details.previousVersion) {
                const url = `${ghUrl}/releases/tag/${manifest.version}`
                console.log(`url: ${url}`)
                await chrome.tabs.create({ active: true, url })
                options.lastShownUpdate = manifest.version
                await chrome.storage.sync.set({ options })
            }
        }
    }
    chrome.runtime.setUninstallURL(`${ghUrl}/issues`)
}

/**
 * Context Menu Click Callback
 * @function contextMenuClick
 * @param {OnClickData} ctx
 */
async function contextMenuClick(ctx) {
    console.log('contextMenuClick:', ctx)
    console.log(`ctx.menuItemId: ${ctx.menuItemId}`)
    if (ctx.menuItemId.startsWith('upload')) {
        if (ctx.srcUrl) {
            let mediaType =
                ctx.menuItemId.charAt(0).toUpperCase() + ctx.menuItemId.slice(1)
            console.log('mediaType: ' + mediaType)
            console.log('Processing URL: ' + ctx.srcUrl)
            await processRemote('remote', ctx.srcUrl, `${mediaType} Uploaded`)
        }
    } else if (ctx.menuItemId === 'short') {
        if (ctx.linkUrl) {
            console.log('Processing URL: ' + ctx.linkUrl)
            await processRemote('shorten', ctx.linkUrl, 'Short Created')
        }
    } else if (ctx.menuItemId === 'options') {
        chrome.runtime.openOptionsPage()
    } else {
        console.warn('Action not handled.')
    }
}

/**
 * On Changed Callback
 * @function onChanged
 * @param {Object} changes
 * @param {String} namespace
 */
function onChanged(changes, namespace) {
    console.log('onChanged:', changes, namespace)
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (
            key === 'options' &&
            namespace === 'sync' &&
            oldValue &&
            newValue &&
            oldValue.contextMenu !== newValue.contextMenu
        ) {
            if (newValue?.contextMenu) {
                console.log('Enabled contextMenu...')
                createContextMenus()
            } else {
                console.log('Disabled contextMenu...')
                chrome.contextMenus.removeAll()
            }
        }
    }
}

/**
 * Create Context Menus
 * @function createContextMenus
 */
function createContextMenus() {
    console.log('createContextMenus')
    const ctx = ['link', 'image', 'video', 'audio']
    const contexts = [
        [['link'], 'short', 'normal', 'Create Short URL'],
        [['image'], 'upload-image', 'normal', 'Upload Image'],
        [['video'], 'upload-video', 'normal', 'Upload Video'],
        [['audio'], 'upload-audio', 'normal', 'Upload Audio'],
        [ctx, 'separator-1', 'separator', 'separator'],
        [ctx, 'options', 'normal', 'Open Options'],
    ]
    contexts.forEach((context) => {
        chrome.contextMenus.create({
            contexts: context[0],
            id: context[1],
            type: context[2],
            title: context[3],
        })
    })
}

async function postURL(endpoint, url) {
    console.log('Processing URL: ' + url)
    const { auth } = await chrome.storage.sync.get(['auth'])
    console.log('auth:', auth)
    if (!auth?.url || !auth?.token) {
        throw new Error('Missing URL or Token.')
    }

    let headers = { Authorization: auth.token }
    let body = JSON.stringify({ url: url })
    let options = {
        method: 'POST',
        headers: headers,
        body: body,
    }
    let response = await fetch(auth.url + '/api/' + endpoint + '/', options)
    console.log('Status: ' + response.status)
    console.log(response)
    return response
}

async function processRemote(endpoint, url, message) {
    console.log('Processing URL: ' + url)
    let response
    try {
        response = await postURL(endpoint, url)
    } catch (error) {
        console.log('error:', error)
        return await sendNotification('Fetch Error', 'Error: ' + error.message)
    }
    console.log('response:', response)
    if (response.ok) {
        const data = await response.json()
        console.log('data:', data)
        await clipboardWrite(data.url)
        await sendNotification(message, data.url)
    } else {
        try {
            const data = await response.json()
            console.log('data:', data)
            await sendNotification('Processing Error', `Error: ${data.error}`)
        } catch (error) {
            console.log('error:', error)
            await sendNotification(
                'Processing Error',
                `Error: Response Status: ${response.status}`
            )
        }
    }
}

/**
 * Send Browser Notification
 * @function sendNotification
 * @param {String} title
 * @param {String} text
 * @param {String} id - Optional
 * @param {Number} timeout - Optional
 */
async function sendNotification(title, text, id = '', timeout = 10) {
    console.log(`sendNotification: ${id || 'randomID'}: ${title} - ${text}`)
    const options = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('media/logo96.png'),
        title: title,
        message: text,
    }
    chrome.notifications.create(id, options, function (notification) {
        setTimeout(function () {
            chrome.notifications.clear(notification)
        }, timeout * 1000)
    })
}

/**
 * Write value to Clipboard for Firefox and Chrome
 * @function clipboardWrite
 * @param {String} value
 */
async function clipboardWrite(value) {
    if (navigator.clipboard) {
        // Firefox
        await navigator.clipboard.writeText(value)
    } else {
        // Chrome
        await chrome.offscreen.createDocument({
            url: 'html/offscreen.html',
            reasons: [chrome.offscreen.Reason.CLIPBOARD],
            justification: 'Write text to the clipboard.',
        })
        await chrome.runtime.sendMessage({
            type: 'copy-data-to-clipboard',
            target: 'offscreen-doc',
            data: value,
        })
    }
}

/**
 * Set Default Options
 * @function setDefaultOptions
 * @param {Object} defaultOptions
 * @return {Object}
 */
async function setDefaultOptions(defaultOptions) {
    console.log('setDefaultOptions')
    let { options } = await chrome.storage.sync.get(['options'])
    options = options || {}
    let changed = false
    for (const [key, value] of Object.entries(defaultOptions)) {
        // console.log(`${key}: default: ${value} current: ${options[key]}`)
        if (options[key] === undefined) {
            changed = true
            options[key] = value
            console.log(`Set ${key}:`, value)
        }
    }
    if (changed) {
        await chrome.storage.sync.set({ options })
        console.log('options:', options)
    }
    return options
}
