// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

document
    .querySelectorAll('[data-href]')
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
    const missing = !options?.siteUrl || !options?.authToken
    if (missing || options?.checkAuth) {
        console.log('missing, checkAuth:', missing, options?.checkAuth)
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
        } catch (error) {
            console.log(error)
        }
        if (missing || !options) {
            authButton.classList.remove('btn-sm')
            authButton.classList.add('btn-lg', 'my-2')
            return displayAlert('Missing URL or Token.')
        }
    }

    // URL set in options, so show Django Files site link buttons
    document.getElementById('django-files-links').classList.remove('d-none')

    // If recent files disabled, do nothing
    if (options.recentFiles === '0') {
        console.log('Recent Files Disabled. Enable in Options.')
        return displayAlert('Recent Files are Disabled in Options.', 'success')
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
    } catch (error) {
        console.warn(error)
        return displayAlert(error.message, 'danger')
    }
    console.log(`response.status: ${response.status}`, response, data)

    // Check response data is valid and has files
    if (!response.ok) {
        console.warn(`error: ${data.error}`)
        return displayAlert(data.error, 'danger')
    } else if (data === undefined) {
        return displayAlert('Response Data Undefined.')
    } else if (!data.length) {
        return displayAlert('No Files Returned.')
    }

    // Hide loading display table, update table
    loadingSpinner.classList.add('d-none')
    document.getElementById('files-table').classList.remove('d-none')
    updateTable(data)

    // Re-init clipboardJS and popupLinks after updateTable
    new ClipboardJS('.clip') // eslint-disable-line
    document
        .querySelectorAll('[data-href]')
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
    let url
    if (anchor?.dataset?.location) {
        const { options } = await chrome.storage.sync.get(['options'])
        url = options?.siteUrl + anchor.dataset.location
    } else if (anchor.dataset.href.startsWith('http')) {
        url = anchor.dataset.href
    } else if (anchor.dataset.href === 'homepage') {
        url = chrome.runtime.getManifest().homepage_url
    } else if (anchor.dataset.href === 'options') {
        chrome.runtime.openOptionsPage()
        return window.close()
    } else if (anchor?.dataset?.href) {
        url = chrome.runtime.getURL(anchor.dataset.href)
    }
    console.log('url:', url)
    if (!url) {
        return console.warn('No dataset.href for anchor:', anchor)
    }
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
        if (options?.siteUrl !== message.siteUrl) {
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
        await chrome.runtime.sendMessage('reload-options')
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
        link.dataset.href = value
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
 */
function displayAlert(message, type = 'warning') {
    loadingSpinner.classList.add('d-none')
    errorAlert.innerHTML = message
    errorAlert.classList.add(`alert-${type}`)
    errorAlert.classList.remove('d-none')
}
