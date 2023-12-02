// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

document.querySelectorAll('[data-href]').forEach((el) => {
    el.addEventListener('click', popLinks)
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
    console.log('options.recentFiles:', options.recentFiles)
    if (options.recentFiles === '0') {
        document
            .getElementById('loading-spinner')
            .classList.add('visually-hidden')
        document
            .getElementById('recent-uploads')
            .classList.add('visually-hidden')
        return console.log('Recent Files Disabled. Enable in Options.')
    }

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

    document.getElementById('loading-spinner').classList.add('visually-hidden')

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
        el.addEventListener('click', popLinks)
    })
}

/**
 * Popup Links Click Callback
 * Firefox requires a call to window.close()
 * @function popLinks
 * @param {MouseEvent} event
 */
async function popLinks(event) {
    console.log('popLinks:', event)
    event.preventDefault()
    const anchor = event.target.closest('a')
    let url
    if (anchor?.dataset?.location) {
        const { auth } = await chrome.storage.sync.get(['auth'])
        url = auth?.url + anchor.dataset.location
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
    console.log('element:', element)
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
    let div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}
