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

async function sendNotification(title, text) {
    console.log(`sendNotification: ${title} - ${text}`)
    await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('images/logo128.png'),
        title: title,
        message: text,
        priority: 1,
    })
}

async function postURL(endpoint, srcUrl) {
    console.log(`Processing URL: ${srcUrl}`)
    const { url, token } = await chrome.storage.local.get(['url', 'token'])
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

async function processRemote(endpoint, url, message) {
    console.log(`Processing URL: ${url}`)
    let response
    try {
        response = await postURL(endpoint, url)
    } catch (error) {
        await sendNotification('Fetch Error', `Error: ${error.message}`)
    }
    const data = await response.json()
    console.log(data)
    if (response.ok) {
        console.log(data['url'])
        await addToClipboard(data['url'])
        await sendNotification(message, data['url'])
    } else {
        console.log(data['error'])
        await sendNotification('Processing Error', 'Error: ' + data['error'])
    }
}

let ws = null

function connect() {
    console.log('websocket connect function')
    // let gettingItem = browser.storage.local.get(['url', 'token'])
    chrome.storage.local.get(['url', 'token'], (items) => {
        console.log(`url: ${items.url}`)
        console.log(`token: ${items.token}`)
        if (items.url && items.token) {
            const appUrl = new URL(items.url)
            const wssUrl = `wss://${appUrl.host}/ws/home/`
            console.log(`wssUrl: ${wssUrl}`)
            ws = new WebSocket(wssUrl)
            ws.onopen = (event) => {
                console.log('websocket open')
                ws.send(
                    JSON.stringify({
                        method: 'authorize',
                        authorization: items.token,
                    })
                )
                keepAlive()
            }

            ws.onmessage = (event) => {
                console.log(`websocket received message: ${event.data}`)
            }

            ws.onclose = (event) => {
                console.log('websocket connection closed')
                ws = null
            }
        }
    })
}

function keepAlive() {
    const keepAliveIntervalId = setInterval(() => {
        if (ws) {
            ws.send('ping')
        } else {
            clearInterval(keepAliveIntervalId)
        }
    }, 20 * 1000)
}

// // Start function
// const start = async function () {
//     const result = await connect()
//     console.log(result)
// }

connect()

// await connect()
