// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)
chrome.runtime.onMessage.addListener(onMessage)
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
const mediaImage = document.getElementById('media-image')
const mediaOuter = document.getElementById('media-outer')
const alwaysAuth = document.getElementById('always-auth')

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
    if (options.popupPreview) {
        console.log('Enabling Mouseover Preview')
        timeout = options.popupTimeout * 1000
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
        copy.classList.add('clip')
        copy.dataset.clipboardText = value
        copy.innerHTML = '<i class="fa-regular fa-clipboard"></i>'
        copy.classList.add('link-body-emphasis')
        copy.onclick = clipClick
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
            'link-underline-opacity-75-hover'
        )
        link.target = '_blank'
        link.dataset.raw = url.origin + url.pathname.replace(/^\/u\//, '/raw/')
        const cell1 = row.cells[1]
        cell1.classList.add('text-break')
        cell1.innerHTML = ''
        cell1.appendChild(link)
    }
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
    mediaImage.addEventListener('error', (event) => {
        console.log('mediaError:', event)
        mediaImage.src = '../media/error.png'
    })
    document.querySelectorAll('.link-underline').forEach((el) => {
        el.addEventListener('mouseover', onMouseOver)
        el.addEventListener('mouseout', onMouseOut)
    })
}

function onMouseOver(event) {
    // console.log('onMouseOver:', event)
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
