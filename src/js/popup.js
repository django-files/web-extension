// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

document
    .querySelectorAll('a[href]')
    .forEach((el) => el.addEventListener('click', popupLinks))

chrome.runtime.onMessage.addListener(onMessage)

const loadingSpinner = document.getElementById('loading-spinner')
const errorAlert = document.getElementById('error-alert')
const authButton = document.getElementById('auth-button')

authButton.addEventListener('click', authCredentials)

/**
 * Popup Init Function
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup() {
    console.log('initPopup')
    const { options } = await chrome.storage.sync.get(['options'])
    console.log('options:', options)

    // If missing auth data or options.checkAuth check current site for auth
    if (!options?.siteUrl || !options?.authToken) {
        console.log('siteUrl, authToken:', options?.siteUrl, options?.authToken)
        authButton.classList.remove('btn-sm')
        authButton.classList.add('btn-lg', 'my-2')
        return displayAlert({ message: 'Missing URL or Token.', auth: true })
    }

    // URL set in options, so show Django Files site link buttons
    document
        .querySelectorAll('[data-location]')
        .forEach((el) => (el.href = options.siteUrl + el.dataset.location))
    document.getElementById('django-files-links').classList.remove('d-none')

    // If recent files disabled, do nothing
    if (options.recentFiles === '0') {
        return displayAlert({
            message: 'Recent Files Disabled in Options.',
            type: 'success',
        })
    }

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

    // Check auth if checkAuth is enabled in options
    if (options.checkAuth) {
        await checkSiteAuth()
    }

    // Hide loading display table, update table
    loadingSpinner.classList.add('d-none')
    document.getElementById('files-table').classList.remove('d-none')
    updateTable(data)

    // Re-init clipboardJS and popupLinks after updateTable
    new ClipboardJS('.clip')
    document
        .querySelectorAll('a[href]')
        .forEach((el) => el.addEventListener('click', popupLinks))
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
    let url
    if (anchor.href.endsWith('html/options.html')) {
        chrome.runtime.openOptionsPage()
        return window.close()
    } else if (anchor.href.startsWith('http')) {
        url = anchor.href
    } else {
        url = chrome.runtime.getURL(anchor.href)
    }
    console.log('url:', url)
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
            authButton.classList.remove('d-none')
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
        await initPopup()
        try {
            await chrome.runtime.sendMessage('reload-options')
        } catch (e) {} // eslint-disable-line no-empty
    } else {
        displayAlert({ message: 'Error Getting or Setting Credentials.' })
    }
}

/**
 * Update Popup Table with Data
 * @function updateTable
 * @param {Object} data
 */
function updateTable(data) {
    const tbody = document.querySelector('#files-table tbody')
    tbody.innerHTML = ''

    // console.log('data:', data)
    data.forEach(function (value) {
        const url = new URL(value)
        const name = url.pathname.replace(/^\/u\//, '')
        const row = tbody.insertRow()

        // const count = document.createTextNode(i + 1)
        // const cell1 = row.insertCell()
        // cell1.appendChild(count)

        const copy = document.createElement('a')
        copy.title = 'Copy'
        copy.setAttribute('role', 'button')
        copy.classList.add('clip')
        copy.dataset.clipboardText = value
        copy.innerHTML = '<i class="fa-regular fa-clipboard"></i>'
        copy.classList.add('link-body-emphasis')
        copy.onclick = clipClick
        const cell1 = row.insertCell()
        // cell1.classList.add('align-middle')
        cell1.appendChild(copy)

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
        const cell2 = row.insertCell()
        cell2.classList.add('text-break')
        cell2.appendChild(link)
    })
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
    loadingSpinner.classList.add('d-none')
    errorAlert.innerHTML = message
    errorAlert.classList.add(`alert-${type}`)
    errorAlert.classList.remove('d-none')
    if (auth) {
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
