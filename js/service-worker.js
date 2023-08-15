
chrome.contextMenus.onClicked.addListener(genericOnClick);

async function genericOnClick(info) {
    console.log('info.menuItemId: ' + info.menuItemId);
    // Standard context menu item function
    console.log('Standard context menu item clicked.');
    if (info.srcUrl) {
        console.log('Processing URL: ' + info.srcUrl);

        const url = (await chrome.storage.local.get('url'))['url'];
        const token = (await chrome.storage.local.get('token'))['token'];
        console.log('url: ' + url);
        console.log('token: ' + token);

        let headers = {Authorization: token};
        let body = JSON.stringify({url: info.srcUrl})
        let options = {
            method: 'POST', headers: headers, body: body
        }
        const response = await fetch(url + '/chrome/', options);
        console.log('Status: ' + response.status);
        console.log(response);
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            console.log(data['url']);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: '/images/logo128.png',
                title: `Image Uploaded`,
                message: 'URL: ' + data['url'],
                priority: 1
            });

            let uploads = (await chrome.storage.local.get('uploads'))['uploads'];
            if (uploads === undefined) {
                uploads = [];
            }
            uploads.push(data['url'])
            uploads.slice(0,5)
            chrome.storage.local.set({['uploads']: uploads});
            console.log(uploads);

            // await navigator.clipboard.writeText(data['url']);
        }
    }
}

chrome.runtime.onInstalled.addListener(function () {
    // Create one test item for each context type.
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
