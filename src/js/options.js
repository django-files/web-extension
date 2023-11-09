// JS for options.html

import { createContextMenus } from './exports.js'

document.addEventListener('DOMContentLoaded', initOptions)

document.getElementById('options-form').addEventListener('submit', saveOptions)

/**
 * Options Init Function
 * @function initOptions
 */
async function initOptions() {
    console.log('initOptions')
    const { auth, options } = await chrome.storage.sync.get(['auth', 'options'])
    console.log(auth, options)
    const url_input = document.getElementById('url')
    if (auth?.url) {
        url_input.value = auth.url
    } else {
        url_input.placeholder = 'https://example.com'
        url_input.focus()
    }
    document.getElementById('token').value = auth?.token || ''
    document.getElementById('contextMenu').checked = options.contextMenu
    const commands = await chrome.commands.getAll()
    document.getElementById('mainKey').textContent =
        commands.find((x) => x.name === '_execute_action').shortcut || 'Not Set'
}

/**
 * Save Options Submit Callback
 * @function saveOptions
 * @param {SubmitEvent} event
 */
async function saveOptions(event) {
    console.log('saveOptions:', event)
    event.preventDefault()
    let auth = {
        url: document.getElementById('url').value.replace(/\/$/, ''),
        token: document.getElementById('token').value,
    }
    console.log('auth:', auth)
    let options = {}
    options.contextMenu = document.getElementById('contextMenu').checked
    if (options.contextMenu) {
        createContextMenus()
    } else {
        chrome.contextMenus.removeAll()
    }
    console.log('options:', options)
    await chrome.storage.sync.set({ auth, options })
    document.getElementById('url').value = auth.url
}
