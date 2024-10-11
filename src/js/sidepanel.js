// JS for sidepanel.html

import { showToast } from './exports.js'

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

chrome.storage.onChanged.addListener(onChanged)
// chrome.runtime.onMessage.addListener(onMessage)
document.addEventListener('DOMContentLoaded', domContentLoaded)
document.getElementById('close').addEventListener('click', closePanel)
document
    .getElementById('options')
    .addEventListener('click', () => chrome.runtime.openOptionsPage())

const wsStatus = document.getElementById('ws-status')

/**
 * DOMContentLoaded
 * @function domContentLoaded
 */
async function domContentLoaded() {
    console.debug('domContentLoaded')
    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)

    // new Uppy().use(DragDrop, { target: document.body })

    // noinspection JSUnusedGlobalSymbols
    const uppy = new Uppy({ debug: false, autoProceed: false })
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
                console.debug('response:', response)
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
    if (options.siteUrl && options.authToken) {
        wsConnect(options)
    } else {
        wsStatus.textContent = `Missing Site URL or Token`
        wsStatus.className = ''
        wsStatus.classList.add('text-warning')
    }
}

/**
 * On Changed Callback
 * @function onChanged
 * @param {Object} changes
 * @param {String} namespace
 */
function onChanged(changes, namespace) {
    // console.debug('onChanged:', changes, namespace)
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (namespace === 'sync' && key === 'options') {
            if (
                oldValue.siteUrl !== newValue.siteUrl ||
                oldValue.authToken !== newValue.authToken
            ) {
                console.info('siteUrl or authToken changed:', ws)
                ws?.close(1000, 'new-auth')
                if (newValue.siteUrl && newValue.authToken) {
                    wsConnect(newValue)
                }
            }
        }
    }
}

// /**
//  * On Message Callback
//  * @function onMessage
//  * @param {Object} message
//  */
// async function onMessage(message) {
//     console.log('onMessage:', message)
// }

/**
 * Close Side Panel
 * @function closePanel
 */
async function closePanel(event) {
    console.debug('closePanel:', event)
    event.preventDefault()
    // noinspection JSUnresolvedReference
    if (typeof browser !== 'undefined') {
        // noinspection JSUnresolvedReference
        await browser.sidebarAction.close()
    } else {
        window.close()
    }
}

let ws
let reconnectTimeout

function wsConnect(options) {
    console.log('wsConnect:', options)
    console.log(`siteUrl: ${options.siteUrl}`)
    console.log(`authToken: ${options.authToken}`)
    const url = new URL(options.siteUrl)
    url.protocol = 'wss://'
    url.pathname = 'ws/home/'
    console.log(`url: ${url}`)
    ws = new WebSocket(url.href)
    ws.onopen = (event) => {
        console.log('ws.onopen:', event)
        wsStatus.textContent = ''
        clearInterval(reconnectTimeout)
        ws.send(
            JSON.stringify({
                method: 'authorize',
                authorization: options.authToken,
            })
        )
        keepAlive()
    }
    ws.onmessage = (event) => {
        // console.log('ws.onmessage:', event)
        // console.log('event.data:', event.data)
        if (event.data === 'pong') {
            return
        }
        try {
            console.log('event.data:', event.data)
            const data = JSON.parse(event.data)
            console.log('data:', data)
            if (data.username) {
                // noinspection JSUnresolvedReference
                wsStatus.textContent = `Connected as ${data.first_name || data.username}`
                wsStatus.className = ''
                wsStatus.classList.add('text-success')
            }
            if (data.event) {
                processMessage(data)
            }
        } catch (e) {
            console.warn(e)
        }
    }
    ws.onclose = (event) => {
        console.log(`ws.onclose: ${event.code}: ${event.reason}`, event)
        wsStatus.textContent = 'WS Closed, Reconnecting...'
        wsStatus.className = ''
        wsStatus.classList.add('text-danger')
        // We should not have to check 1001 here since side panel does not navigate
        if (![1000].includes(event.code)) {
            reconnectTimeout = setTimeout(function () {
                console.log('Reconnecting...')
                wsConnect(options)
            }, 20 * 1000)
        }
    }
}

function keepAlive() {
    const keepAliveIntervalId = setInterval(() => {
        if (ws.readyState === 1) {
            ws.send('ping')
        } else {
            clearInterval(keepAliveIntervalId)
        }
    }, 20 * 1000)
}

function processMessage(data) {
    console.log('processMessage:', data.event)
    if (data.event === 'file-new') {
        showToast(`Added: ${data.name}`, 'success')
    } else if (data.event === 'file-update') {
        showToast(`Updated: ${data.name}`, 'primary')
    } else if (data.event === 'file-delete') {
        showToast(`Deleted: ${data.name}`, 'warning')
    } else if (data.event === 'album-delete') {
        showToast(`Updated: ${data.name}`, 'primary')
    } else if (data.event === 'album-new') {
        showToast(`Album: ${data.name}`, 'primary')
    } else if (data.event === 'message') {
        console.log('data.message:', data.message)
        showToast(`Message: ${data.message}`, 'primary')
    }
}
