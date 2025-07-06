// JS Background Service Worker

import { openExtPanel, openSidePanel } from './exports.js'

chrome.runtime.onStartup.addListener(onStartup)
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.commands?.onCommand.addListener(onCommand)
chrome.contextMenus?.onClicked.addListener(contextMenusClicked)
chrome.notifications.onClicked.addListener(notificationsClicked)
chrome.storage.onChanged.addListener(onChanged)
chrome.runtime.onMessage.addListener(onMessage)

chrome.action.onClicked.addListener(actionOnClicked)

async function actionOnClicked(event) {
    console.debug('actionOnClicked:', event)
    await openExtPanel()
}

/**
 * On Installed Callback
 * @function onInstalled
 * @param {InstalledDetails} details
 */
async function onInstalled(details) {
    console.log('onInstalled:', details)
    const githubURL = 'https://github.com/django-files/web-extension'
    const installURL = 'https://django-files.github.io/extension/#configure'
    const options = await Promise.resolve(
        setDefaultOptions({
            siteUrl: '',
            authToken: '',
            recentFiles: 14,
            popupWidth: 380,
            popupTimeout: 10,
            popupPreview: true,
            popupIcons: true,
            iconPrivate: true,
            iconPassword: true,
            iconExpire: false,
            popupLinks: true,
            popupSidePanel: true,
            checkAuth: true,
            deleteConfirm: true,
            ctxSidePanel: true,
            contextMenu: true,
            showUpdate: false,
            radioBackground: 'bgPicture',
            pictureURL: 'https://picsum.photos/1920/1080',
            videoURL: '',
        })
    )
    console.log('options:', options)
    if (options.contextMenu) {
        // noinspection ES6MissingAwait
        createContextMenus(options)
    }
    const manifest = chrome.runtime.getManifest()
    if (details.reason === 'install') {
        // noinspection ES6MissingAwait
        chrome.runtime.openOptionsPage()
        await chrome.tabs.create({ active: false, url: installURL })
        await chrome.storage.local.set({ popupView: 'popup' })
    } else if (details.reason === 'update' && options.showUpdate) {
        if (manifest.version !== details.previousVersion) {
            let { internal } = await chrome.storage.sync.get(['internal'])
            internal = internal || {}
            if (internal?.lastShownUpdate !== manifest.version) {
                const url = `${githubURL}/releases/tag/${manifest.version}`
                console.log(`url: ${url}`)
                await chrome.tabs.create({ active: false, url })
                internal.lastShownUpdate = manifest.version
                console.log('storage.sync: internal:', internal)
                await chrome.storage.sync.set({ internal })
            }
        }
    }
    // noinspection ES6MissingAwait
    setPopup()
    setUninstallURL()
}

/**
 * On Startup Callback
 * @function onStartup
 */
async function onStartup() {
    console.log('onStartup')
    // noinspection JSUnresolvedReference
    if (typeof browser !== 'undefined') {
        console.log('Firefox CTX Menu Workaround')
        const { options } = await chrome.storage.sync.get(['options'])
        console.debug('options:', options)
        if (options.contextMenu) {
            await createContextMenus(options)
        }
    }
    // noinspection ES6MissingAwait
    setPopup()
    setUninstallURL()
}

function setUninstallURL() {
    const manifest = chrome.runtime.getManifest()
    const url = new URL('https://django-files.github.io/uninstall/')
    url.searchParams.append('version', manifest.version)
    chrome.runtime.setUninstallURL(url.href)
    console.debug(`setUninstallURL: ${url.href}`)
}

async function setPopup() {
    console.debug('setPopup')
    const { popupView } = await chrome.storage.local.get(['popupView'])
    console.debug('popupView:', popupView)
    if (popupView !== 'popup') {
        console.log('%c Clearing Popup...', 'color: Yellow')
        await chrome.action.setPopup({
            popup: '',
        })
    }
}

/**
 * On Command Callback
 * @function onCommand
 * @param {String} command
 */
async function onCommand(command) {
    console.debug(`onCommand: ${command}`)
    if (command === 'uploadFile') {
        const { options } = await chrome.storage.sync.get(['options'])
        if (options.siteUrl) {
            const url = `${options.siteUrl}/uppy/`
            await chrome.tabs.create({ active: true, url })
        }
    } else if (command === 'openGallery') {
        const { options } = await chrome.storage.sync.get(['options'])
        if (options.siteUrl) {
            const url = `${options.siteUrl}/gallery/`
            await chrome.tabs.create({ active: true, url })
        }
    } else if (command === 'showSidePanel') {
        openSidePanel()
    } else {
        console.warn('Unknown Command:', command)
    }
}

/**
 * Context Menus On Clicked Callback
 * @function contextMenusClicked
 * @param {OnClickData} ctx
 */
async function contextMenusClicked(ctx) {
    console.debug('contextMenusClicked:', ctx)
    if (ctx.menuItemId.startsWith('upload')) {
        if (ctx.srcUrl) {
            let type = ctx.menuItemId.split('-').at(-1)
            type = type.charAt(0).toUpperCase() + type.slice(1)
            await processRemote('remote', ctx.srcUrl, `${type} Uploaded`)
        }
    } else if (ctx.menuItemId.startsWith('album')) {
        const album = ctx.menuItemId.split('-')[1]
        console.debug(`album: ${album}`)
        const kwargs = { albums: album }
        await processRemote(
            'remote',
            ctx.srcUrl,
            `Uploaded to ${album}`,
            kwargs
        )
    } else if (ctx.menuItemId === 'short') {
        if (ctx.linkUrl) {
            await processRemote('shorten', ctx.linkUrl, 'Short Created')
        }
    } else if (ctx.menuItemId === 'copy') {
        if (ctx.srcUrl) {
            await clipboardWrite(ctx.srcUrl)
        }
    } else if (ctx.menuItemId === 'side-panel') {
        openSidePanel()
    } else if (ctx.menuItemId === 'options') {
        await chrome.runtime.openOptionsPage()
    } else {
        console.warn('Unknown ctx.menuItemId:', ctx.menuItemId)
    }
}

/**
 * Notifications On Clicked Callback
 * @function notificationsClicked
 * @param {String} notificationId
 */
async function notificationsClicked(notificationId) {
    console.debug('notifications.onClicked:', notificationId)
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
    // console.debug('onChanged:', changes, namespace)
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key === 'options' && namespace === 'sync' && oldValue && newValue) {
            if (
                oldValue.contextMenu !== newValue.contextMenu ||
                oldValue.ctxSidePanel !== newValue.ctxSidePanel
            ) {
                if (newValue?.contextMenu) {
                    console.log('Enabled contextMenu...')
                    // noinspection JSIgnoredPromiseFromCall
                    createContextMenus(newValue)
                } else {
                    console.log('Disabled contextMenu...')
                    chrome.contextMenus?.removeAll()
                }
            }
        }
    }
}

/**
 * On Message Callback
 * @function onMessage
 * @param {Object} message
 * @param {MessageSender} sender
 */
function onMessage(message, sender) {
    console.debug('onMessage: message, sender:', message, sender)
    if (message === 'createContextMenus') {
        chrome.storage.sync.get(['options'], (items) => {
            // noinspection JSIgnoredPromiseFromCall
            createContextMenus(items.options)
        })
    }
    if (message.type === 'log') {
        console.log(message.data)
    }
    // TODO: Chrome: Get openPopup to work after Pop In
    // if (message === 'openPopup') {
    //     // noinspection JSIgnoredPromiseFromCall
    //     chrome.action.openPopup()
    // }
}

/**
 * Create Context Menus
 * @function createContextMenus
 * @param {Object} options
 */
async function createContextMenus(options) {
    if (!chrome.contextMenus) {
        return console.debug('Skipping: chrome.contextMenus')
    }
    console.debug('createContextMenus:', options)
    chrome.contextMenus.removeAll()
    // Albums
    const albums = await getAlbums()
    console.debug('ctx: albums:', albums)
    if (albums?.length) {
        addContext([['image', 'video'], 'upload-album', 'Upload to Album'])
        for (const album of albums) {
            // console.debug('ctx: album:', album)
            chrome.contextMenus.create({
                contexts: ['image', 'video'],
                id: `album-${album}`,
                parentId: 'upload-album',
                title: album,
            })
        }
    }
    // General
    const ctx = ['image', 'video', 'audio', 'link']
    const contexts = [
        [['image'], 'upload-image', 'Upload Image'],
        [['video'], 'upload-video', 'Upload Video'],
        [['audio'], 'upload-audio', 'Upload Audio'],
        [['link'], 'short', 'Create Short URL'],
        [['image', 'video', 'audio'], 'copy', 'Copy Source URL'],
        [ctx, 'separator'],
    ]
    if (options.ctxSidePanel) {
        contexts.push(
            [['all'], 'side-panel', 'Show Side Panel'],
            [['all'], 'options', 'Open Options']
        )
    } else {
        contexts.push([ctx, 'options', 'Open Options'])
    }
    contexts.forEach(addContext)
}

/**
 * Add Context from Array
 * @function addContext
 * @param {[chrome.contextMenus.ContextType[],String,String,chrome.contextMenus.ContextItemType?]} context
 */
function addContext(context) {
    // console.debug('addContext:', context)
    try {
        if (context[1] === 'separator') {
            const id = Math.random().toString().substring(2, 7)
            context[1] = `${id}`
            context.push('separator', 'separator')
        }
        // console.debug('menus.create:', context)
        chrome.contextMenus.create({
            contexts: context[0],
            id: context[1],
            title: context[2],
            type: context[3] || 'normal',
        })
    } catch (e) {
        console.log('%c Error Adding Context:', 'color: Yellow', e)
    }
}

/**
 * @function getAlbums
 * @return {Promise<String[]|undefined>}
 */
async function getAlbums() {
    const { options } = await chrome.storage.sync.get(['options'])
    // console.debug('options:', options)
    if (!options.siteUrl) {
        console.warn('No Site URL:', options.siteUrl)
        return
    }
    const opts = {
        method: 'GET',
        headers: { Authorization: options.authToken },
    }
    console.debug('opts:', opts)
    let response
    let data
    const url = new URL(`${options.siteUrl}/api/albums/`)
    console.debug('url:', url)
    try {
        response = await fetch(url, opts)
        console.debug(`response.status: ${response.status}`, response)
        if (!response?.ok) {
            console.warn('Error Fetching:', url)
            return
        }
        data = await response.json()
    } catch (e) {
        console.warn(e)
        return
    }
    /** @type {[String]} */
    const albums = []
    /**
     * @type {Object}
     * @property {[String]} albums
     */
    for (const album of data.albums) {
        albums.push(album.name)
    }
    albums.sort()
    console.debug('albums:', albums)
    return albums
}

/**
 * Post URL to endpoint
 * @function postURL
 * @param {String} endpoint
 * @param {String} url
 * @param {Object=} kwargs Additional Header Key/Value Pairs
 * @return {Promise<Response>}
 */
async function postURL(endpoint, url, kwargs = {}) {
    console.debug('postURL:', endpoint, url)
    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)
    if (!options?.siteUrl || !options?.authToken) {
        throw new Error('Missing URL or Token.')
    }
    const headers = { ...{ Authorization: options.authToken }, ...kwargs }
    console.debug('headers:', headers)
    const body = JSON.stringify({ url: url })
    const opts = {
        method: 'POST',
        headers: headers,
        body: body,
    }
    const apiUrl = `${options.siteUrl}/api/${endpoint}/`
    const response = await fetch(apiUrl, opts)
    console.debug('response:', response)
    return response
}

/**
 * Process Remote Requests using postURL
 * @function processRemote
 * @param {String} endpoint
 * @param {String} url
 * @param {String} message
 * @param {Object=} kwargs Additional Header Key/Value Pairs
 */
async function processRemote(endpoint, url, message, kwargs) {
    console.debug('processRemote:', endpoint, url, message, kwargs)
    let response
    try {
        response = await postURL(endpoint, url, kwargs)
    } catch (e) {
        console.info('error:', e)
        return await sendNotification('Fetch Error', `Error: ${e.message}`)
    }
    // console.log('response:', response)
    if (response.ok) {
        const data = await response.json()
        console.debug('data:', data)
        await clipboardWrite(data.url)
        await sendNotification(message, data.url, data.url)
    } else {
        try {
            const data = await response.json()
            console.debug('data:', data)
            await sendNotification('Processing Error', `Error: ${data.error}`)
        } catch (e) {
            console.info('error:', e)
            await sendNotification(
                'Processing Error',
                `Error: Response Status: ${response.status}`
            )
        }
    }
}

/**
 * Send Notification
 * @function sendNotification
 * @param {String} title
 * @param {String} text
 * @param {String} id - Optional
 * @param {Number} timeout - Optional
 */
async function sendNotification(title, text, id = '', timeout = 10) {
    console.debug('sendNotification', title, text, id, timeout)
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
    console.debug('clipboardWrite:', value)
    if (navigator.clipboard) {
        // Firefox
        await navigator.clipboard.writeText(value)
    } else {
        // Chrome
        // await setupOffscreenDocument()
        await chrome.offscreen.createDocument({
            url: 'html/offscreen.html',
            reasons: [chrome.offscreen.Reason.CLIPBOARD],
            justification: 'Write text to the clipboard.',
        })
        const response = await chrome.runtime.sendMessage({
            target: 'offscreen',
            type: 'clipboard',
            data: value,
        })
        if (response) {
            console.warn('offscreen error:', response)
        }
    }
}

// let creating
// async function setupOffscreenDocument(path = 'html/offscreen.html') {
//     const offscreenUrl = chrome.runtime.getURL(path)
//     const existingContexts = await chrome.runtime.getContexts({
//         contextTypes: ['OFFSCREEN_DOCUMENT'],
//         documentUrls: [offscreenUrl],
//     })
//     console.log('existingContexts:', existingContexts)
//     if (existingContexts.length > 0) {
//         return
//     }
//
//     console.log('creating:', creating)
//     if (creating) {
//         await creating
//     } else {
//         creating = chrome.offscreen.createDocument({
//             url: path,
//             reasons: [chrome.offscreen.Reason.CLIPBOARD],
//             justification: 'Write text to the clipboard.',
//         })
//         console.log('creating:', creating)
//         await creating
//         console.log('creating:', creating)
//         creating = null
//     }
// }

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
