// JS for options.html

document.addEventListener('DOMContentLoaded', initOptions)
document.getElementById('options-form').addEventListener('submit', saveOptions)

/**
 * Options Init Function
 * @function initOptions
 */
async function initOptions() {
    console.log('initOptions')
    document.getElementById('version').textContent =
        chrome.runtime.getManifest().version
    const { auth, options } = await chrome.storage.sync.get(['auth', 'options'])
    console.log('auth, options:', auth, options)
    const url = document.getElementById('url')
    if (auth?.url) {
        url.value = auth.url
    } else {
        url.placeholder = 'https://example.com'
        url.focus()
    }
    document.getElementById('token').value = auth?.token || ''
    updateOptions(options)
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
    document.getElementById('url').value = auth.url
    const { options } = await chrome.storage.sync.get(['options'])
    options.recentFiles = document.getElementById('recentFiles').value
    options.contextMenu = document.getElementById('contextMenu').checked
    options.showUpdate = document.getElementById('showUpdate').checked
    console.log('options:', options)
    await chrome.storage.sync.set({ auth, options })
    showToast('Options Saved')
}

/**
 * Update Options
 * @function initOptions
 * @param {Object} options
 */
function updateOptions(options) {
    for (const [key, value] of Object.entries(options)) {
        // console.log(`${key}: ${value}`)
        const el = document.getElementById(key)
        if (el) {
            if (typeof value === 'boolean') {
                el.checked = value
            } else if (typeof value === 'string') {
                el.value = value
            }
        }
    }
}

/**
 * Show Bootstrap Toast
 * Requires: jQuery
 * @function showToast
 * @param {String} message
 * @param {String} bsClass
 */
function showToast(message, bsClass = 'success') {
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
