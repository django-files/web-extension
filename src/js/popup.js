// JS for popup.html

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

document.querySelectorAll('.modal').forEach((el) =>
    el.addEventListener('shown.bs.modal', (event) => {
        const input = event.target?.querySelector('input')
        input?.focus()
        input?.select()
    })
)

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

const deleteModal = bootstrap.Modal.getOrCreateInstance('#delete-modal')
const expireModal = bootstrap.Modal.getOrCreateInstance('#expire-modal')
const passwordModal = bootstrap.Modal.getOrCreateInstance('#password-modal')

const faLock = document.querySelector('.clone > i.fa-lock')
const faKey = document.querySelector('.clone > i.fa-key')

const clipboard = new ClipboardJS('.clip')
clipboard.on('success', () => showToast('Copied to Clipboard'))
clipboard.on('error', () => showToast('Clipboard Copy Failed', 'warning'))

const loadingImage = '../media/loading.gif'
let authError = false
let timeoutID
let timeout
let fileData

/**
 * Initialize Popup
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup() {
    console.debug('initPopup')

    const manifest = chrome.runtime.getManifest()
    const imgLink = document.querySelector('.head img').closest('a')
    imgLink.href = manifest.homepage_url
    imgLink.title = `v${manifest.version}`
    const titleLink = document.querySelector('.head h3 a')
    titleLink.href = manifest.homepage_url

    // Get options
    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)

    // Set Options (this is currently the only one in the popup)
    document.getElementById('popupPreview').checked = options.popupPreview

    document.body.style.width = `${options.popupWidth}px`

    // Set Title Link and Title if siteUrl
    if (options.siteUrl) {
        titleLink.title = options.siteUrl
        titleLink.href = options.siteUrl
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

    // if (fileData.length < 8) {
    //     document.body.style.minHeight = '340px'
    // }
    document.body.style.minHeight = '320px'

    // Update table should only be called here, changes should use initPopup()
    updateTable(fileData, options)

    // CTX menus are re-generated, eventListener re-addd
    document
        .querySelectorAll('[data-action]')
        .forEach((el) => el.addEventListener('click', ctxMenu))

    // File Links are re-generated, eventListener re-addd
    document
        .querySelectorAll('a[href]')
        .forEach((el) => el.addEventListener('click', popupLinks))

    // Re-init clipboardJS after updateTable
    new ClipboardJS('.clip')

    // Enable Popup Mouseover Preview if popupPreview
    timeout = options.popupTimeout * 1000
    if (options.popupPreview) {
        initPopupMouseover()
    }
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
    console.debug(`anchor.href: ${anchor.href}`, anchor)
    let url
    if (anchor.href.endsWith('html/options.html')) {
        chrome.runtime.openOptionsPage()
        return window.close()
    } else if (
        anchor.href.startsWith('http') ||
        anchor.href.startsWith('chrome-extension')
    ) {
        url = anchor.href
    } else {
        url = chrome.runtime.getURL(anchor.href)
    }
    console.debug('url:', url)
    await chrome.tabs.create({ active: true, url })
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
            console.debug('popupPreview Enabled. Running initPopupMouseover...')
            initPopupMouseover()
        } else {
            console.debug('popupPreview Disabled. Removing Event Listeners...')
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
        authAlert.classList.add('d-none')
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

        const url = new URL(data[i].url)
        let rawURLCopy
        let rawURL
        if (data[i].raw) {
            rawURLCopy = new URL(data[i].raw)
            rawURL = new URL(data[i].raw)
        } else {
            const raw = url.origin + url.pathname.replace(/^\/u\//, '/raw/')
            rawURLCopy = new URL(raw)
            rawURL = new URL(raw)
            rawURL.searchParams.append('token', options.authToken)
        }
        if (url.searchParams.has('password')) {
            const password = url.searchParams.get('password')
            // console.debug('adding password to rawURLCopy:', password)
            rawURLCopy.searchParams.append('password', password)
        }
        rawURL.searchParams.append('view', 'gallery')

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
            'file-link',
            'mouse-link'
        )
        link.target = '_blank'
        link.dataset.name = data[i].name
        link.dataset.row = i.toString()
        link.dataset.thumb = data[i].thumb || rawURL.href

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

        if (options.popupIcons) {
            updateFileIcons(div, data[i])
        }
        // if (options.popupIcons) {
        //     if (data[i].private) {
        //         console.info('private')
        //         div.appendChild(faLock.cloneNode(true))
        //     }
        //     if (data[i].password) {
        //         console.info('password')
        //         div.appendChild(faKey.cloneNode(true))
        //     }
        // }

        const board = hoverboard.cloneNode(true)
        board.id = `menu-${i}`

        board.querySelector('.copy-link').dataset.clipboardText = data[i].url
        board.querySelector('.copy-raw').dataset.clipboardText = rawURLCopy.href

        div.appendChild(board)
        cell1.appendChild(div)

        // CTX Button -> 0
        // const button = document.createElement('a')
        // button.classList.add('link-body-emphasis', 'ctx-button')
        // button.setAttribute('role', 'button')
        // button.setAttribute('aria-expanded', 'false')
        // button.dataset.bsToggle = 'dropdown'
        // button.innerHTML = '<i class="fa-solid fa-bars"></i>'

        // const button = document.querySelector('div.d-none .ctx-button')
        const button = document.querySelector(`#row-${i} .ctx-button`)

        // CTX Drop Down -> Menu
        // const drop = document
        //     .querySelector('.d-none .dropdown-menu')
        //     .cloneNode(true)
        const drop = document
            .querySelector('.clone .dropdown-menu')
            .cloneNode(true)
        drop.id = `ctx-${i}`
        if (typeof data[i] === 'object') {
            updateContextMenu(drop, data[i]).then()
        }
        const fileName = drop.querySelector('li.mouse-link')
        fileName.innerText = data[i].name
        fileName.dataset.clipboardText = data[i].name
        fileName.dataset.thumb = data[i].thumb || rawURL.href
        drop.querySelector('.copy-link').dataset.clipboardText = data[i].url
        drop.querySelector('.copy-raw').dataset.clipboardText = rawURLCopy.href
        drop.querySelectorAll('.raw').forEach(
            (el) => (el.href = rawURLCopy.href)
        )
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

function updateFileIcons(el, file) {
    console.debug('updateFileIcons:', file)
    if (file.private) {
        console.info('private')
        // div.appendChild(faLock.cloneNode(true))
        el.querySelector('.fa-lock').classList.remove('d-none')
    }
    if (file.password) {
        console.info('password')
        // div.appendChild(faKey.cloneNode(true))
        el.querySelector('.fa-key').classList.remove('d-none')
    }
}

const hoverboard = document.getElementById('hover-menu')
let menuShown
/**
 * Like a Hover Board, but for links
 * @param {MouseEvent} event
 */
function hoverLinks(event) {
    // console.debug('hoverLinks:', event)
    // console.log('target:', event.target)
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
 * @return {Promise<void>}
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

function enableEl(ctx, selector, add = 'text-body-emphasis') {
    const el = ctx.querySelector(selector)
    el.classList.remove('text-body-tertiary')
    el.classList.add(add)
}

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
    let name
    if (typeof file === 'object') {
        name = file.name
    } else {
        name = fileLink.dataset.name
    }
    console.debug('name:', name)
    if (action === 'delete') {
        document.querySelector('#delete-modal .file-name').textContent = name
        const { options } = await chrome.storage.sync.get(['options'])
        if (options.deleteConfirm) {
            deleteModal.show()
        } else {
            await deleteConfirm(event)
        }
    } else if (action === 'expire') {
        expireInput.value = file.expr
        document.querySelector('#expire-modal .file-name').textContent = name
        expireModal.show()
    } else if (action === 'password') {
        passwordInput.value = file.password
        document.querySelector('#password-modal .file-name').textContent = name
        passwordModal.show()
    } else if (action === 'private') {
        await togglePrivate()
    }
}

async function togglePrivate() {
    console.debug('togglePrivate')
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
    console.debug('passwordForm:', event)
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
    console.debug('expireForm:', event)
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
    console.debug('deleteConfirm:', event)
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
 * Show Bootstrap Toast
 * @function showToast
 * @param {String} message
 * @param {String} type
 */
function showToast(message, type = 'success') {
    console.debug(`showToast: ${type}: ${message}`)
    const clone = document.querySelector('.d-none .toast')
    const container = document.getElementById('toast-container')
    if (clone && container) {
        const element = clone.cloneNode(true)
        element.querySelector('.toast-body').innerHTML = message
        element.classList.add(`text-bg-${type}`)
        container.appendChild(element)
        const toast = new bootstrap.Toast(element)
        element.addEventListener('mousemove', () => toast.hide())
        toast.show()
    } else {
        console.info('Missing clone or container:', clone, container)
    }
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
        mediaImage.src = event.target.dataset.thumb
        // console.debug('dataset.thumb', event.target.dataset.thumb)
        mediaOuter.classList.remove('d-none')
    } else {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
    }
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
