// JS for popup.html

import { debounce, openExtPanel, openSidePanel, showToast } from './exports.js'

import {
    Uppy,
    Dashboard,
    DropTarget,
    XHRUpload,
} from '../dist/uppy/uppy.min.mjs'

chrome.runtime.onMessage.addListener(onMessage)
document.addEventListener('DOMContentLoaded', initPopup)
document.getElementById('expire-form').addEventListener('submit', expireForm)
document
    .getElementById('password-form')
    .addEventListener('submit', passwordForm)
document
    .getElementById('confirm-delete')
    .addEventListener('click', deleteConfirm)
document
    .querySelectorAll('a[href]')
    .forEach((el) => el.addEventListener('click', linkClick))
document
    .querySelectorAll('input')
    .forEach((el) => el.addEventListener('change', saveOptions))
document
    .querySelectorAll('.add-auth')
    .forEach((el) => el.addEventListener('click', authCredentials))
document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el))

document.querySelectorAll('.modal').forEach((el) =>
    el.addEventListener('shown.bs.modal', (event) => {
        // noinspection JSUnresolvedReference
        const input = event.target?.querySelector('input')
        input?.focus()
        input?.select()
    })
)

async function windowResize() {
    // console.debug('windowResize:', event)
    const panelSize = `${window.outerWidth}x${window.outerHeight}`
    console.debug('panelSize:', panelSize)
    await chrome.storage.local.set({ panelSize })
}

const filesTable = document.getElementById('files-table')
const authAlert = document.getElementById('auth-alert')
const errorAlert = document.getElementById('error-alert')
const authButton = document.getElementById('auth-button')
const alwaysAuth = document.getElementById('always-auth')
const mediaOuter = document.getElementById('media-outer')
const mediaImage = document.getElementById('media-image')
const mediaError = document.getElementById('media-error')
const ctxMenuRow = document.getElementById('ctx-menu-row')
const expireInput = document.getElementById('expire-input')
const passwordInput = document.getElementById('password-input')
const sidePanel = document.getElementById('side-panel')
const popOut = document.getElementById('pop-out')
const popIn = document.getElementById('pop-in')

sidePanel.addEventListener('click', openSidePanel)
popOut?.addEventListener('click', popOutClick)
popIn?.addEventListener('click', popInClick)

const deleteModal = bootstrap.Modal.getOrCreateInstance('#delete-modal')
const expireModal = bootstrap.Modal.getOrCreateInstance('#expire-modal')
const passwordModal = bootstrap.Modal.getOrCreateInstance('#password-modal')
const uppyModal = bootstrap.Modal.getOrCreateInstance('#uppy-modal')

const faHourglass = document.querySelector('.clone > i.fa-hourglass')
const faLock = document.querySelector('.clone > i.fa-lock')
const faKey = document.querySelector('.clone > i.fa-key')

// noinspection TypeScriptUMDGlobal
const clipboard = new ClipboardJS('.clip') // NOSONAR
clipboard.on('success', () => showToast('Copied to Clipboard'))
clipboard.on('error', () => showToast('Clipboard Copy Failed', 'warning'))

const loadingImage = '../media/loading.gif'
let uppyInit = false
let authError = false
let mouseRow
let timeoutID
let timeout
let fileData

/**
 * Initialize Popup
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup(event) {
    console.debug('initPopup:', event)
    mouseRow = null
    errorAlert.classList.add('d-none')

    const { popupView } = await chrome.storage.local.get(['popupView'])
    console.debug('popupView:', popupView)

    if (popupView !== 'popup') {
        sidePanel.classList.add('d-none')
        popOut.classList.add('d-none')
        popIn.classList.remove('d-none')
        window.addEventListener('resize', debounce(windowResize))
    }

    // Options
    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)
    document.getElementById('popupPreview').checked = options.popupPreview
    const platform = await chrome.runtime.getPlatformInfo()
    if (platform.os !== 'android' && popupView === 'popup') {
        document.body.style.width = `${options.popupWidth}px`
        console.debug(`%c SET: width: ${options.popupWidth}`, 'color: Yellow')
        if (options.popupSidePanel) {
            sidePanel.classList.remove('d-none')
        }
    }
    if (platform.os === 'android') {
        document.documentElement.style.fontSize = '1.3rem'
        document
            .querySelectorAll('.hover-menu > a')
            .forEach((el) => el.classList.add('px-1'))
        console.debug('%c SET: fontSize: 1.3rem + px-1', 'color: Orange')
    }

    // Manifest
    // const manifest = chrome.runtime.getManifest()
    const imgLink = document.getElementById('img-link')
    // imgLink.href = manifest.homepage_url
    // imgLink.title = `v${manifest.version}`

    // Title Link
    // const titleLink = document.querySelector('.head h4 a')
    // titleLink.href = manifest.homepage_url
    if (options.siteUrl) {
        imgLink.title = options.siteUrl
        imgLink.href = options.siteUrl
    }

    // Ensure authError is set to false
    authError = false

    // If missing auth data or options.checkAuth check current site for auth
    if (!options.siteUrl || !options.authToken) {
        console.log('siteUrl, authToken:', options.siteUrl, options.authToken)
        // authButton.classList.remove('btn-sm')
        // authButton.classList.add('btn-lg', 'my-2')
        return displayAlert({ message: 'Missing URL or Token.', auth: true })
    }

    // Check auth if checkAuth is enabled in options
    if (options.checkAuth) {
        await checkSiteAuth()
    }

    // URL set in options, so show Django Files site link buttons
    if (options.popupLinks) {
        document
            .querySelectorAll('[data-location]')
            .forEach((el) => (el.href = options.siteUrl + el.dataset.location))
        document.getElementById('django-files-links').classList.remove('d-none')
    }

    // If recent files disabled, do nothing
    if (!parseInt(options.recentFiles, 10)) {
        return displayAlert({
            message: 'Recent Files Disabled in Options.',
            type: 'success',
        })
    }
    filesTable.classList.remove('d-none')
    genLoadingData(options.recentFiles)

    // Init Uppy
    initUppy(options)

    // Check Django Files API for recent files
    const opts = {
        method: 'GET',
        headers: { Authorization: options.authToken },
        cache: 'no-cache',
    }
    let response
    try {
        const url = new URL(`${options.siteUrl}/api/recent/`)
        url.searchParams.append('amount', options.recentFiles || '10')
        response = await fetch(url, opts)
        fileData = await response.json()
    } catch (e) {
        console.warn(e)
        return displayAlert({
            message: e.message,
            type: 'danger',
            auth: true,
        })
    }
    console.debug(`response.status: ${response.status}`, response, fileData)

    // Check response data is valid and has files
    if (!response?.ok) {
        console.warn(`error: ${fileData.error}`)
        return displayAlert({
            message: fileData.error,
            type: 'danger',
            auth: true,
        })
    } else if (fileData === undefined) {
        return displayAlert({ message: 'Response Data Undefined.', auth: true })
    } else if (!fileData.length) {
        return displayAlert({ message: 'No Files Returned.' })
    }
    if (popupView !== 'popup') {
        console.debug('%c SET: panel WxH', 'color: Lime')
        document.body.style.width = '100%'
    } else {
        document.body.style.minHeight = '300px'
    }

    // if (fileData.length < 8) {
    //     document.body.style.minHeight = '340px'
    // }
    // document.body.style.minHeight = '320px'

    // Update table should only be called here, changes should use initPopup()
    updateTable(fileData, options)

    if (platform.os !== 'android' && popupView === 'popup') {
        if (document.documentElement.scrollHeight > 600) {
            document.body.style.marginRight = '15px'
            document.body.style.width = `${document.body.clientWidth - 15}px`
            console.debug(
                `%c SET: width: ${document.body.clientWidth - 15}`,
                'color: Yellow'
            )
        }
    }

    // CTX menus are re-generated, eventListener re-addd
    document
        .querySelectorAll('[data-action]')
        .forEach((el) => el.addEventListener('click', ctxMenu))

    // File Links are re-generated, eventListener re-addd
    document
        .querySelectorAll('a[href]')
        .forEach((el) => el.addEventListener('click', linkClick))

    // Re-init clipboardJS after updateTable
    // noinspection TypeScriptUMDGlobal
    new ClipboardJS('.clip') // NOSONAR

    // Enable Popup Mouseover Preview if popupPreview
    timeout = options.popupTimeout * 1000
    if (options.popupPreview) {
        initPopupMouseover()
    }
}

/**
 * Initialize Uppy if not already Initialized
 * @function initUppy
 * @param {Object} options
 */
function initUppy(options) {
    if (uppyInit) {
        return console.debug('Uppy Already Initialized')
    }
    uppyInit = true
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
            height: 200,
            width: '100%',
            browserBackButtonClose: false,
        })
        .use(XHRUpload, {
            endpoint: options.siteUrl + '/upload/',
            headers: {
                Authorization: options.authToken,
            },
            // getResponseError: getResponseError,
        })
        .use(DropTarget, {
            target: document.body,
        })

    uppy.on('file-added', (file) => {
        console.debug('file-added:', file)
        uppyModal.show()
        mediaOuter.classList.add('d-none')
    })

    uppy.on('complete', async (fileCount) => {
        console.debug('complete:', fileCount)
        document
            .querySelector('.uppy-StatusBar-actionBtn--done')
            .addEventListener('click', (el) => uppyModal.hide())
        await initPopup()
    })

    uppy.on('dashboard:modal-open', () => {
        console.log('Modal is open')
    })

    uppyModal._element.addEventListener('hidden.bs.modal', (event) => {
        console.debug('hidden.bs.modal:', event)
        // noinspection JSUnresolvedReference
        uppy.cancelAll()
    })
}

/**
 * Link Click Callback
 * Note: Firefox popup requires a call to window.close()
 * @function linkClick
 * @param {MouseEvent} event
 * @param {Boolean} [close]
 */
export async function linkClick(event, close = true) {
    console.debug('linkClick:', close, event)
    event.preventDefault()
    const href = event.currentTarget.getAttribute('href').replace(/^\.+/g, '')
    console.debug('href:', href)
    let url
    if (href.startsWith('#')) {
        console.debug('return on anchor link')
        return
    } else if (href.endsWith('html/options.html')) {
        await chrome.runtime.openOptionsPage()
        if (close) window.close()
        return
        // } else if (href.endsWith('html/panel.html')) {
        //     await openExtPanel()
        //     if (close) window.close()
        //     return
    } else if (href.endsWith('html/sidepanel.html')) {
        openSidePanel()
        if (close) window.close()
        return
    } else if (href.startsWith('http')) {
        url = href
    } else {
        url = chrome.runtime.getURL(href)
    }
    console.debug('url:', url)
    await chrome.tabs.create({ active: true, url })
    if (close) window.close()
}

/**
 * On Message Callback
 * @function onMessage
 * @param {Object} message
 */
async function onMessage(message) {
    // console.log('onMessage: message, sender:', message, sender)
    if (message?.siteUrl && message?.authToken) {
        console.debug(`url: ${message.siteUrl}`)
        console.debug(`token: ${message.authToken}`)
        const { options } = await chrome.storage.sync.get(['options'])
        if (
            options?.siteUrl !== message.siteUrl ||
            options?.authToken !== message.authToken
        ) {
            const auth = {
                siteUrl: message.siteUrl,
                authToken: message.authToken,
            }
            await chrome.storage.local.set({ auth })
            console.info('New Authentication Found.')
            if (options.checkAuth) {
                alwaysAuth.classList.remove('d-none')
            }
            if (authError) {
                authButton.classList.remove('d-none')
            }
        }
    }
}

/**
 * Save Options Callback
 * @function saveOptions
 * @param {FormDataEvent} event
 */
async function saveOptions(event) {
    // console.log('saveOptions:', event)
    const { options } = await chrome.storage.sync.get(['options'])
    options[event.target.id] = event.target.checked
    console.info(`Set "${event.target.id}" to:`, event.target.checked)
    await chrome.storage.sync.set({ options })
    if (event.target.id === 'popupPreview') {
        if (event.target.checked) {
            console.debug('popupPreview Enabled. Running initPopupMouseover...')
            initPopupMouseover()
        } else {
            console.debug('popupPreview Disabled. Removing Event Listeners...')
            document.querySelectorAll('.link-underline').forEach((el) => {
                el.removeEventListener('mouseover', onMouseOver)
                el.removeEventListener('mouseleave', onMouseLeave)
            })
            mediaOuter.classList.add('d-none')
        }
    }
}

/**
 * Add Site Auth Button Callback
 * @function authCredentials
 * @param {MouseEvent} event
 */
async function authCredentials(event) {
    console.debug('authCredentials:', event)
    const { auth } = await chrome.storage.local.get(['auth'])
    console.debug('auth:', auth)
    if (auth?.authToken && auth?.siteUrl) {
        const { options } = await chrome.storage.sync.get(['options'])
        options.authToken = auth.authToken
        options.siteUrl = auth.siteUrl
        await chrome.storage.sync.set({ options })
        console.info('Auth Credentials Updated...')
        authButton.classList.add('d-none')
        authAlert.classList.add('d-none')
        errorAlert.classList.add('d-none')
        alwaysAuth.classList.add('d-none')
        mediaOuter.classList.add('d-none')
        await initPopup()
        if (options.contextMenu) {
            await chrome.runtime.sendMessage('createContextMenus')
        }
    } else {
        displayAlert({ message: 'Error Getting or Setting Credentials.' })
    }
}

/**
 * Generate Loading Data for filesTable
 * @function genLoadingData
 * @param {Number} rows
 */
function genLoadingData(rows) {
    console.debug('genLoadingData:', rows)
    const number = parseInt(rows.toString(), 10)
    if (number > 0) {
        filesTable.classList.remove('d-none')
        const tbody = filesTable.querySelector('tbody')
        const tr = filesTable.querySelector('tfoot tr')
        for (let i = 0; i < number; i++) {
            const row = tr.cloneNode(true)
            row.classList.remove('d-none')
            const rand = Math.floor(40 + Math.random() * 61)
            row.querySelector('.placeholder').style.width = `${rand}%`
            if (tbody.rows[i]) {
                tbody.replaceChild(row, tbody.rows[i])
            } else {
                tbody.appendChild(row)
            }
        }
    }
}

/**
 * Update Popup Table with Data
 * @function updateTable
 * @param {Object[]} data
 * @param {Object} options
 */
function updateTable(data, options) {
    console.debug('updateTable:', data)
    menuShown = false
    const tbody = filesTable.querySelector('tbody')
    const length = tbody.rows.length
    // console.debug(`data.length: ${data.length}`)
    // console.debug(`tbody.rows.length: ${tbody.rows.length}`)
    for (let i = 0; i < length; i++) {
        // console.debug(`i: ${i}`, data[i])
        let row = tbody.rows[i]
        if (!row) {
            row = tbody.insertRow()
        }
        if (data.length === i) {
            console.info('End of data. Removing remaining rows...')
            const rowsToRemove = length - i
            for (let j = 0; j < rowsToRemove; j++) {
                tbody.deleteRow(tbody.rows.length - 1)
            }
            break
        }
        row.addEventListener('mouseover', hoverLinks)
        row.id = `row-${i}`
        row.dataset.idx = i.toString()

        // Raw URL
        let rawURL = new URL(data[i].raw)
        if (data[i].password) {
            rawURL.searchParams.append('password', data[i].password)
        }

        // Thumb URL
        let thumbURL
        if (data[i].thumb) {
            thumbURL = new URL(data[i].thumb)
            thumbURL.searchParams.append('view', 'gallery')
        }
        if (data[i].password || data[i].private) {
            thumbURL.searchParams.append('token', options.authToken)
        }

        // Set mouseOver data on row
        row.classList.add('mouse-link')
        row.dataset.thumb = thumbURL?.href || rawURL.href
        row.dataset.name = data[i].name

        // File Link -> 1
        const link = document.createElement('a')
        link.text = data[i].name
        link.title = data[i].name
        link.href = data[i].url
        link.setAttribute('role', 'button')
        link.classList.add(
            'link-underline',
            'link-underline-opacity-0',
            'link-underline-opacity-75-hover',
            'file-link'
            // 'mouse-link'
        )
        link.target = '_blank'
        link.dataset.name = data[i].name
        link.dataset.row = i.toString()
        link.dataset.thumb = thumbURL?.href || rawURL.href

        // Cell: 1
        const cell1 = row.cells[0]
        cell1.classList.add('text-break')
        cell1.innerHTML = ''
        const div = document.createElement('div')
        div.style.position = 'relative'
        // div.classList.add('my-auto')
        div.appendChild(link)

        div.appendChild(faLock.cloneNode(true))
        div.appendChild(faKey.cloneNode(true))
        div.appendChild(faHourglass.cloneNode(true))

        if (options.popupIcons) {
            // noinspection JSIgnoredPromiseFromCall
            updateFileIcons(data[i], div)
        }

        const board = hoverboard.cloneNode(true)
        board.id = `menu-${i}`

        board.querySelector('.copy-link').dataset.clipboardText = data[i].url
        board.querySelector('.copy-raw').dataset.clipboardText = rawURL.href

        div.appendChild(board)
        cell1.appendChild(div)

        // CTX Button -> 0
        // const button = document.createElement('a')
        // button.classList.add('link-body-emphasis', 'ctx-button')
        // button.setAttribute('role', 'button')
        // button.setAttribute('aria-expanded', 'false')
        // button.dataset.bsToggle = 'dropdown'
        // button.innerHTML = '<i class="fa-solid fa-bars"></i>'
        const button = document.querySelector(`#row-${i} .ctx-button`)

        // CTX Drop Down -> Menu
        const drop = document
            .querySelector('.clone > .dropdown-menu')
            .cloneNode(true)
        drop.id = `ctx-${i}`
        // noinspection JSIgnoredPromiseFromCall
        updateContextMenu(drop, data[i])
        const fileName = drop.querySelector('li.mouse-link')
        fileName.innerText = data[i].name
        fileName.dataset.clipboardText = data[i].name
        fileName.dataset.thumb = thumbURL?.href || rawURL.href
        drop.querySelector('.copy-link').dataset.clipboardText = data[i].url
        drop.querySelector('.copy-raw').dataset.clipboardText = rawURL.href
        drop.querySelectorAll('.raw').forEach((el) => (el.href = rawURL.href))
        button.appendChild(drop)

        // Cell: 0
        // const cell0 = row.cells[0]
        // cell0.classList.add('align-middle')
        // cell0.style.width = '20px'
        // cell0.innerHTML = ''
        // cell0.appendChild(button)

        // const hoverIcon = document.createElement('div')
        // hoverIcon.id = 'hover-menu'
        // hoverIcon.classList.add('float-end')
        // hoverIcon.innerHTML = '<i class="fa-solid fa-bars"></i>'
    }
}

/**
 * @function updateFileIcons
 * @param {Object} file
 * @param {HTMLElement=} el
 */
async function updateFileIcons(file, el = null) {
    // console.debug('updateFileIcons:', file, el)
    const { options } = await chrome.storage.sync.get(['options'])
    if (!el) {
        el = document.getElementById(`row-${ctxMenuRow.value}`)
    }
    // console.debug('el:', el)
    const hourglass = el.querySelector('.fa-hourglass')
    if (options.iconExpire && file.expr) {
        hourglass.classList.remove('d-none')
    } else {
        hourglass.classList.add('d-none')
    }
    const lock = el.querySelector('.fa-lock')
    if (options.iconPrivate && file.private) {
        lock.classList.remove('d-none')
    } else {
        lock.classList.add('d-none')
    }
    const key = el.querySelector('.fa-key')
    if (options.iconPassword && file.password) {
        key.classList.remove('d-none')
    } else {
        key.classList.add('d-none')
    }
}

const hoverboard = document.getElementById('hover-menu')
let menuShown

/**
 * Like a hoverboard, but for links
 * @param {MouseEvent} event
 */
function hoverLinks(event) {
    // console.debug('hoverLinks:', event)
    const row = event.target.closest('tr')
    // console.log('row:', row)
    // console.log('idx', row.dataset.idx)
    if (menuShown !== row.dataset.idx) {
        if (menuShown) {
            document.getElementById(`menu-${menuShown}`).classList.add('d-none')
            const ctx = bootstrap.Dropdown.getOrCreateInstance(
                `#menu-${menuShown} .ctx-button`
            )
            // console.debug('ctx:', ctx)
            ctx.hide()
        }
        menuShown = row.dataset.idx
        document
            .getElementById(`menu-${row.dataset.idx}`)
            .classList.remove('d-none')
    }
}

/**
 * @function updateContextMenu
 * @param {HTMLElement} ctx
 * @param {Object} data
 */
async function updateContextMenu(ctx, data) {
    // console.debug('updateContextMenu:', ctx, data)
    if (data.view) {
        const views = ctx.querySelector('.view-text')
        views.innerText = data.view
        enableEl(ctx, '.view-text')
        enableEl(ctx, '.fa-eye')
    }
    if (data.private) {
        enableEl(ctx, '.fa-lock', 'text-danger-emphasis')
    }
    if (data.password) {
        enableEl(ctx, '.fa-key', 'text-warning-emphasis')
        // const link = ctx.querySelector('.pass-link')
        // link.classList.add('clip')
        // link.dataset.clipboardText = data.password
    } else {
        disableEl(ctx, '.fa-key', 'text-warning-emphasis')
    }
    if (data.expr) {
        enableEl(ctx, '.fa-hourglass-start')
        ctx.querySelector('.expr-text').innerText = data.expr
    } else {
        disableEl(ctx, '.fa-hourglass-start')
        ctx.querySelector('.expr-text').innerText = ''
    }
}

/**
 * Enable Element with Selector by Adding add
 * @function enableEl
 * @param {HTMLElement} ctx
 * @param {String} selector
 * @param {String=} add
 */
function enableEl(ctx, selector, add = 'text-body-emphasis') {
    const el = ctx.querySelector(selector)
    el.classList.remove('text-body-tertiary')
    el.classList.add(add)
}

/**
 * Disable Element with Selector by Removing remove
 * @function disableEl
 * @param {HTMLElement} ctx
 * @param {String} selector
 * @param {String=} remove
 */
function disableEl(ctx, selector, remove = 'text-body-emphasis') {
    const el = ctx.querySelector(selector)
    el.classList.remove(remove)
    el.classList.add('text-body-tertiary')
}

/**
 * Context Menu Click Callback
 * @function ctxMenu
 * @param {MouseEvent} event
 */
async function ctxMenu(event) {
    console.debug('ctxMenu:', event)
    event.preventDefault()
    const anchor = event.target.closest('a')
    // console.debug('anchor:', anchor)
    const action = anchor.dataset?.action
    console.debug('action:', action)
    const fileLink = event.target?.closest('tr')?.querySelector('.file-link')
    console.debug('row:', fileLink.dataset?.row)
    if (!fileLink.dataset?.row) {
        console.error('404: fileLink.dataset?.row - Fatal Error!')
    }
    ctxMenuRow.value = fileLink.dataset?.row
    const file = fileData[fileLink.dataset?.row]
    console.debug('file:', file)
    if (action === 'delete') {
        document.querySelector('#delete-modal .file-name').textContent =
            file.name
        const { options } = await chrome.storage.sync.get(['options'])
        if (options.deleteConfirm) {
            deleteModal.show()
        } else {
            await deleteConfirm(event)
        }
    } else if (action === 'expire') {
        expireInput.value = file.expr
        document.querySelector('#expire-modal .file-name').textContent =
            file.name
        expireModal.show()
    } else if (action === 'password') {
        passwordInput.value = file.password
        document.querySelector('#password-modal .file-name').textContent =
            file.name
        passwordModal.show()
    } else if (action === 'private') {
        await togglePrivate()
    }
}

/**
 * Toggle Private from ctxMenuRow.value
 * @function togglePrivate
 */
async function togglePrivate() {
    console.debug(`togglePrivate: ${ctxMenuRow.value}`)
    // event.preventDefault()
    const file = fileData[ctxMenuRow.value]
    console.debug('file:', file)
    const data = { private: !file.private }
    const response = await handleFile(file.name, 'POST', data)
    console.debug('response:', response)
    if (response.ok) {
        const json = await response.json()
        console.debug('json:', json)
        fileData[ctxMenuRow.value] = json
        const ctx = document.getElementById(`ctx-${ctxMenuRow.value}`)
        console.debug('ctx:', ctx)
        await updateFileIcons(json)
        if (json.private) {
            enableEl(ctx, '.fa-lock', 'text-danger-emphasis')
        } else {
            disableEl(ctx, '.fa-lock', 'text-danger-emphasis')
        }
        showToast(`Privacy Updated: <b>${file.name}</b>`)
    } else {
        console.info(`Private Error: "${file.name}", response:`, response)
        showToast(`Error Setting Privacy: <b>${file.name}</b>`, 'danger')
    }
}

/**
 * Password Form Submit Callback
 * @function passwordForm
 * @param {SubmitEvent} event
 */
async function passwordForm(event) {
    console.debug(`passwordForm: ${ctxMenuRow.value}:`, event)
    event.preventDefault()
    const file = fileData[ctxMenuRow.value]
    console.debug('file:', file)
    const password = passwordInput.value
    if (password === file.password) {
        console.info(`Passwords Identical: ${password} === ${file.password}`)
        showToast(`Passwords Identical: <b>${file.name}</b>`, 'warning')
        return passwordModal.hide()
    }
    console.log(`Setting Password: "${password}" on file: ${file.name}`)
    const data = { password: password }
    // TODO: Catch Error? Throw should happen during init...
    const response = await handleFile(file.name, 'POST', data)
    console.debug('response:', response)
    if (response.ok) {
        showToast(`Password Updated: <b>${file.name}</b>`)
        const json = await response.json()
        console.debug('json:', json)
        const ctx = document.getElementById(`ctx-${ctxMenuRow.value}`)
        console.debug('ctx:', ctx)
        fileData[ctxMenuRow.value] = json
        await updateContextMenu(ctx, json)
        await updateFileIcons(json)
        passwordModal.hide()
    } else {
        console.info(`Password Error: "${password}", response:`, response)
        showToast(`Error Setting Password: <b>${file.name}</b>`, 'danger')
        passwordModal.hide()
    }
}

/**
 * Expire Form Submit Callback
 * @function expireForm
 * @param {SubmitEvent} event
 */
async function expireForm(event) {
    console.debug(`expireForm: ${ctxMenuRow.value}:`, event)
    event.preventDefault()
    const file = fileData[ctxMenuRow.value]
    console.debug('file:', file)
    const expr = expireInput.value
    if (expr === file.expr) {
        console.info(`New Expire Value Same as Old: ${expr}`)
        showToast(`New Expire same as Previous: <b>${file.name}</b>`, 'warning')
        return expireModal.hide()
    }
    console.log(`Setting Expire: "${expr}" on file: ${file.name}`)
    const data = { expr: expr }
    // TODO: Catch Error? Throw should happen during init...
    const response = await handleFile(file.name, 'POST', data)
    console.debug('response:', response)
    if (response.ok) {
        showToast(`Expire Updated: <b>${file.name}</b>`)
        const json = await response.json()
        console.debug('json:', json)
        const ctx = document.getElementById(`ctx-${ctxMenuRow.value}`)
        console.debug('ctx:', ctx)
        fileData[ctxMenuRow.value] = json
        await updateContextMenu(ctx, json)
        await updateFileIcons(json)
        expireModal.hide()
    } else {
        console.info(`Error Setting Expire: "${expr}", response:`, response)
        showToast(`Error Setting Expire: <b>${file.name}</b>`, 'danger')
        expireModal.hide()
    }
}

/**
 * Confirm Delete Click Callback
 * @function deleteConfirm
 * @param {MouseEvent} event
 */
async function deleteConfirm(event) {
    console.debug(`deleteConfirm: ${ctxMenuRow.value}:`, event)
    event.preventDefault()
    const file = fileData[ctxMenuRow.value]
    console.debug('file:', file)
    const name = document.querySelector('#delete-modal .file-name').textContent
    console.log(`deleteConfirm await deleteFile: ${name}`)
    // TODO: Catch Error? Throw should happen during init...
    const response = await handleFile(name, 'DELETE')
    console.debug('response:', response)
    if (response.ok) {
        mediaOuter.classList.add('d-none')
        deleteModal.hide()
        await initPopup()
    } else {
        console.info(`Error Deleting: "${name}", response:`, response)
        showToast(`Error Deleting: <b>${name}</b>`, 'danger')
        deleteModal.hide()
    }
}

/**
 * Delete File Request
 * @function handleFile
 * @param {String} name
 * @param {String} method
 * @param {Object} data
 * @return {Response}
 */
async function handleFile(name, method, data = null) {
    console.debug(`handleFile: ${name}`)
    const { options } = await chrome.storage.sync.get(['options'])
    // console.debug('options:', options)
    const headers = { Authorization: options.authToken }
    const opts = {
        method: method,
        headers: headers,
    }
    if (data) {
        opts.body = JSON.stringify(data)
    }
    // TODO: Update to /file/ Endpoint...
    const apiUrl = `${options.siteUrl}/api/file/${name}`
    // const apiUrl = `${options.siteUrl}/api/delete/${name}`
    return await fetch(apiUrl, opts)
}

/**
 * Display Popup Error Message
 * @function displayAlert
 * @param {String} message
 * @param {String} type
 * @param {Boolean} auth
 */
function displayAlert({ message, type = 'warning', auth = false } = {}) {
    console.info(`displayAlert: ${type}:`, message)
    filesTable.classList.add('d-none')
    errorAlert.innerHTML = message
    errorAlert.classList.add(`alert-${type}`)
    errorAlert.classList.remove('d-none')
    if (auth) {
        authAlert.classList.remove('d-none')
        authError = true
        // noinspection JSIgnoredPromiseFromCall
        checkSiteAuth()
    }
}

async function checkSiteAuth() {
    console.debug('checkSiteAuth')
    try {
        const [tab] = await chrome.tabs.query({
            currentWindow: true,
            active: true,
        })
        console.debug('tab:', tab)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['/js/auth.js'],
        })
    } catch (e) {} // eslint-disable-line no-empty
}

function initPopupMouseover() {
    console.debug('initPopupMouseover')
    mediaOuter.addEventListener('mousemove', () => {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
        if (timeoutID) {
            clearTimeout(timeoutID)
        }
    })
    mediaImage.addEventListener('error', (event) => {
        console.debug('mediaError:', event)
        mediaImage.classList.add('d-none')
        mediaError.classList.remove('d-none')
        mediaImage.src = '../media/loading.gif'
    })
    filesTable.addEventListener('mouseleave', onMouseLeave)
    document.querySelectorAll('.mouse-link').forEach((el) => {
        el.addEventListener('mouseover', onMouseOver)
        // el.addEventListener('mouseout', onMouseLeave)
    })
}

function onMouseOver(event) {
    // console.debug(`onMouseOver: ${mouseRow}`, event.target)
    mediaError.classList.add('d-none')
    mediaImage.classList.remove('d-none')
    // console.debug(
    //     `event.pageY: ${event.pageY}`,
    //     `event.clientY: ${event.clientY}`,
    //     `window.innerHeight/2: ${window.innerHeight / 2}`
    // )
    if (event.clientY < window.innerHeight / 2) {
        mediaOuter.classList.remove('top-0')
        mediaOuter.classList.add('bottom-0')
        // console.debug('bottom')
    } else {
        mediaOuter.classList.remove('bottom-0')
        mediaOuter.classList.add('top-0')
        // console.debug('top')
    }
    const tr = event.target?.closest('tr')
    // console.debug(`onMouseOver: mouseRow = ${mouseRow}: tr.id = ${tr.id}`)
    // if (!tr.contains(event.target)) {
    //     mouseRow = null
    //     return console.debug('element is NOT child of row...')
    // }
    if (tr && tr.id === mouseRow) {
        clearTimeout(timeoutID)
        // return console.debug('onMouseOver: return')
    }
    mouseRow = tr.id
    // console.debug('tr:', tr)
    const imageExtensions = /\.(gif|ico|jpeg|jpg|png|svg|webp)$/i
    if (tr.dataset.name.match(imageExtensions)) {
        // console.log(`onMouseOver: src: ${tr.dataset.thumb}`)
        mediaImage.src = loadingImage
        mediaImage.src = tr.dataset.thumb
        // console.debug('dataset.thumb', tr.dataset.thumb)
        mediaOuter.classList.remove('d-none')
    } else {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
    }
    if (timeoutID) {
        // console.debug(`onMouseOver: clearTimeout: ${timeoutID}`)
        clearTimeout(timeoutID)
    }
}

function onMouseLeave() {
    // console.debug(`onMouseLeave: ${mouseRow}:`, event.target)
    // const tr = event.target.closest('tr')
    // const tr = document.getElementById(mouseRow)
    // if (filesTable.contains(event.target)) {
    //     // mouseRow = null
    //     return console.debug('element is child of table...')
    // }
    // console.debug('tr:', tr)
    // console.debug('mouseRow:', mouseRow)
    // if (tr.id === mouseRow) {
    //     // console.debug('onMouseLeave: return')
    //     return
    // }
    // console.debug('onMouseLeave: setTimeout')
    document.getElementById(`menu-${menuShown}`)?.classList.add('d-none')
    menuShown = null
    mouseRow = null
    timeoutID = setTimeout(function () {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
        timeoutID = null
    }, timeout)
}

/**
 * Open Pop Out Click Callback
 * @function popOutClick
 * @param {MouseEvent} event
 * @param {Boolean} [close]
 */
async function popOutClick(event, close = true) {
    console.debug('popOutClick:', event)
    await chrome.storage.local.set({ popupView: 'panel' })
    await chrome.action.setPopup({ popup: '' })
    await openExtPanel()
    if (close) window.close()
}

/**
 * Open Pop Out Click Callback
 * @function popInClick
 * @param {MouseEvent} event
 * @param {Boolean} [close]
 */
async function popInClick(event, close = true) {
    console.debug('popInClick:', event)
    await chrome.storage.local.set({ popupView: 'popup' })
    const popup = chrome.runtime.getURL('/html/popup.html')
    try {
        await chrome.action.setPopup({ popup })
        // TODO: Chrome Error: Extension does not have a popup on the active tab
        // await chrome.runtime.sendMessage('openPopup')
        // TODO: Chrome Error: Browser window has no toolbar.
        await chrome.action.openPopup()
    } catch (e) {
        console.debug(e)
    }
    if (close) window.close()
}
