// JS for options.html

document.addEventListener('DOMContentLoaded', initOptions)

chrome.runtime.onMessage.addListener(onMessage)

document
    .querySelectorAll('input')
    .forEach((el) => el.addEventListener('change', saveOptions))
document
    .getElementById('options-form')
    .addEventListener('submit', (e) => e.preventDefault())
document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el)) // eslint-disable-line no-undef

/**
 * Options Init Function
 * @function initOptions
 */
async function initOptions() {
    // console.log('initOptions')
    document.getElementById('version').textContent =
        chrome.runtime.getManifest().version

    const { options } = await chrome.storage.sync.get(['options'])
    console.log('options:', options)
    updateOptions(options)
    if (!options?.siteUrl) {
        const siteUrl = document.getElementById('siteUrl')
        siteUrl.placeholder = 'https://example.com'
        siteUrl.focus()
    }

    const commands = await chrome.commands.getAll()
    document.getElementById('mainKey').textContent =
        commands.find((x) => x.name === '_execute_action').shortcut || 'Not Set'
}

/**
 * On Message Callback
 * @function onMessage
 * @param {Object} message
 */
async function onMessage(message) {
    // console.log('onMessage: message, sender:', message, sender)
    if (message === 'reload-options') {
        window.location.reload()
    }
}

/**
 * Save Options Callback
 * @function saveOptions
 * @param {FormDataEvent} event
 */
async function saveOptions(event) {
    // console.log('saveOptions:', event)
    const { options } = await chrome.storage.sync.get(['options'])
    if (event.target.type === 'checkbox') {
        options[event.target.id] = event.target.checked
    } else if (event.target.id === 'siteUrl') {
        event.target.value = event.target.value.replace(/\/+$/, '')
        options[event.target.id] = event.target.value
    } else if (event.target.id === 'recentFiles') {
        const number = parseInt(event.target.value)
        if (!isNaN(number) && number >= 0 && number <= 99) {
            event.target.value = number.toString()
            options[event.target.id] = event.target.value
        } else {
            event.target.value = options[event.target.id]
        }
    } else {
        options[event.target.id] = event.target.value
    }
    console.log(`Set: "${event.target.id}" to target:`, event.target)
    console.log('options:', options)
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
        const element = document.getElementById(key)
        if (element) {
            if (typeof value === 'boolean') {
                element.checked = value
            } else if (typeof value === 'string') {
                element.value = value
            }
        }
    }
}
