// JS Exports

/**
 * Create Context Menus
 * @function createContextMenus
 */
export function createContextMenus() {
    console.log('createContextMenus')
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
