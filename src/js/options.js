// JS for options.html

import { showToast } from './exports.js'

chrome.storage.onChanged.addListener(onChanged)
document.addEventListener('DOMContentLoaded', initOptions)
document.getElementById('reloadAlbums').addEventListener('click', reloadAlbums)
document.getElementById('copy-support').addEventListener('click', copySupport)
document
    .querySelectorAll('#options-form input')
    .forEach((el) => el.addEventListener('change', saveOptions))
document
    .getElementById('options-form')
    .addEventListener('submit', (e) => e.preventDefault())
document
    .querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach((el) => new bootstrap.Tooltip(el))
document
    .querySelectorAll('[data-show-hide]')
    .forEach((el) => el.addEventListener('click', showHidePassword))
document
    .querySelectorAll('[data-copy-input]')
    .forEach((el) => el.addEventListener('click', copyInput))
document
    .getElementsByName('radioBackground')
    .forEach((el) => el.addEventListener('change', loginBackgroundChange))

const bgPictureInput = document.getElementById('bgPictureInput')
const bgVideoInput = document.getElementById('bgVideoInput')

/**
 * Initialize Options
 * @function initOptions
 */
async function initOptions() {
    console.debug('initOptions')

    document.getElementById('version').textContent =
        chrome.runtime.getManifest().version
    await setShortcuts('#keyboard-shortcuts')

    const { options } = await chrome.storage.sync.get(['options'])
    console.debug('options:', options)
    updateOptions(options)
    setBackground(options)
    updateBackgroundInput(options.radioBackground)
    if (!options?.siteUrl) {
        const siteUrl = document.getElementById('siteUrl')
        siteUrl.placeholder = 'https://example.com'
        siteUrl.focus()
    }

    const platform = await chrome.runtime.getPlatformInfo()
    if (platform.os === 'android') {
        document.querySelectorAll('.non-mobile').forEach((el) => {
            console.log('non-mobile el:', el)
            el.classList.add('d-none')
        })
    }
}

/**
 * Reload Albums Callback
 * @function reloadAlbums
 * @param {MouseEvent} event
 */
async function reloadAlbums(event) {
    event.preventDefault()
    console.debug('reloadAlbums:', event)
    const button = event.target.closest('button')
    const icon = event.target.closest('i') || event.target.querySelector('i')
    console.debug('button:', button)
    console.debug('icon:', icon)
    // button.classList.add('disabled')
    icon.classList.add('fa-spin')
    await chrome.runtime.sendMessage('createContextMenus')
    // button.classList.remove('disabled')
    icon.classList.remove('fa-spin')
    const albumsUpdated = $('#albumsUpdated')
    albumsUpdated.fadeToggle()
    setTimeout(() => albumsUpdated.fadeToggle(), 3000)
}

/**
 * Login Background Change Callback
 * @function loginBackgroundChange
 * @param {InputEvent} event
 */
function loginBackgroundChange(event) {
    console.debug('loginBackgroundChange:', event.target.id)
    updateBackgroundInput(event.target.id)
}

/**
 * Update Background Inputs
 * @function updateBackgroundInput
 * @param {Object} value
 */
function updateBackgroundInput(value) {
    if (value === 'bgPicture') {
        bgPictureInput.classList.remove('d-none')
        bgVideoInput.classList.add('d-none')
    } else if (value === 'bgVideo') {
        bgPictureInput.classList.add('d-none')
        bgVideoInput.classList.remove('d-none')
    } else {
        bgPictureInput.classList.add('d-none')
        bgVideoInput.classList.add('d-none')
    }
}

/**
 * Set Background
 * @function setBackground
 * @param {Object} options
 */
function setBackground(options) {
    console.debug('setBackground:', options)
    const video = document.querySelector('video')
    if (options.radioBackground === 'bgPicture') {
        const url = options.pictureURL || 'https://picsum.photos/1920/1080'
        document.body.style.background = `url('${url}') no-repeat center fixed`
        document.body.style.backgroundSize = 'cover'
        video.classList.add('d-none')
    } else if (options.radioBackground === 'bgVideo') {
        const src = options.videoURL || '/media/loop.mp4'
        video.classList.remove('d-none')
        video.src = src
        document.body.style.cssText = ''
    } else {
        document.body.style.cssText = ''
        video.classList.add('d-none')
    }
}

/**
 * On Changed Callback
 * @function onChanged
 * @param {Object} changes
 * @param {String} namespace
 */
function onChanged(changes, namespace) {
    // console.debug('onChanged:', changes, namespace)
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (namespace === 'sync' && key === 'options') {
            updateOptions(newValue)
            if (oldValue.radioBackground !== newValue.radioBackground) {
                setBackground(newValue)
            }
            if (
                oldValue.pictureURL !== newValue.pictureURL ||
                oldValue.videoURL !== newValue.videoURL
            ) {
                setBackground(newValue)
            }
        }
    }
}

/**
 * Save Options Callback
 * @function saveOptions
 * @param {FormDataEvent} event
 */
async function saveOptions(event) {
    console.debug('saveOptions:', event)
    console.debug('event.target:', event.target)
    console.debug('event.currentTarget:', event.currentTarget)
    const { options } = await chrome.storage.sync.get(['options'])
    let key = event.target.id
    let value
    if (event.target.type === 'checkbox') {
        value = event.target.checked
    } else if (event.target.id === 'siteUrl') {
        event.target.value = event.target.value.replace(/\/+$/, '')
        value = event.target.value
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
            value = number
        } else {
            event.target.value = options[event.target.id]
            // TODO: Add Error Handling
            // showToast(`Value ${number} Out of Range for ${event.target.id}`,'warning')
            return
        }
    } else if (event.target.type === 'radio') {
        key = event.target.name
        const radios = document.getElementsByName(key)
        for (const input of radios) {
            if (input.checked) {
                value = input.id
                break
            }
        }
    } else {
        value = event.target.value
    }
    if (value !== undefined) {
        options[key] = value
        console.info(`Set: ${key}:`, value)
        await chrome.storage.sync.set({ options })
    } else {
        console.warn('No Value for key:', key)
    }
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
            key = value // NOSONAR
            value = true // NOSONAR
        }
        // console.debug(`${key}: ${value}`)
        const el = document.getElementById(key)
        if (!el) {
            continue
        }
        if (el.tagName !== 'INPUT') {
            el.textContent = value.toString()
        } else if (['checkbox', 'radio'].includes(el.type)) {
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
    // console.debug('hideShowElement:', selector, show, speed)
    const element = $(`${selector}`)
    // console.debug('hideShowElement:', show, element)
    if (show) {
        element.show(speed)
    } else {
        element.hide(speed)
    }
}

/**
 * Set Keyboard Shortcuts
 * @function setShortcuts
 * @param {String} selector
 */
async function setShortcuts(selector = '#keyboard-shortcuts') {
    if (!chrome.commands) {
        return console.debug('Skipping: chrome.commands')
    }
    document.getElementById('table-wrapper').classList.remove('d-none')
    const table = document.querySelector(selector)
    const tbody = table.querySelector('tbody')
    const source = tbody.querySelector('tr.d-none').cloneNode(true)
    source.classList.remove('d-none')
    const commands = await chrome.commands.getAll()
    for (const command of commands) {
        // console.debug('command:', command)
        const row = source.cloneNode(true)
        // TODO: Chrome does not parse the description for _execute_action in manifest.json
        let description = command.description
        if (!description && command.name === '_execute_action') {
            description = 'Show Popup'
        }
        row.querySelector('.description').textContent = description
        row.querySelector('kbd').textContent = command.shortcut || 'Not Set'
        tbody.appendChild(row)
    }
}

function showHidePassword(event) {
    console.debug('showHidePassword:', event)
    const element = event.target.closest('button')
    const input = document.querySelector(element.dataset.showHide)
    if (input.type === 'password') {
        input.type = 'text'
    } else {
        input.type = 'password'
    }
}

async function copyInput(event) {
    console.debug('copyInput:', event)
    const element = event.target.closest('button')
    console.debug('element.dataset.copyInput:', element.dataset.copyInput)
    const input = document.querySelector(element.dataset.copyInput)
    console.debug('input:', input)
    if (!input.value) {
        showToast('No Data to Copy.', 'warning')
        return
    }
    await navigator.clipboard.writeText(input.value)
    if (element.dataset.copyText) {
        showToast(element.dataset.copyText)
    } else {
        showToast('Copied to Clipboard.')
    }
}

/**
 * Copy Support/Debugging Information
 * @function copySupport
 * @param {MouseEvent} event
 */
async function copySupport(event) {
    console.debug('copySupport:', event)
    event.preventDefault()
    const manifest = chrome.runtime.getManifest()
    const { options } = await chrome.storage.sync.get(['options'])
    delete options.siteUrl
    delete options.authToken
    const result = [
        `${manifest.name} - ${manifest.version}`,
        navigator.userAgent,
        `options: ${JSON.stringify(options)}`,
    ]
    await navigator.clipboard.writeText(result.join('\n'))
    showToast('Support Information Copied.')
}
