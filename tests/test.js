const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const sourceDir = 'src'
const screenshotsDir = 'tests/screenshots'

const siteUrl = process.env.DF_URL
const authToken = process.env.DF_TOKEN
// const dfUser = process.env.DF_USER
// const dfPass = process.env.DF_PASS

if (!siteUrl || !authToken) {
    throw new Error('Missing siteUrl or authToken Environment!')
}

/** @type {import('puppeteer').Browser}*/
let browser
/** @type {import('puppeteer').Page}*/
let page

let count = 1

/**
 * @function screenshot
 * @param {String} name
 * @return {Promise<void>}
 */
async function screenshot(name) {
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir)
    }
    await page.screenshot({ path: `${screenshotsDir}/${count}_${name}.png` })
    count++
}

/**
 * @function getPage
 * @param {String} name
 * @param {Boolean=} log
 * @param {String=} size
 * @return {import('puppeteer').Page}
 */
async function getPage(name, log, size) {
    const target = await browser.waitForTarget(
        (target) => target.type() === 'page' && target.url().endsWith(name)
    )
    page = await target.asPage()
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' },
    ])
    if (size) {
        const [width, height] = size.split('x').map((x) => parseInt(x))
        await page.setViewport({ width, height })
    }
    if (log) {
        page.on('console', (msg) => console.log(`${name}:`, msg.text()))
    }
    return page
}

;(async () => {
    const pathToExtension = path.join(process.cwd(), sourceDir)
    console.log('pathToExtension:', pathToExtension)
    browser = await puppeteer.launch({
        args: [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
        ],
        // headless: false,
        // slowMo: 100,
        // dumpio: true,
    })
    console.log('browser:', browser)

    // Get Service Worker
    const workerTarget = await browser.waitForTarget(
        (target) =>
            target.type() === 'service_worker' &&
            target.url().endsWith('service-worker.js')
    )
    const worker = await workerTarget.worker()
    console.log('worker:', worker)

    // Popup
    await worker.evaluate('chrome.action.openPopup();')
    page = await getPage('popup.html')
    console.log('page:', page)
    await page.waitForNetworkIdle()
    await screenshot('popup')
    await page.locator('[href="../html/options.html"]').click()

    // Options
    // await worker.evaluate('chrome.runtime.openOptionsPage();')
    page = await getPage('options.html', false, '1080x1080')
    console.log('page:', page)
    // await page.setViewport({ width: 1920, height: 1080 })
    await page.waitForNetworkIdle()
    await screenshot('options')

    await page.locator('#siteUrl').fill(siteUrl)
    await page.keyboard.press('Enter')
    await page.locator('#authToken').fill(authToken)
    // await page.type('#authToken', authToken)
    await page.keyboard.press('Enter')
    // await page.locator('.show-hide').click()
    await screenshot('options')
    await page.close()

    // Popup
    await worker.evaluate('chrome.action.openPopup();')
    page = await getPage('popup.html')
    await page.emulateMediaFeatures([
        { name: 'prefers-color-scheme', value: 'dark' },
    ])
    console.log('page:', page)
    await page.waitForNetworkIdle()
    await screenshot('popup')

    await browser.close()
})()
