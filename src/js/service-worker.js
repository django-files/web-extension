// Background Service Worker JS

chrome.runtime.onInstalled.addListener(function () {
    const contexts = [
        // 'page',
        // 'selection',
        ['link', 'Create Short URL'],
        ['image', 'Upload to Django Files'],
        ['video', 'Upload to Django Files'],
        ['audio', 'Upload to Django Files'],
    ]
    for (const element of contexts) {
        let context = element
        chrome.contextMenus.create({
            title: context[1],
            contexts: [context[0]],
            id: context[0],
        })
    }
})

chrome.contextMenus.onClicked.addListener(genericOnClick)

async function genericOnClick(ctx) {
    console.log('ctx.menuItemId: ' + ctx.menuItemId)
    console.log(ctx)
    if (ctx.menuItemId.match(/^(audio|image|video)$/)) {
        if (ctx.srcUrl) {
            let mediaType =
                ctx.menuItemId.charAt(0).toUpperCase() + ctx.menuItemId.slice(1)
            console.log('mediaType: ' + mediaType)
            console.log('Processing URL: ' + ctx.srcUrl)
            await processRemote('remote', ctx.srcUrl, `${mediaType} Uploaded`)
        }
    } else if (ctx.menuItemId.match(/^(link)$/)) {
        if (ctx.linkUrl) {
            console.log('Processing URL: ' + ctx.linkUrl)
            await processRemote('shorten', ctx.linkUrl, 'Short Created')
        }
    } else {
        console.log('Warning: Action not handled.')
    }
}

async function addToClipboard(value) {
    try {
        // Firefox
        await navigator.clipboard.writeText(value)
    } catch {
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

async function sendNotification(title, text, id) {
    console.log(`sendNotification: ${id}: ${title} - ${text}`)
    const options = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('images/logo128.png'),
        title: title,
        message: text,
    }
    chrome.notifications.create(id, options, function (notification) {
        setTimeout(function () {
            chrome.notifications.clear(notification)
        }, 10 * 1000)
    })
}

async function postURL(endpoint, srcUrl) {
    console.log(`Processing URL: ${srcUrl}`)
    const { url, token } = await chrome.storage.sync.get(['url', 'token'])
    console.log(`url: ${url}`)
    console.log(`token: ${token}`)

    const headers = { Authorization: token }
    const body = JSON.stringify({ url: srcUrl })
    const options = {
        method: 'POST',
        headers: headers,
        body: body,
    }
    const response = await fetch(`${url}/api/${endpoint}/`, options)
    console.log(`Status: ${response.status}`)
    console.log(response)
    return response
}

let names = []

async function processRemote(endpoint, url, message) {
    console.log(`Processing URL: ${url}`)
    // TODO: Update this fetch block
    let response
    try {
        response = await postURL(endpoint, url)
    } catch (error) {
        await sendNotification('Fetch Error', `Error: ${error.message}`)
    }
    const data = await response.json()
    console.log(data)
    if (response.ok) {
        console.log(`data.url: ${data.url}`)
        let filename = data.url.substring(url.lastIndexOf('/') + 1)
        console.log(`filename: ${filename}`)
        names.push(filename)
        await addToClipboard(data.url)
        await sendNotification(message, data.url, filename)
    } else {
        console.error(data['error'])
        await sendNotification('Processing Error', 'Error: ' + data['error'])
    }
}

let data = {}

async function processMessage(event) {
    console.log('processMessage')
    console.log(event)
    console.log(`event: ${event.event}`)
    switch (event.event) {
        case 'file-new':
            data[event.name] = event
            if (!names.includes(event.name)) {
                const { url } = await chrome.storage.sync.get(['url'])
                await addToClipboard(`${url}/u/${event.name}`)
                await sendNotification(
                    'File Created',
                    `New File: ${event.name}`,
                    event.name
                )
            }
            break
        case 'file-delete':
            await sendNotification(
                'File Deleted',
                `File: ${event.name}`,
                event.name
            )
            break
        default:
            console.log(`Unknown Event: ${event.event}`)
    }
}

let ws = null

function wsConnect() {
    console.log('wsConnect function')
    chrome.storage.sync.get(['url', 'token'], (items) => {
        console.log(`url: ${items.url}`)
        console.log(`token: ${items.token}`)
        if (items.url && items.token) {
            const appUrl = new URL(items.url)
            const wssUrl = `wss://${appUrl.host}/ws/home/`
            console.log(`wssUrl: ${wssUrl}`)
            ws = new WebSocket(wssUrl)
            ws.onopen = (event) => {
                console.log('websocket open')
                console.log(event)
                ws.send(
                    JSON.stringify({
                        method: 'authorize',
                        authorization: items.token,
                    })
                )
                keepAlive()
            }
            ws.onmessage = (event) => {
                console.log(event)
                console.log(`event.data: ${event.data}`)
                try {
                    const data = JSON.parse(event.data)
                    console.log(`data: ${data}`)
                    console.log(`event.data.event: ${data.event}`)
                    if (data.event) {
                        processMessage(data)
                    }
                } catch (e) {
                    console.log(e)
                }
            }
            ws.onclose = (event) => {
                console.log('websocket connection closed')
                console.log(event)
                if (event.code !== 1000) {
                    console.log(event)
                    setTimeout(function () {
                        console.log('Reconnecting...')
                        wsConnect()
                    }, 20 * 1000)
                } else {
                    ws = null
                }
            }
        }
    })
}

// function wsDisconnect() {
//     if (ws.readyState !== WebSocket.CLOSED) {
//         ws.close()
//         console.log('websocket disconnected')
//     }
// }

function keepAlive() {
    const keepAliveIntervalId = setInterval(() => {
        if (ws) {
            ws.send('ping')
        } else {
            clearInterval(keepAliveIntervalId)
        }
    }, 20 * 1000)
}

wsConnect()

chrome.runtime.onMessage.addListener(function (request) {
    console.log('onMessage')
    console.log(request)
    if (request.connect) {
        // wsDisconnect()
        wsConnect()
    }
})

chrome.notifications.onClicked.addListener((notificationId) => {
    console.log(`notifications.onClicked: ${notificationId}`)
    console.log(data[notificationId])
    if (data[notificationId]) {
        chrome.storage.sync.get(['url'], (items) => {
            console.log(items.url)
            const fullUrl = `${items.url}/u/${data[notificationId].name}`
            console.log(fullUrl)
            chrome.tabs.create({
                url: fullUrl,
            })
            chrome.notifications.clear(notificationId)
        })
    } else {
        console.error(`404 notificationId: ${notificationId}`)
    }
})
