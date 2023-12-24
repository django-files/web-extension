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
    console.log('initPopup')

    // Get options
    const { options } = await chrome.storage.sync.get(['options'])
    console.log('options:', options)

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
    console.log(`response.status: ${response.status}`, response, data)

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
    updateTable(data)

    // Re-init clipboardJS and popupLinks after updateTable
    new ClipboardJS('.clip')
    document
        .querySelectorAll('a[href]')
        .forEach((el) => el.addEventListener('click', popupLinks))

    // Enable Popup Mouseover Preview if popupPreview
    timeout = options.popupTimeout * 1000
    if (options.popupPreview) {
        console.log('Enabling Mouseover Preview')
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
    console.log('popupLinks:', event)
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
        console.log(`url: ${message.siteUrl}`)
        console.log(`token: ${message.authToken}`)
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
            console.log('New Authentication Found.')
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
    console.log(`Set: "${event.target.id}" to target:`, event.target)
    console.log('options:', options)
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
    console.log('authCredentials:', event)
    const { auth } = await chrome.storage.local.get(['auth'])
    console.log('auth:', auth)
    if (auth?.authToken && auth?.siteUrl) {
        const { options } = await chrome.storage.sync.get(['options'])
        options.authToken = auth.authToken
        options.siteUrl = auth.siteUrl
        await chrome.storage.sync.set({ options })
        console.log('Auth Credentials Updated...')
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
    console.log('genLoadingData:', rows)
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
 */
function updateTable(data) {
    console.log('updateTable:', data)
    const tbody = filesTable.querySelector('tbody')
    const length = tbody.rows.length
    // console.log(`data.length: ${data.length}`)
    // console.log(`tbody.rows.length: ${tbody.rows.length}`)
    for (let i = 0; i < length; i++) {
        // console.log(`i: ${i}`)
        let row = tbody.rows[i]
        if (!row) {
            row = tbody.insertRow()
        }
        if (data.length === i) {
            console.log('End of data. Removing remaining rows...')
            const rowsToRemove = length - i
            for (let j = 0; j < rowsToRemove; j++) {
                tbody.deleteRow(tbody.rows.length - 1)
            }
            break
        }
        const value = data[i]
        // TODO: This should not happen because of above condition
        if (!value) {
            console.warn(`No Data Value at Index: ${i}`, row)
            continue
        }
        // TODO: This throws an error if value is not valid URL
        const url = new URL(value)
        const name = url.pathname.replace(/^\/u\//, '')

        const copy = document.createElement('a')
        copy.title = 'Copy'
        copy.setAttribute('role', 'button')
        copy.classList.add('link-body-emphasis', 'clip')
        copy.innerHTML = '<i class="fa-regular fa-clipboard"></i>'
        copy.dataset.clipboardText = value
        copy.addEventListener('click', clipClick)
        const cell0 = row.cells[0]
        cell0.classList.add('align-middle')
        cell0.style.width = '20px'
        cell0.innerHTML = ''
        cell0.appendChild(copy)

        const link = document.createElement('a')
        link.text = name
        link.title = name
        link.href = value
        link.setAttribute('role', 'button')
        link.classList.add(
            'link-underline',
            'link-underline-opacity-0',
            'link-underline-opacity-75-hover',
            'file-link'
        )
        link.target = '_blank'
        link.dataset.name = name
        link.dataset.raw =
            url.origin +
            url.pathname.replace(/^\/u\//, '/raw/') +
            '?view=gallery'
        const cell1 = row.cells[1]
        cell1.classList.add('text-break')
        cell1.innerHTML = ''
        cell1.appendChild(link)

        const del = document.createElement('a')
        del.title = 'Delete'
        del.setAttribute('role', 'button')
        del.classList.add('link-danger')
        del.innerHTML = '<i class="fa-regular fa-trash-can"></i>'
        del.addEventListener('click', deleteClick)
        const cell2 = row.cells[2]
        cell2.classList.add('align-middle')
        cell2.style.width = '20px'
        cell2.innerHTML = ''
        cell2.appendChild(del)
    }
}

/**
 * Delete Click Callback
 * @function deleteClick
 * @param {MouseEvent} event
 */
async function deleteClick(event) {
    console.log('deleteClick:', event)
    const closest = event.target?.closest('tr')?.querySelector('.file-link')
    const name = closest.dataset?.name
    console.log('name:', name)
    if (!name) {
        return console.error('No name for: event, closest', event, closest)
    }
    deleteName.textContent = name
    const { options } = await chrome.storage.sync.get(['options'])
    if (options.deleteConfirm) {
        deleteModal.show()
    } else {
        await deleteConfirm(event)
    }
}

/**
 * Confirm Delete Click Callback
 * @function deleteConfirm
 * @param {MouseEvent} event
 */
async function deleteConfirm(event) {
    console.log('deleteConfirm:', event)
    const name = deleteName.textContent
    console.log(`Deleting File: ${name}`)
    // TODO: Catch Error? Throw should happen during init...
    const response = await deleteFile(name)
    console.log('response:', response)
    if (response.ok) {
        mediaOuter.classList.add('d-none')
        deleteModal.hide()
        await initPopup()
    } else {
        console.error(`Error Deleting File: "${name}", response:`, response)
        showToast(`Error Deleting: <strong>${name}</strong>`, 'danger')
        deleteModal.hide()
    }
}

/**
 * Post URL to endpoint
 * @function deleteFile
 * @param {String} name
 * @return {Response}
 */
async function deleteFile(name) {
    console.log(`deleteFile: ${name}`)
    const { options } = await chrome.storage.sync.get(['options'])
    // console.log('options:', options)
    const headers = { Authorization: options.authToken }
    const opts = {
        method: 'DELETE',
        headers: headers,
    }
    const apiUrl = `${options.siteUrl}/api/delete/${name}`
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
    toast.show()
    const callback = () => {
        element.addEventListener('mouseover', () => toast.hide())
    }
    setTimeout(callback, 1000)
}

/**
 * Clipboard Click Callback
 * @function clipClick
 * @param {MouseEvent} event
 */
function clipClick(event) {
    console.log('clipClick:', event)
    const element = event.target.closest('a')
    // console.log('element:', element)
    element.classList.add('link-success')
    element.classList.remove('link-body-emphasis')
    setTimeout(() => {
        element.classList.add('link-body-emphasis')
        element.classList.remove('link-success')
    }, 500)
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
    try {
        const [tab] = await chrome.tabs.query({
            currentWindow: true,
            active: true,
        })
        console.log('tab:', tab)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['/js/auth.js'],
        })
    } catch (e) {} // eslint-disable-line no-empty
}

function initPopupMouseover() {
    console.log('initPopupMouseover')
    mediaOuter.addEventListener('mouseover', () => {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
        if (timeoutID) {
            clearTimeout(timeoutID)
        }
    })
    mediaImage.addEventListener('error', () => {
        // console.log('mediaError:', event)
        mediaImage.classList.add('d-none')
        mediaError.classList.remove('d-none')
        mediaImage.src = '../media/loading.gif'
    })
    document.querySelectorAll('.file-link').forEach((el) => {
        el.addEventListener('mouseover', onMouseOver)
        el.addEventListener('mouseout', onMouseOut)
    })
}

function onMouseOver(event) {
    // console.log('onMouseOver:', event)
    mediaError.classList.add('d-none')
    mediaImage.classList.remove('d-none')
    if (event.pageY < window.innerHeight / 2) {
        mediaOuter.classList.remove('top-0')
        mediaOuter.classList.add('bottom-0')
    } else {
        mediaOuter.classList.remove('bottom-0')
        mediaOuter.classList.add('top-0')
    }
    // console.log('name:', event.target.innerText)
    // console.log('raw:', event.target.dataset.raw)
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
    timeoutID = setTimeout(function () {
        mediaOuter.classList.add('d-none')
        mediaImage.src = loadingImage
        timeoutID = undefined
    }, timeout)
}
