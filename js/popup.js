// Popup JS

async function displayError(message) {
    let div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}

async function initPopup() {
    console.log('function: initPopup')
    jQuery('html').hide().fadeIn('slow')
    // let url = auth['url']
    // let token = auth['token']
    // const url = (await chrome.storage.local.get('url'))['url']
    // const token = (await chrome.storage.local.get('token'))['token']
    // console.log('url: ' + url)
    // console.log('token: ' + token)
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

    console.log(data)
    let tbodyRef = document
        .getElementById('recent')
        .getElementsByTagName('tbody')[0]
    for (let i in data) {
        let name = data[i].split('/').reverse()[0]
        let a = document.createElement('a')
        let linkText = document.createTextNode(name)
        a.appendChild(linkText)
        a.title = name
        a.href = data[i]
        a.target = '_blank'
        let newRow = tbodyRef.insertRow()
        let newCell = newRow.insertCell()
        let count = document.createTextNode(i + ' - ')
        newCell.appendChild(count)
        newCell.appendChild(a)
    }
}

document.addEventListener('DOMContentLoaded', initPopup)
