const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const siteUrl = process.env.DF_URL
const authToken = process.env.DF_TOKEN

let count = 1

async function screenshot(page, name) {
    if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots')
    }
    await page.screenshot({ path: `screenshots/${count}_${name}.png` })
    count++
}

;(async () => {
    const pathToExtension = path.join(process.cwd(), '../src')
    console.log('pathToExtension:', pathToExtension)
    const browser = await puppeteer.launch({
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
    let popupTarget = await browser.waitForTarget(
        (target) =>
            target.type() === 'page' && target.url().endsWith('popup.html')
    )
    let popupPage = await popupTarget.asPage()
    console.log('popupPage:', popupPage)
    // popupPage.on('console', (msg) => console.log('LOG: Popup:', msg.text()))
    await popupPage.waitForNetworkIdle()
    await screenshot(popupPage, 'popup')
    await popupPage.locator('[href="../html/options.html"]').click()

    // Options
    // await worker.evaluate('chrome.runtime.openOptionsPage();')
    const optionsTarget = await browser.waitForTarget(
        (target) =>
            target.type() === 'page' && target.url().endsWith('options.html')
    )
    const optionsPage = await optionsTarget.asPage()
    console.log('optionsPage:', optionsPage)
    // optionsPage.on('console', (msg) => console.log('LOG: Options:', msg.text()))
    // await optionsPage.setViewport({ width: 1920, height: 1080 })
    await optionsPage.waitForNetworkIdle()
    await screenshot(optionsPage, 'options')

    await optionsPage.locator('#siteUrl').fill(siteUrl)
    // await optionsPage.type('#siteUrl', siteUrl)
    await optionsPage.keyboard.press('Enter')
    await optionsPage.locator('#authToken').fill(authToken)
    // await optionsPage.type('#authToken', authToken)
    await optionsPage.keyboard.press('Enter')
    await optionsPage.locator('.show-hide').click()
    await screenshot(optionsPage, 'options')
    await optionsPage.close()
    // await optionsPage.close()

    // Popup
    await worker.evaluate('chrome.action.openPopup();')
    popupTarget = await browser.waitForTarget(
        (target) =>
            target.type() === 'page' && target.url().endsWith('popup.html')
    )
    popupPage = await popupTarget.asPage()
    console.log('popupPage:', popupPage)
    await popupPage.waitForNetworkIdle()
    await screenshot(popupPage, 'popup')

    await browser.close()
})()
