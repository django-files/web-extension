// Background Service Worker JS

chrome.runtime.onInstalled.addListener(function () {
    let contexts = [
        // 'page',
        // 'selection',
        ['link', 'Create Short URL'],
        ['image', 'Upload to Django Files'],
        ['video', 'Upload to Django Files'],
        ['audio', 'Upload to Django Files'],
    ]
    for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i]
        chrome.contextMenus.create({
            title: context[1],
            contexts: [context[0]],
            id: context[0],
        })
    }
})

async function addToClipboard(value) {
    try {
        // Firefox
        navigator.clipboard.writeText(value)
    } catch {
        // Chrome
        await chrome.offscreen.createDocument({
            url: 'html/offscreen.html',
            reasons: [chrome.offscreen.Reason.CLIPBOARD],
            justification: 'Write text to the clipboard.',
        })
        chrome.runtime.sendMessage({
            type: 'copy-data-to-clipboard',
            target: 'offscreen-doc',
            data: value,
        })
    }
}

async function sendNotification(title, text) {
    console.log(`sendNotification: ${title} - ${text}`)
    chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('images/logo128.png'),
        title,
        message: text,
        priority: 1,
    })
}

async function postURL(endpoint, url) {
    console.log('Processing URL: ' + url)
    let auth = (await chrome.storage.local.get('auth'))['auth']
    // let url = auth['url']
    // let token = auth['token']
    // let _url = (await chrome.storage.local.get('url'))['url']
    // let token = (await chrome.storage.local.get('token'))['token']
    console.log('auth.url: ' + auth['url'])
    console.log('auth.token: ' + auth['token'])

    let headers = { Authorization: auth['token'] }
    let body = JSON.stringify({ url: url })
    let options = {
        method: 'POST',
        headers: headers,
        body: body,
    }
    let response = await fetch(auth['url'] + '/api/' + endpoint + '/', options)
    console.log('Status: ' + response.status)
    console.log(response)
    return response
}

async function postData(url, message) {
    console.log('Processing URL: ' + url)
    let response
    try {
        response = await postURL('remote', url)
    } catch (error) {
        await sendNotification('Fetch Error', 'Error: ' + error.message)
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

chrome.contextMenus.onClicked.addListener(genericOnClick)

async function genericOnClick(ctx) {
    console.log('info.menuItemId: ' + ctx.menuItemId)
    switch (ctx.menuItemId) {
        case 'image':
            console.log('ctx:', ctx)
            if (ctx.srcUrl) {
                console.log('Processing URL: ' + ctx.srcUrl)
                await postData(ctx.srcUrl, 'Image Uploaded')
            }
            break
        case 'link':
            console.log('ctx:', ctx)
            if (ctx.linkUrl) {
                console.log('Processing URL: ' + ctx.linkUrl)
                await postData(ctx.linkUrl, 'Short Created')
            }
            break
        default:
            console.log('Warning: Click not handled.')
    }
}
