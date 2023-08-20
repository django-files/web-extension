// Options JS

async function initOptions() {
    console.log('function: initOptions')

    let auth = (await chrome.storage.local.get('auth'))['auth'] || {}
    console.log('auth.url: ' + auth['url'])
    console.log('auth.token: ' + auth['token'])
    let url_input = document.getElementById('url')
    let token_input = document.getElementById('token')
    if (auth['url']) {
        url_input.value = auth['url']
    } else {
        url_input.placeholder = 'https://example.com'
    }
    token_input.value = auth['token'] || ''
    // if (token) {
    //     token_input.value = token
    // }
}

async function saveOptions(event) {
    event.preventDefault()
    console.log('function: saveOptions')
    let auth = {
        url: document.getElementById('url').value.replace(/\/$/, ''),
        token: document.getElementById('token').value,
    }
    // let url = document.getElementById('url').value.replace(/\/$/, '')
    // let token = document.getElementById('token').value
    console.log('auth.url: ' + auth['url'])
    console.log('auth.token: ' + auth['token'])
    chrome.storage.local.set({
        ['auth']: auth,
    })

    // chrome.storage.local.set({
    //     ['url']: url,
    // })
    // chrome.storage.local.set({
    //     ['token']: token,
    // })

    let url_input = document.getElementById('url')
    url_input.value = auth['url']
}

document.addEventListener('DOMContentLoaded', initOptions)
document.querySelector('#submit').addEventListener('click', saveOptions)
