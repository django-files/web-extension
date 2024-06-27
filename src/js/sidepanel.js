// JS for sidepanel.html

import {
    Uppy,
    Dashboard,
    // DragDrop,
    DropTarget,
    // Webcam,
    // Audio,
    // ScreenCapture,
    XHRUpload,
} from '../dist/uppy/uppy.min.mjs'

document.addEventListener('DOMContentLoaded', domContentLoaded)
document.getElementById('close').addEventListener('click', closePanel)

/**
 * DOMContentLoaded
 * @function domContentLoaded
 */
async function domContentLoaded() {
    console.debug('domContentLoaded')
    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)

    // new Uppy().use(DragDrop, { target: document.body })

    const uppy = new Uppy({ debug: true, autoProceed: false })
        .use(Dashboard, {
            inline: true,
            theme: 'auto',
            target: '#uppy',
            showProgressDetails: true,
            showLinkToFileUploadResult: true,
            autoOpenFileEditor: true,
            proudlyDisplayPoweredByUppy: false,
            note: 'Django Files Upload',
            height: 260,
            width: '100%',
            metaFields: [
                { id: 'name', name: 'Name', placeholder: 'File Name' },
                {
                    id: 'Expires-At',
                    name: 'Expires At',
                    placeholder: 'File Expiration Time.',
                },
                {
                    id: 'info',
                    name: 'Info',
                    placeholder: 'Information about the file.',
                },
            ],
            browserBackButtonClose: false,
        })
        // .use(Webcam, { target: Dashboard })
        // .use(Audio, { target: Dashboard })
        // .use(ScreenCapture, { target: Dashboard })
        .use(XHRUpload, {
            endpoint: options.siteUrl + '/upload/',
            headers: {
                Authorization: options.authToken,
            },
            getResponseError: function (responseText, response) {
                return new Error(JSON.parse(responseText).message)
            },
        })
        .use(DropTarget, {
            target: document.body,
        })

    uppy.on('file-added', (file) => {
        console.debug('file-added:', file)
        // fileUploadModal.modal('show')
    })

    uppy.on('complete', (fileCount) => {
        console.debug('complete:', fileCount)
        // if (typeof fileUploadModal !== 'undefined') {
        //     fileUploadModal?.modal('hide')
        // }
    })

    uppy.on('upload-error', (file, error, response) => {
        console.debug('upload-error:', response.body.message)
    })

    uppy.on('error', (error) => {
        console.debug('error:', error)
    })
}

/**
 * Close Side Panel
 * @function closePanel
 */
async function closePanel(event) {
    console.debug('closePanel:', event)
    event.preventDefault()
    if (typeof browser !== 'undefined') {
        await browser.sidebarAction.close()
    } else {
        window.close()
    }
}
