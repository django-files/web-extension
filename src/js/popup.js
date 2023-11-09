// JS for popup.html

document.addEventListener('DOMContentLoaded', initPopup)

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

    let headers = { Authorization: auth.token }
    let options = { method: 'GET', headers: headers, cache: 'no-cache' }
    let response
    let data
    try {
        response = await fetch(auth.url + '/api/recent/', options)
        data = await response.json()
    } catch (error) {
        console.log(error)
        return displayError(error.message)
    }
    console.log(`response.status: ${response.status}`)
    console.log(response, data)

    if (!response.ok) {
        console.log('error: ' + data['error'])
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
