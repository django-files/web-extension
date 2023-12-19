// JS Background Service Worker

chrome.runtime.onInstalled.addListener(onInstalled)
chrome.contextMenus.onClicked.addListener(contextMenusClicked)
chrome.notifications.onClicked.addListener(notificationsClicked)
chrome.storage.onChanged.addListener(onChanged)

/**
 * Init Context Menus and Options
 * @function onInstalled
 * @param {InstalledDetails} details
 */
async function onInstalled(details) {
    console.log('onInstalled:', details)
    const githubURL = 'https://github.com/django-files/web-extension'
    const options = await Promise.resolve(
        setDefaultOptions({
            siteUrl: '',
            authToken: '',
            recentFiles: '10',
            contextMenu: true,
            popupPreview: true,
            showUpdate: false,
            checkAuth: false,
        })
    )
    console.log('options:', options)
    if (options.contextMenu) {
        createContextMenus()
    }

    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage()
    } else if (details.reason === 'update' && options.showUpdate) {
        const manifest = chrome.runtime.getManifest()
        if (manifest.version !== details.previousVersion) {
            let { internal } = await chrome.storage.sync.get(['internal'])
            internal = internal || {}
            if (internal?.lastShownUpdate !== manifest.version) {
                const url = `${githubURL}/releases/tag/${manifest.version}`
                console.log(`url: ${url}`)
                await chrome.tabs.create({ active: true, url })
                internal.lastShownUpdate = manifest.version
                console.log('internal:', internal)
                await chrome.storage.sync.set({ internal })
            }
        }
    }
    chrome.runtime.setUninstallURL(`${githubURL}/issues`)

    // Data Migrations
    await migrate2to3(details, options)
}

/**
 * Context Menu Click Callback
 * @function contextMenusClicked
 * @param {OnClickData} ctx
 */
async function contextMenusClicked(ctx) {
    // console.log('contextMenusClicked:', ctx)
    console.log(`ctx.menuItemId: ${ctx.menuItemId}`)
    if (ctx.menuItemId.startsWith('upload')) {
        if (ctx.srcUrl) {
            const mediaType =
                ctx.menuItemId.charAt(0).toUpperCase() + ctx.menuItemId.slice(1)
            console.log(`mediaType: ${mediaType}`)
            // console.log(`Processing URL: ${ctx.linkUrl}`)
            await processRemote('remote', ctx.srcUrl, `${mediaType} Uploaded`)
        }
    } else if (ctx.menuItemId === 'short') {
        if (ctx.linkUrl) {
            console.log('mediaType: short')
            // console.log(`Processing URL: ${ctx.linkUrl}`)
            await processRemote('shorten', ctx.linkUrl, 'Short Created')
        }
    } else if (ctx.menuItemId === 'options') {
        chrome.runtime.openOptionsPage()
    } else {
        console.warn('Action not handled.')
    }
}

async function notificationsClicked(notificationId) {
    console.log(`notifications.onClicked: ${notificationId}`)
    chrome.notifications.clear(notificationId)
    if (notificationId.startsWith('http')) {
        await chrome.tabs.create({ active: true, url: notificationId })
    }
}

/**
 * On Changed Callback
 * @function onChanged
 * @param {Object} changes
 * @param {String} namespace
 */
function onChanged(changes, namespace) {
    // console.log('onChanged:', changes, namespace)
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key === 'options' && namespace === 'sync' && oldValue && newValue) {
            if (oldValue.contextMenu !== newValue.contextMenu) {
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
}

/**
 * Create Context Menus
 * @function createContextMenus
 */
function createContextMenus() {
    console.log('createContextMenus')
    chrome.contextMenus.removeAll()
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

/**
 * Post URL to endpoint
 * @function postURL
 * @param {String} endpoint
 * @param {String} url
 * @return {Response}
 */
async function postURL(endpoint, url) {
    console.log(`postURL: "${endpoint}", "${url}"`)
    const { options } = await chrome.storage.sync.get(['options'])
    console.log('options:', options)
    if (!options?.siteUrl || !options?.authToken) {
        throw new Error('Missing URL or Token.')
    }

    const headers = { Authorization: options.authToken }
    const body = JSON.stringify({ url: url })
    const opts = {
        method: 'POST',
        headers: headers,
        body: body,
    }
    const apiUrl = `${options.siteUrl}/api/${endpoint}/`
    const response = await fetch(apiUrl, opts)
    console.log('response:', response)
    return response
}

/**
 * Get response from postURL and Process
 * @function processRemote
 * @param {String} endpoint
 * @param {String} url
 * @param {String} message
 */
async function processRemote(endpoint, url, message) {
    console.log(`processRemote: "${endpoint}", "${url}", "${message}"`)
    let response
    try {
        response = await postURL(endpoint, url)
    } catch (e) {
        console.log('error:', e)
        return await sendNotification('Fetch Error', `Error: ${error.message}`)
    }
    console.log('response:', response)
    if (response.ok) {
        const data = await response.json()
        console.log('data:', data)
        await clipboardWrite(data.url)
        await sendNotification(message, data.url, data.url)
    } else {
        try {
            const data = await response.json()
            console.log('data:', data)
            await sendNotification('Processing Error', `Error: ${data.error}`)
        } catch (e) {
            console.log('error:', e)
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

/**
 * Migrate from 0.2.X to 0.3.X
 * @function migrate2to3
 * @param {Object} details
 * @param {Object} options
 */
async function migrate2to3(details, options) {
    if (details.reason === 'update') {
        if (parseInt(details.previousVersion.split('.')[1]) < 3) {
            console.log(`Migration from version: ${details.previousVersion}`)
            let { auth } = await chrome.storage.sync.get(['auth'])
            console.log('auth:', auth)
            if (auth?.token && auth?.url) {
                options.authToken = auth.token
                options.siteUrl = auth.url
                auth = null
                await chrome.storage.sync.set({ auth, options })
                console.warn('Migrated Data from auth to options...')
            }
        }
    }
}
