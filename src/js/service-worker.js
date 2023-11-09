// Background Service Worker JS

import { createContextMenus } from './exports.js'

chrome.runtime.onInstalled.addListener(onInstalled)

chrome.contextMenus.onClicked.addListener(contextMenuClick)

chrome.notifications.onClicked.addListener((notificationId) => {
    console.log(`notifications.onClicked: ${notificationId}`)
    chrome.notifications.clear(notificationId)
})

/**
 * Init Context Menus and Options
 * @function onInstalled
 */
export async function onInstalled() {
    console.log('onInstalled')
    let { options } = await chrome.storage.sync.get(['options'])
    options = options || { contextMenu: true }
    console.log('options:', options)
    await chrome.storage.sync.set({ options })
    if (options.contextMenu) {
        createContextMenus()
    }
}

/**
 * Context Menu Click Callback
 * @function contextMenuClick
 * @param {OnClickData} ctx
 */
async function contextMenuClick(ctx) {
    console.log('contextMenuClick:', ctx)
    console.log(`ctx.menuItemId: ${ctx.menuItemId}`)
    if (ctx.menuItemId === 'upload') {
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
        const url = chrome.runtime.getURL('/html/options.html')
        await chrome.tabs.create({ active: true, url })
    } else {
        console.warn('Action not handled.')
    }
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
        await sendNotification('Fetch Error', 'Error: ' + error.message)
    }
    const data = await response.json()
    console.log(data)
    if (response.ok) {
        console.log(data['url'])
        await clipboardWrite(data['url'])
        await sendNotification(message, data['url'])
    } else {
        console.log(data['error'])
        await sendNotification('Processing Error', 'Error: ' + data['error'])
    }
}

/**
 * Send Browser Notification
 * @function sendNotification
 * @param {String} title
 * @param {String} text
 * @param {String} id
 * @param {Number} timeout
 */
async function sendNotification(title, text, id = '', timeout = 10) {
    console.log(`sendNotification: ${id || 'randomID'}: ${title} - ${text}`)
    const options = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('images/logo128.png'),
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
