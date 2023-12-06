// JS for options.html

document.addEventListener('DOMContentLoaded', initOptions)
// document.getElementById('options-form').addEventListener('submit', saveOptions)

document
    .getElementById('options-form')
    .addEventListener('submit', (e) => e.preventDefault())
document
    .querySelectorAll('input')
    .forEach((el) => el.addEventListener('change', saveOptions))
// document
//     .querySelectorAll('input[type="text"],input[type="password"],input[type="number"]')
//     .forEach((el) => el.addEventListener('change', saveOptions))

/**
 * Options Init Function
 * @function initOptions
 */
async function initOptions() {
    console.log('initOptions')
    document.getElementById('version').textContent =
        chrome.runtime.getManifest().version
    const { options } = await chrome.storage.sync.get(['options'])
    console.log('options:', options)
    const url = document.getElementById('siteUrl')
    if (options?.authToken) {
        url.value = options.siteUrl
    } else {
        url.placeholder = 'https://example.com'
        url.focus()
    }
    document.getElementById('authToken').value = options?.authToken || ''
    updateOptions(options)
    const commands = await chrome.commands.getAll()
    document.getElementById('mainKey').textContent =
        commands.find((x) => x.name === '_execute_action').shortcut || 'Not Set'
}

/**
 * Save Options Callback
 * @function saveOptions
 * @param {FormDataEvent} event
 */
async function saveOptions(event) {
    console.log('saveOptions:', event)
    if (event.type === 'submit') {
        return event.preventDefault()
    }
    let { options } = await chrome.storage.sync.get(['options'])
    if (event.target.type === 'checkbox') {
        options[event.target.id] = event.target.checked
    } else if (event.target.id === 'siteUrl') {
        event.target.value = event.target.value.replace(/\/+$/, '')
        options[event.target.id] = event.target.value
    } else {
        options[event.target.id] = event.target.value
    }
    console.log(`Set: "${event.target.id}" to target:`, event.target)
    await chrome.storage.sync.set({ options })
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
