// JS for popup.html

chrome.runtime.onMessage.addListener(onMessage)
document.addEventListener('DOMContentLoaded', initPopup)
document
    .getElementById('confirm-delete')
    .addEventListener('click', deleteConfirm)
document
    .querySelectorAll('a[href]')
    .forEach((el) => el.addEventListener('click', popupLinks))
document
    .querySelectorAll('input')
    .forEach((el) => el.addEventListener('change', saveOptions))
document
    .querySelectorAll('.add-auth')
    .forEach((el) => el.addEventListener('click', authCredentials))
document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el))

const filesTable = document.getElementById('files-table')
const errorAlert = document.getElementById('error-alert')
const authButton = document.getElementById('auth-button')
const alwaysAuth = document.getElementById('always-auth')
const mediaOuter = document.getElementById('media-outer')
const mediaImage = document.getElementById('media-image')
const mediaError = document.getElementById('media-error')
const deleteName = document.getElementById('delete-name')
const deleteModal = bootstrap.Modal.getOrCreateInstance('#delete-modal')

const clipboard = new ClipboardJS('.clip')
clipboard.on('success', () => showToast('Copied to Clipboard'))
clipboard.on('error', () => showToast('Clipboard Copy Failed', 'warning'))

const loadingImage = '../media/loading.gif'
let authError = false
let timeoutID
let timeout

/**
 * Initialize Popup
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup() {
    console.debug('initPopup')

    // Get options
    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)

    // Set Options (this is currently the only one in the popup)
    document.getElementById('popupPreview').checked = options.popupPreview

    // Ensure authError is set to false
    authError = false

    // Check auth if checkAuth is enabled in options
    if (options.checkAuth) {
        await checkSiteAuth()
    }

    // If missing auth data or options.checkAuth check current site for auth
    if (!options?.siteUrl || !options?.authToken) {
        console.log('siteUrl, authToken:', options?.siteUrl, options?.authToken)
        // authButton.classList.remove('btn-sm')
        // authButton.classList.add('btn-lg', 'my-2')
        return displayAlert({ message: 'Missing URL or Token.', auth: true })
    }

    // URL set in options, so show Django Files site link buttons
    document
        .querySelectorAll('[data-location]')
        .forEach((el) => (el.href = options.siteUrl + el.dataset.location))
    document.getElementById('django-files-links').classList.remove('d-none')

    // If recent files disabled, do nothing
    if (!parseInt(options.recentFiles, 10)) {
        return displayAlert({
            message: 'Recent Files Disabled in Options.',
            type: 'success',
        })
    }
    filesTable.classList.remove('d-none')
    genLoadingData(options.recentFiles)

    // Check Django Files API for recent files
    const opts = {
        method: 'GET',
        headers: { Authorization: options.authToken },
        cache: 'no-cache',
    }
    let response
    let data
    try {
        const url = new URL(`${options.siteUrl}/api/recent/`)
        url.searchParams.append('amount', options.recentFiles || '10')
        response = await fetch(url, opts)
        data = await response.json()
    } catch (e) {
        console.warn(e)
        return displayAlert({
            message: e.message,
            type: 'danger',
            auth: true,
        })
    }
    console.debug(`response.status: ${response.status}`, response, data)

    // Check response data is valid and has files
    if (!response?.ok) {
        console.warn(`error: ${data.error}`)
        return displayAlert({ message: data.error, type: 'danger', auth: true })
    } else if (data === undefined) {
        return displayAlert({ message: 'Response Data Undefined.', auth: true })
    } else if (!data.length) {
        return displayAlert({ message: 'No Files Returned.' })
    }

    // Update table should only be called here, changes should use initPopup()
    updateTable(data, options)
    document
        .querySelectorAll('.dropdown-item')
        .forEach((el) => el.addEventListener('click', ctxMenu))

    // Enable Popup Mouseover Preview if popupPreview
    timeout = options.popupTimeout * 1000
    if (options.popupPreview) {
        initPopupMouseover()
    }

    // Re-init popupLinks after updateTable
    document
        .querySelectorAll('a[href]')
        .forEach((el) => el.addEventListener('click', popupLinks))

    // Re-init clipboardJS after updateTable
    new ClipboardJS('.clip')
}

/**
 * Popup Links Click Callback
 * Firefox requires a call to window.close()
 * @function popupLinks
 * @param {MouseEvent} event
 */
async function popupLinks(event) {
    console.debug('popupLinks:', event)
    event.preventDefault()
    const anchor = event.target.closest('a')
    console.log(`anchor.href: ${anchor.href}`)
    if (anchor.href.endsWith('html/options.html')) {
        chrome.runtime.openOptionsPage()
    } else {
        await chrome.tabs.create({ active: true, url: anchor.href })
    }
    return window.close()
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
    console.info(`Set: "${event.target.id}" to target:`, event.target)
    console.debug('options:', options)
    await chrome.storage.sync.set({ options })
    if (event.target.id === 'popupPreview') {
        if (event.target.checked) {
            console.log('popupPreview Enabled. Running initPopupMouseover...')
            initPopupMouseover()
        } else {
            console.log('popupPreview Disabled. Removing Event Listeners...')
            document.querySelectorAll('.link-underline').forEach((el) => {
                el.removeEventListener('mouseover', onMouseOver)
                el.removeEventListener('mouseout', onMouseOut)
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
        errorAlert.classList.add('d-none')
        alwaysAuth.classList.add('d-none')
        mediaOuter.classList.add('d-none')
        await initPopup()
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
    const number = parseInt(rows, 10)
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
 * @param {Array} data
 * @param {Object} options
 */
function updateTable(data, options) {
    console.debug('updateTable:', data)
    const tbody = filesTable.querySelector('tbody')
    const length = tbody.rows.length
    // console.debug(`data.length: ${data.length}`)
    // console.debug(`tbody.rows.length: ${tbody.rows.length}`)
    for (let i = 0; i < length; i++) {
        // console.debug(`i: ${i}`)
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
        const value = data[i].url
        // TODO: This should not happen because of above condition
        if (!value) {
            console.error(`No Data Value at Index: ${i}`, row)
            continue
        }
        // TODO: This throws an error if value is not valid URL
        const url = new URL(value)
        // TODO: Return RAW URL from API
        const raw = url.origin + url.pathname.replace(/^\/u\//, '/raw/')
        const password = url.searchParams.get('password')
        let rawURL = new URL(raw)
        if (password) {
            rawURL.searchParams.append('password', password)
        }

        // CTX Button -> 0
        const button = document.createElement('a')
        button.classList.add('link-body-emphasis', 'ctx-button')
        button.setAttribute('role', 'button')
        button.setAttribute('aria-expanded', 'false')
        button.dataset.bsToggle = 'dropdown'
        button.innerHTML = '<i class="fa-solid fa-bars"></i>'

        // CTX Drop Down -> Menu
        const drop = document
            .querySelector('.d-none .dropdown-menu')
            .cloneNode(true)
        updateContextMenu(drop, data[i]).then()
        const fileName = drop.querySelector('li.mouse-link')
        console.log('fileName:', fileName)
        fileName.innerText = data[i].name
        fileName.dataset.clipboardText = data[i].name
        fileName.dataset.raw = `${raw}?token=${options.authToken}&view=gallery`
        drop.querySelector('.copy-link').dataset.clipboardText = value
        drop.querySelector('.copy-raw').dataset.clipboardText = rawURL.href
        drop.querySelectorAll('.raw').forEach((el) => (el.href = rawURL.href))
        button.appendChild(drop)

        // Cell: 0
        const cell0 = row.cells[0]
        cell0.classList.add('align-middle')
        cell0.style.width = '20px'
        cell0.innerHTML = ''
        cell0.appendChild(button)

        // File Link -> 1
        const link = document.createElement('a')
        link.text = data[i].name
        link.title = data[i].name
        link.href = value
        link.setAttribute('role', 'button')
        link.classList.add(
            'link-underline',
            'link-underline-opacity-0',
            'link-underline-opacity-75-hover',
            'file-link',
            'mouse-link'
        )
        link.target = '_blank'
        link.dataset.name = data[i].name
        // link.dataset.row = i.toString()
        // link.id = `file-${i}`
        link.dataset.raw = `${raw}?token=${options.authToken}&view=gallery`

        // Cell: 1
        const cell1 = row.cells[1]
        cell1.classList.add('text-break')
        cell1.innerHTML = ''
        cell1.appendChild(link)
    }
}

/**
 * @function updateContextMenu
 * @param {HTMLElement} ctx
 * @param {Object} data
 * @return {Promise<void>}
 */
async function updateContextMenu(ctx, data) {
    console.debug('updateContextMenu:', ctx, data)
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
        const link = ctx.querySelector('.pass-link')
        link.classList.add('clip')
        link.dataset.clipboardText = data.password
    }
    if (data.expr) {
        enableEl(ctx, '.fa-hourglass-start')
        ctx.querySelector('.expr-text').innerText = data.expr
    }
}

function enableEl(ctx, selector, add = 'text-body-emphasis') {
    const el = ctx.querySelector(selector)
    el.classList.remove('text-body-tertiary')
    el.classList.add(add)
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
    console.debug('action:', anchor.dataset?.action)
    const file = event.target?.closest('tr')?.querySelector('.file-link')
    console.debug('name:', file.dataset?.name)
    if (anchor.dataset?.action === 'delete') {
        deleteName.textContent = file.dataset?.name
        const { options } = await chrome.storage.sync.get(['options'])
        if (options.deleteConfirm) {
            deleteModal.show()
        } else {
            await deleteConfirm(event)
        }
    }
}

/**
 * Confirm Delete Click Callback
 * @function deleteConfirm
 * @param {MouseEvent} event
 */
async function deleteConfirm(event) {
    console.debug('deleteConfirm:', event)
    const name = deleteName.textContent
    console.log(`deleteConfirm await deleteFile: ${name}`)
    // TODO: Catch Error? Throw should happen during init...
    const response = await handleFile(name, 'DELETE')
    console.debug('response:', response)
    if (response.ok) {
        mediaOuter.classList.add('d-none')
        deleteModal.hide()
        await initPopup()
    } else {
        console.info(`Error Deleting File: "${name}", response:`, response)
        showToast(`Error Deleting: <strong>${name}</strong>`, 'danger')
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
    // console.log('options:', options)
    const headers = { Authorization: options.authToken }
    const opts = {
        method: method,
        headers: headers,
    }
    if (data) {
        opts.data = JSON.stringify(data)
    }
    const apiUrl = `${options.siteUrl}/api/file/${name}`
    return await fetch(apiUrl, opts)
}

/**
 * Show Bootstrap Toast
 * @function showToast
 * @param {String} message
 * @param {String} type
 */
function showToast(message, type = 'success') {
    console.log(`showToast: ${type}:`, message)
    const element = document.querySelector('.d-none .toast').cloneNode(true)
    element.classList.add(`text-bg-${type}`)
    element.querySelector('.toast-body').innerHTML = message
    document.getElementById('toast-container').appendChild(element)
    const toast = new bootstrap.Toast(element)
    element.addEventListener('mouseover', () => toast.hide())
    toast.show()
}

/**
 * Display Popup Error Message
 * @function displayAlert
 * @param {String} message
 * @param {String} type
 * @param {Boolean} auth
 */
function displayAlert({ message, type = 'warning', auth = false } = {}) {
    console.log(`displayAlert: ${type}:`, message)
    filesTable.classList.add('d-none')
    errorAlert.innerHTML = message
    errorAlert.classList.add(`alert-${type}`)
    errorAlert.classList.remove('d-none')
    if (auth) {
        authError = true
        checkSiteAuth().then()
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
    mediaOuter.addEventListener('mouseover', () => {
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
    document.querySelectorAll('.mouse-link').forEach((el) => {
        el.addEventListener('mouseover', onMouseOver)
        el.addEventListener('mouseout', onMouseOut)
    })
}

function onMouseOver(event) {
    // console.debug('onMouseOver:', event)
    mediaError.classList.add('d-none')
    mediaImage.classList.remove('d-none')
    if (event.pageY < window.innerHeight / 2) {
        mediaOuter.classList.remove('top-0')
        mediaOuter.classList.add('bottom-0')
    } else {
        mediaOuter.classList.remove('bottom-0')
        mediaOuter.classList.add('top-0')
    }
    const str = event.target.innerText
    const imageExtensions = /\.(gif|ico|jpeg|jpg|png|svg|webp)$/i
    if (str.match(imageExtensions)) {
        mediaImage.src = loadingImage
        mediaImage.src = event.target.dataset.raw
        mediaOuter.classList.remove('d-none')
    } else {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
    }
    // console.log('timeoutID:', timeoutID)
    if (timeoutID) {
        clearTimeout(timeoutID)
    }
}

function onMouseOut() {
    // console.debug('onMouseOut')
    timeoutID = setTimeout(function () {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
        timeoutID = undefined
    }, timeout)
}
