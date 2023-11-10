// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

document.querySelectorAll('[data-href]').forEach((el) => {
    el.addEventListener('click', popupLink)
})

/**
 * Popup Init Function
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup() {
    console.log('initPopup')
    const { auth, options } = await chrome.storage.sync.get(['auth', 'options'])
    console.log('auth:', auth)
    if (!auth?.url || !auth?.token) {
        return displayError('Missing URL or Token.')
    }
    document.getElementById('django-files-links').style.display = 'flex'

    let opts = {
        method: 'GET',
        headers: { Authorization: auth.token },
        cache: 'no-cache',
    }
    let response
    let data
    try {
        const url = new URL(auth.url + '/api/recent/')
        url.searchParams.append('amount', options?.recentFiles || '10')
        response = await fetch(url, opts)
        data = await response.json()
    } catch (error) {
        console.warn(error)
        return displayError(error.message)
    }
    console.log(`response.status: ${response.status}`, response, data)

    if (!response.ok) {
        console.warn('error: ' + data['error'])
        return displayError(data['error'])
    }
    if (data === undefined) {
        return displayError('Response Data Undefined.')
    }
    if (data.length === 0) {
        return displayError('No Files Returned.')
    }

    updateTable(data)
    const clipboard = new ClipboardJS('.clip') // eslint-disable-line
    document.querySelectorAll('[data-href]').forEach((el) => {
        el.addEventListener('click', popupLink)
    })
}

/**
 * Popup Links Callback
 * because firefox needs us to call window.close() from the popup
 * @function popupLink
 * @param {MouseEvent} event
 */
async function popupLink(event) {
    console.log('popupLink:', event)
    const { auth } = await chrome.storage.sync.get(['auth'])
    let url
    if (event.target.dataset.location) {
        url = auth?.url + event.target.dataset.location
    } else if (event.target.dataset.href.startsWith('http')) {
        url = event.target.dataset.href
    } else {
        url = chrome.runtime.getURL(event.target.dataset.href)
    }
    console.log(`url: ${url}`)
    await chrome.tabs.create({ active: true, url })
    window.close()
}

/**
 * Update Popup Table with Data
 * @function updateTable
 * @param {Object} data
 */
function updateTable(data) {
    let tbodyRef = document
        .getElementById('recent')
        .getElementsByTagName('tbody')[0]

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
        copyBtn.innerHTML = '<i class="fa-regular fa-clipboard text-white"></i>'
        const cell3 = row.insertCell()
        cell3.appendChild(copyBtn)
    })
}

/**
 * Display Popup Error Message
 * @function displayError
 * @param {String} message
 */
function displayError(message) {
    let div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}
