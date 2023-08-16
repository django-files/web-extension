
async function send_notification(title, text){
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '/images/logo128.png',
        title: title,
        message: text,
        priority: 1,
    });
}

async function post_url(endpoint, url){
    console.log('Processing URL: ' + url);

    let _url = (await chrome.storage.local.get('url'))['url'];
    let token = (await chrome.storage.local.get('token'))['token'];
    console.log('_url: ' + _url);
    console.log('token: ' + token);

    let headers = {Authorization: token};
    let body = JSON.stringify({url: url})
    let options = {
        method: 'POST', headers: headers, body: body
    }
    let response = await fetch(_url + '/api/' + endpoint + '/', options);
    console.log('Status: ' + response.status);
    console.log(response);
    return response;
}

chrome.contextMenus.onClicked.addListener(genericOnClick);

async function genericOnClick(ctx) {
    console.log('info.menuItemId: ' + ctx.menuItemId);
    if (ctx.srcUrl) {
        console.log('Processing URL: ' + ctx.srcUrl);
        let response;
        try {
            response = await post_url('remote', ctx.srcUrl)
        } catch (error) {
            await send_notification('Fetch Error', 'Error: ' + error.message);
        }
        const data = await response.json();
        console.log(data);
        if (response.ok) {
            console.log(data['url']);
            await send_notification('Image Uploaded', data['url']);
            // await navigator.clipboard.writeText(data['url']);
        } else {
            console.log(data['error']);
            await send_notification('Processing Error', 'Error: ' + data['error']);
        }
    }
}

chrome.runtime.onInstalled.addListener(function () {
    let contexts = [
        // 'page',
        // 'selection',
        // 'link',
        'image',
        'video',
        'audio',
    ];
    for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i];
        let title = "Upload to Django Files";
        chrome.contextMenus.create({
            title: title,
            contexts: [context],
            id: context,
        });
    }
});
