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
    document.getElementById('version').textContent =
        chrome.runtime.getManifest().version
    document.getElementById('token').value = auth?.token || ''
    document.getElementById('contextMenu').checked = options.contextMenu
    document.getElementById('showUpdate').checked = options.showUpdate
    const commands = await chrome.commands.getAll()
    document.getElementById('mainKey').textContent =
        commands.find((x) => x.name === '_execute_action').shortcut || 'Not Set'
    document.getElementById('recentFiles').value = options.recentFiles || '10'
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
    options.recentFiles = document.getElementById('recentFiles').value
    options.contextMenu = document.getElementById('contextMenu').checked
    options.showUpdate = document.getElementById('showUpdate').checked
    if (options.contextMenu) {
        chrome.contextMenus.removeAll()
        createContextMenus()
    } else {
        chrome.contextMenus.removeAll()
    }
    console.log('options:', options)
    await chrome.storage.sync.set({ auth, options })
    document.getElementById('url').value = auth.url
    showToast('Options Saved')
}

/**
 * Show Bootstrap Toast
 * Requires: jQuery
 * @function showToast
 * @param {String} message
 * @param {String} bsClass
 */
function showToast(message, bsClass = 'success') {
    // TODO: Remove jQuery Dependency
    const toastEl = $(
        '<div class="toast align-items-center border-0 my-3" role="alert" aria-live="assertive" aria-atomic="true">\n' +
            '    <div class="d-flex">\n' +
            '        <div class="toast-body">Options Saved</div>\n' +
            '        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>\n' +
            '    </div>\n' +
            '</div>'
    )
    toastEl.find('.toast-body').text(message)
    toastEl.addClass('text-bg-' + bsClass)
    $('#toast-container').append(toastEl)
    const toast = new bootstrap.Toast(toastEl) // eslint-disable-line
    toast.show()
}
