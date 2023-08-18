async function addToClipboard(value) {
    try {
        navigator.clipboard.writeText(value)
    } catch {
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
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/logo128.png',
        title: title,
        message: text,
        priority: 1,
    })
}

async function postURL(endpoint, url) {
    console.log('Processing URL: ' + url)

    let _url = (await chrome.storage.local.get('url'))['url']
    let token = (await chrome.storage.local.get('token'))['token']
    console.log('_url: ' + _url)
    console.log('token: ' + token)

    let headers = { Authorization: token }
    let body = JSON.stringify({ url: url })
    let options = {
        method: 'POST',
        headers: headers,
        body: body,
    }
    let response = await fetch(_url + '/api/' + endpoint + '/', options)
    console.log('Status: ' + response.status)
    console.log(response)
    return response
}

chrome.contextMenus.onClicked.addListener(genericOnClick)

async function genericOnClick(ctx) {
    console.log('info.menuItemId: ' + ctx.menuItemId)
    switch (ctx.menuItemId) {
        case 'image':
            console.log('ctx:', ctx)
            if (ctx.srcUrl) {
                console.log('Processing URL: ' + ctx.srcUrl)
                let response
                try {
                    response = await postURL('remote', ctx.srcUrl)
                } catch (error) {
                    await sendNotification(
                        'Fetch Error',
                        'Error: ' + error.message
                    )
                }
                const data = await response.json()
                console.log(data)
                if (response.ok) {
                    console.log(data['url'])
                    await addToClipboard(data['url'])
                    await sendNotification('Image Uploaded', data['url'])
                } else {
                    console.log(data['error'])
                    await sendNotification(
                        'Processing Error',
                        'Error: ' + data['error']
                    )
                }
            }
            break
        case 'link':
            console.log('ctx:', ctx)
            if (ctx.linkUrl) {
                console.log('Processing URL: ' + ctx.linkUrl)
                let response
                try {
                    response = await postURL('shorten', ctx.linkUrl)
                } catch (error) {
                    await sendNotification(
                        'Fetch Error',
                        'Error: ' + error.message
                    )
                }
                const data = await response.json()
                console.log(data)
                if (response.ok) {
                    console.log(data['url'])
                    await addToClipboard(data['url'])
                    await sendNotification('Short Created', data['url'])
                } else {
                    console.log(data['error'])
                    await sendNotification(
                        'Processing Error',
                        'Error: ' + data['error']
                    )
                }
            }
            break
        default:
            console.log('Warning: Click not handled.')
    }
}

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
