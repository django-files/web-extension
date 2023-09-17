// Options JS

async function initOptions() {
    console.log('initOptions')
    const { url, token } = await chrome.storage.local.get(['url', 'token'])
    console.log(`url: ${url}`)
    console.log(`token: ${token}`)
    document.getElementById('url').value = url || ''
    document.getElementById('token').value = token || ''
}

async function saveOptions(event) {
    event.preventDefault()
    console.log('saveOptions')
    let urlInput = document.getElementById('url')
    let tokenInput = document.getElementById('token')
    let url = urlInput.value.replace(/\/$/, '')
    let token = tokenInput.value
    console.log(`url: ${url}`)
    console.log(`token: ${token}`)
    await chrome.storage.local.set({ url: url, token: token })
    urlInput.value = url
}

document.addEventListener('DOMContentLoaded', initOptions)
document.querySelector('#submit').addEventListener('click', saveOptions)
