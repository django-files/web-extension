// Options JS

async function initOptions() {
    console.log('function: initOptions')

    let url = (await chrome.storage.local.get('url'))['url']
    let token = (await chrome.storage.local.get('token'))['token']

    console.log('url: ' + url)
    console.log('token: ' + token)

    let url_input = document.getElementById('url')
    let token_input = document.getElementById('token')

    if (url) {
        url_input.value = url
    } else {
        url_input.placeholder = 'https://example.com'
    }
    if (token) {
        token_input.value = token
    }
}

async function saveOptions(event) {
    event.preventDefault()
    console.log('function: saveOptions')

    let url = document.getElementById('url').value.replace(/\/$/, '')
    let token = document.getElementById('token').value

    console.log('url: ' + url)
    console.log('token: ' + token)

    chrome.storage.local.set({
        ['url']: url,
    })
    chrome.storage.local.set({
        ['token']: token,
    })

    let url_input = document.getElementById('url')
    url_input.value = url
}

document.addEventListener('DOMContentLoaded', initOptions)
document.querySelector('#submit').addEventListener('click', saveOptions)
