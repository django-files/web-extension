// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

document.querySelectorAll('[data-href]').forEach((el) => {
    el.addEventListener('click', popupLink)
})

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
 * Popup Init Function
 * TODO: Overhaul this function
 * @function initPopup
 */
async function initPopup() {
    console.log('initPopup')
    const { auth } = await chrome.storage.sync.get(['auth'])
    console.log('auth:', auth)
    if (!auth?.url || !auth?.token) {
        return displayError('Missing URL or Token.')
    }
    document.getElementById('django-files-links').style.display = 'flex'

    let headers = { Authorization: auth.token }
    let options = { method: 'GET', headers: headers, cache: 'no-cache' }
    let response
    let data
    try {
        response = await fetch(auth.url + '/api/recent/', options)
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

    let tbodyRef = document
        .getElementById('recent')
        .getElementsByTagName('tbody')[0]

    data.forEach(function (value, i) {
        let name = String(value.split('/').reverse()[0])

        let copyLink = document.createTextNode(i + 1)
        // let copyLink = document.createElement('a')
        // copyLink.text = 1 + i
        // copyLink.title = name
        // copyLink.href = value
        // copyLink.target = '_blank'

        let fileLink = document.createElement('a')
        fileLink.text = name
        fileLink.title = name
        fileLink.href = value
        fileLink.target = '_blank'

        let row = tbodyRef.insertRow()
        let cell1 = row.insertCell()
        cell1.appendChild(copyLink)
        let cell2 = row.insertCell()
        cell2.appendChild(fileLink)
    })
}

/**
 * Popup Action Init
 * @function displayError
 * @param {String} message
 */
function displayError(message) {
    let div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}
