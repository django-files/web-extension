const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const sourceDir = 'src'
const screenshotsDir = 'tests/screenshots'

const siteUrl = process.env.DF_URL
const authToken = process.env.DF_TOKEN
// const dfUser = process.env.DF_USER
// const dfPass = process.env.DF_PASS
// const dfSite = process.env.DF_SITE

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
    console.debug(`getPage: ${name}`, log, size)
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
        console.debug(`Adding Logger: ${name}`)
        page.on('console', (msg) =>
            console.log(`console: ${name}:`, msg.text())
        )
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
        dumpio: true,
        // headless: false,
        // slowMo: 150,
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

    // // DF -https://github.com/puppeteer/puppeteer/issues/2486
    // page = await browser.newPage()
    // await page.goto(dfSite)
    // await page.locator('#username').fill(dfUser)
    // await page.locator('#password').fill(dfPass)
    // await page.locator('#login-button').click()
    // await page.waitForSelector('#navbarDropdown', { visible: true })

    // Popup
    await worker.evaluate('chrome.action.openPopup();')
    page = await getPage('popup.html')
    console.log('page:', page)
    await page.waitForNetworkIdle()
    await screenshot('popup')

    await page.hover('tr')
    await page.locator('.ctx-button').click()
    await page.waitForNetworkIdle()
    await screenshot('popup')

    await page.locator('[data-action="private"]').click()
    await page.hover('tr')
    await page.waitForNetworkIdle()
    await screenshot('popup')

    await page.hover('tr')
    await page.locator('.ctx-button').click()
    await page.locator('[data-action="private"]').click()
    await page.hover('tr')
    await page.waitForNetworkIdle()
    await screenshot('popup')

    await browser.close()
})()
