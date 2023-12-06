// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

document
    .querySelectorAll('[data-href]')
    .forEach((el) => el.addEventListener('click', popupLinks))

chrome.runtime.onMessage.addListener(onMessage)

/**
 * Popup Init Function
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup() {
    console.log('initPopup')
    const { options } = await chrome.storage.sync.get(['options'])
    console.log('options:', options)

    const missing = !options?.siteUrl || !options?.authToken
    console.log('missing:', missing)
    if (options.checkAuth || missing) {
        if (missing) {
            displayError('Missing URL or Token.')
        }
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
            console.warn(error)
        }
        if (missing) {
            return
        }
        const authBtn = document.getElementById('auth-button')
        authBtn.classList.remove('btn-lg', 'my-2')
        authBtn.classList.add('btn-sm')
    }

    document
        .getElementById('django-files-links')
        .classList.remove('visually-hidden')

    if (options.recentFiles === '0') {
        return console.log('Recent Files Disabled. Enable in Options.')
    }

    document
        .getElementById('loading-spinner')
        .classList.remove('visually-hidden')

    const opts = {
        method: 'GET',
        headers: { Authorization: options.authToken },
        cache: 'no-cache',
    }
    let response
    let data
    try {
        const url = new URL(`${options.siteUrl}/api/recent/`)
        url.searchParams.append('amount', options?.recentFiles || '10')
        response = await fetch(url, opts)
        data = await response.json()
    } catch (error) {
        console.warn(error)
        return displayError(error.message)
    }
    console.log(`response.status: ${response.status}`, response, data)

    document.getElementById('loading-spinner').classList.add('visually-hidden')

    if (!response.ok) {
        console.warn(`error: ${data['error']}`)
        return displayError(data['error'])
    }
    if (data === undefined) {
        return displayError('Response Data Undefined.')
    }
    if (data.length === 0) {
        return displayError('No Files Returned.')
    }

    updateTable(data)
    document.getElementById('recent').classList.remove('visually-hidden')

    const clipboard = new ClipboardJS('.clip') // eslint-disable-line
    // Re-Initialize data-href after updateTable
    document.querySelectorAll('[data-href]').forEach((el) => {
        el.addEventListener('click', popupLinks)
    })
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
        return console.error('No dataset.href for anchor:', anchor)
    }
    await chrome.tabs.create({ active: true, url })
    return window.close()
}

/**
 * On Command Callback
 * @function onMessage
 * @param {Object} message
 * @param {MessageSender} sender
 */
async function onMessage(message, sender) {
    // console.log('onMessage: message, sender:', message, sender)
    if (message?.siteUrl && message?.authToken) {
        console.log(`url: ${message.siteUrl}`)
        console.log(`token: ${message.authToken}`)
        const auth = { siteUrl: message.siteUrl, authToken: message.authToken }
        await chrome.storage.local.set({ auth })
        const btn = document.getElementById('auth-button')
        btn.classList.remove('visually-hidden')
        btn.addEventListener('click', authCredentials)
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
    if (auth) {
        const { options } = await chrome.storage.sync.get(['options'])
        options.authToken = auth.authToken
        options.siteUrl = auth.siteUrl
        await chrome.storage.sync.set({ options })
        console.warn('Auth Credentials Updated...')
        document.getElementById('auth-button').classList.add('visually-hidden')
        document.getElementById('error-alert').classList.add('visually-hidden')
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
    const tbodyRef = document
        .getElementById('recent')
        .getElementsByTagName('tbody')[0]
    tbodyRef.innerHTML = ''

    data.forEach(function (value, i) {
        const name = String(value.split('/').reverse()[0])
        const row = tbodyRef.insertRow()

        const copyLink = document.createTextNode(i + 1)
        const cell1 = row.insertCell()
        cell1.appendChild(copyLink)

        const fileLink = document.createElement('a')
        fileLink.text = name
        fileLink.title = name
        fileLink.dataset.href = value
        fileLink.setAttribute('role', 'button')
        fileLink.classList.add(
            'link-underline',
            'link-underline-opacity-0',
            'link-underline-opacity-75-hover'
        )
        fileLink.target = '_blank'
        const cell2 = row.insertCell()
        cell2.appendChild(fileLink)

        const copyBtn = document.createElement('a')
        copyBtn.title = 'Copy'
        copyBtn.setAttribute('role', 'button')
        copyBtn.classList.add('clip')
        copyBtn.dataset.clipboardText = value
        copyBtn.innerHTML = '<i class="fa-regular fa-clipboard"></i>'
        copyBtn.classList.add('link-body-emphasis')
        copyBtn.onclick = clipClick
        const cell3 = row.insertCell()
        cell3.appendChild(copyBtn)
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
 * @function displayError
 * @param {String} message
 */
function displayError(message) {
    document.getElementById('loading-spinner').classList.add('visually-hidden')
    const element = document.getElementById('error-alert')
    element.innerHTML = message
    element.classList.remove('visually-hidden')
}
