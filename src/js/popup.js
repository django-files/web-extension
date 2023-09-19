// Popup JS

function displayError(message) {
    const div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}

function initPopup() {
    console.log('function: initPopup')
    console.log(chrome.storage.sync)
    jQuery('html').hide().fadeIn('slow')

    // const { url, token } = chrome.storage.sync.get(['url', 'token'])
    chrome.storage.sync.get(['url', 'token'], (items) => {
        console.log(`url: ${items.url}`)
        console.log(`token: ${items.token}`)
        if (!(items.url && items.token)) {
            return displayError('Missing URL or Token.')
        }

        const headers = { Authorization: items.token }
        const options = { method: 'GET', headers: headers, cache: 'no-cache' }
        // let response
        // let data
        // try {
        //     response = fetch(`${items.url}/api/recent/`, options)
        //     data = response.json()
        // } catch (error) {
        //     console.log(error)
        //     return displayError(error.message)
        // }
        fetch(`${items.url}/api/recent/`, options).then((response) => {
            console.log('Status: ' + response.status)
            console.log(response)
            // const data = response.json()
            // console.log(data)
            if (!response.ok) {
                console.log('error: ' + data['error'])
                return displayError(data['error'])
            }

            let tbodyRef = document
                .getElementById('recent')
                .getElementsByTagName('tbody')[0]

            response.json().then((data) => {
                console.log(data)
                if (data === undefined) {
                    return displayError('Response Data Undefined.')
                }
                if (data.length === 0) {
                    return displayError('No Files Returned.')
                }

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
            })
        })
    })
}

document.addEventListener('DOMContentLoaded', initPopup)
