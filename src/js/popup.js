// Popup JS

async function displayError(message) {
    let div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}

async function initPopup() {
    console.log('function: initPopup')
    jQuery('html').hide().fadeIn('slow')

    let auth = (await chrome.storage.local.get('auth'))['auth'] || {}
    console.log('auth.url: ' + auth['url'])
    console.log('auth.token: ' + auth['token'])
    if (!auth['url'] || !auth['token']) {
        return await displayError('No URL or Token.')
    }

    let headers = { Authorization: auth['token'] }
    let options = { method: 'GET', headers: headers, cache: 'no-cache' }
    let response
    let data
    try {
        response = await fetch(auth['url'] + '/api/recent/', options)
        data = await response.json()
    } catch (error) {
        console.log(error)
        return await displayError(error.message)
    }
    console.log('Status: ' + response.status)
    console.log(response)
    console.log(data)

    if (!response.ok) {
        console.log('error: ' + data['error'])
        return await displayError(data['error'])
    }
    if (data === undefined) {
        return await displayError('Response Data Undefined.')
    }
    if (data.length === 0) {
        return await displayError('No Files Returned.')
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

document.addEventListener('DOMContentLoaded', initPopup)
