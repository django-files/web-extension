async function initOptions() {
    console.log('function: initOptions')

    let url = (await browser.storage.local.get('url'))['url']
    let token = (await browser.storage.local.get('token'))['token']

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

    browser.storage.local.set({
        ['url']: url,
    })
    browser.storage.local.set({
        ['token']: token,
    })

    let url_input = document.getElementById('url')
    url_input.value = url
}

document.addEventListener('DOMContentLoaded', initOptions)
document.querySelector('#submit').addEventListener('click', saveOptions)
