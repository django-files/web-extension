// JS Exports

/**
 * Create Context Menus
 * @function createContextMenus
 */
export function createContextMenus() {
    console.log('createContextMenus')
    const contexts = [
        [['link'], 'short', 'Create Short URL'],
        [['image'], 'upload-image', 'Upload Image'],
        [['video'], 'upload-video', 'Upload Video'],
        [['audio'], 'upload-audio', 'Upload Audio'],
        [['link', 'image', 'video', 'audio'], 'separator', 'separator-1'],
        [['link', 'image', 'video', 'audio'], 'options', 'Open Options'],
    ]
    for (const context of contexts) {
        if (context[1].startsWith('separator')) {
            chrome.contextMenus.create({
                type: context[1],
                contexts: context[0],
                id: context[2],
            })
        } else {
            chrome.contextMenus.create({
                title: context[2],
                contexts: context[0],
                id: context[1],
            })
        }
    }
}
