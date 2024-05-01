// JS for options.html

chrome.storage.onChanged.addListener(onChanged)
document.addEventListener('DOMContentLoaded', initOptions)
document
    .querySelectorAll('input')
    .forEach((el) => el.addEventListener('change', saveOptions))
document
    .getElementById('options-form')
    .addEventListener('submit', (e) => e.preventDefault())
document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el))

/**
 * Initialize Options
 * @function initOptions
 */
async function initOptions() {
    // console.debug('initOptions')
    document.getElementById('version').textContent =
        chrome.runtime.getManifest().version

    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)
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
 * On Changed Callback
 * @function onChanged
 * @param {Object} changes
 * @param {String} namespace
 */
function onChanged(changes, namespace) {
    // console.debug('onChanged:', changes, namespace)
    for (const [key, { newValue }] of Object.entries(changes)) {
        if (namespace === 'sync' && key === 'options') {
            console.debug('newValue:', newValue)
            updateOptions(newValue)
        }
    }
}

/**
 * Save Options Callback
 * @function saveOptions
 * @param {FormDataEvent} event
 */
async function saveOptions(event) {
    // console.debug('saveOptions:', event)
    const { options } = await chrome.storage.sync.get(['options'])
    if (event.target.type === 'checkbox') {
        options[event.target.id] = event.target.checked
    } else if (event.target.id === 'siteUrl') {
        event.target.value = event.target.value.replace(/\/+$/, '')
        options[event.target.id] = event.target.value
    } else if (event.target.type === 'number') {
        const number = parseInt(event.target.value, 10)
        let min = 0
        let max = 60
        if (event.target.id === 'recentFiles') {
            max = 99
        } else if (event.target.id === 'popupWidth') {
            min = 320
            max = 600
        }
        if (!isNaN(number) && number >= min && number <= max) {
            event.target.value = number.toString()
            options[event.target.id] = number
        } else {
            event.target.value = options[event.target.id]
            // TODO: Add Error Handling
            // showToast(`Value ${number} Out of Range for ${event.target.id}`,'warning')
        }
    } else {
        options[event.target.id] = event.target.value
    }
    console.info(`Set: "${event.target.id}" to target:`, event.target)
    console.debug('options:', options)
    await chrome.storage.sync.set({ options })
}

/**
 * Update Options based on type
 * @function initOptions
 * @param {Object} options
 */
function updateOptions(options) {
    console.debug('updateOptions:', options)
    for (let [key, value] of Object.entries(options)) {
        if (typeof value === 'undefined') {
            console.warn('Value undefined for key:', key)
            continue
        }
        if (key.startsWith('radio')) {
            key = value
            value = true
        }
        // console.debug(`${key}: ${value}`)
        const el = document.getElementById(key)
        if (!el) {
            continue
        }
        if (el.tagName !== 'INPUT') {
            el.textContent = value.toString()
        } else if (el.type === 'checkbox') {
            el.checked = value
        } else {
            el.value = value
        }
        if (el.dataset.related) {
            hideShowElement(`#${el.dataset.related}`, value)
        }
    }
}

function hideShowElement(selector, show, speed = 'fast') {
    const element = $(`${selector}`)
    // console.debug('hideShowElement:', show, element)
    if (show) {
        element.show(speed)
    } else {
        element.hide(speed)
    }
}
