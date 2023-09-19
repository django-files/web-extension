// Options JS

function initOptions() {
    console.log('initOptions')
    console.log(chrome.storage.sync)
    console.log(chrome.storage.sync.get('url'))
    // const { url, token } = await chrome.storage.sync.get(['url', 'token'])
    chrome.storage.sync.get(['url', 'token'], (items) => {
        console.log(`url: ${items.url}`)
        console.log(`token: ${items.token}`)
        document.getElementById('url').value = items.url || ''
        document.getElementById('token').value = items.token || ''
    })
}

function saveOptions(event) {
    event.preventDefault()
    console.log('saveOptions')
    let urlInput = document.getElementById('url')
    let tokenInput = document.getElementById('token')
    let url = urlInput.value.replace(/\/$/, '')
    let token = tokenInput.value
    console.log(`url: ${url}`)
    console.log(`token: ${token}`)
    chrome.storage.sync.set({ url: url, token: token })
    urlInput.value = url
    chrome.runtime.sendMessage({ connect: true })
}

document.addEventListener('DOMContentLoaded', initOptions)
document.querySelector('#submit').addEventListener('click', saveOptions)
