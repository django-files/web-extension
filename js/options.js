
async function init_options() {
    console.log("function: init_options");

    let url = (await chrome.storage.local.get('url'))['url'];
    let token = (await chrome.storage.local.get('token'))['token'];

    console.log('url: ' + url);
    console.log('token: ' + token);

    let url_input = document.getElementById('url');
    let token_input = document.getElementById('token');

    if (url) {
        url_input.value = url;
    } else {
        url_input.placeholder = 'https://example.com';
    }
    if (token) {
        token_input.value = token;
    }
}

async function save_options(event) {
    event.preventDefault();
    console.log("function: save_options");

    let url = document.getElementById('url').value.replace(/\/$/, '');
    let token = document.getElementById('token').value;

    console.log('url: ' + url);
    console.log('token: ' + token);

    chrome.storage.local.set({['url']: url});
    chrome.storage.local.set({['token']: token});

    let url_input = document.getElementById('url');
    url_input.value = url;
}

document.addEventListener('DOMContentLoaded', init_options);
document.querySelector('#submit').addEventListener('click', save_options);
