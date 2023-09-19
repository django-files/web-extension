// Popup JS

function displayError(message) {
    const div = document.getElementById('error-alert')
    div.innerHTML = message
    div.style.display = 'block'
}

function initPopup() {
    console.log('function: initPopup')
    chrome.storage.sync.get(['url', 'token'], (items) => {
        console.log(`url: ${items.url}`)
        console.log(`token: ${items.token}`)
        if (!(items.url && items.token)) {
            return displayError('Missing URL or Token.')
        }

        const options = {
            method: 'GET',
            headers: { Authorization: items.token },
            cache: 'no-cache',
        }
        fetch(`${items.url}/api/recent/`, options).then((response) => {
            console.log('Status: ' + response.status)
            console.log(response)
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
