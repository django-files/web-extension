// JS auth.js

// eslint-disable-next-line no-extra-semi
;(async () => {
    console.log('auth.js')
    const response = await chrome.runtime.sendMessage(getCredentials())
    console.log(response)
})()

/**
 * Handle Messages
 * @function getCredentials
 * @return {Object}
 */
function getCredentials() {
    const siteUrl = document.getElementById('site-url')
    const authToken = document.getElementById('auth-token')
    if (siteUrl && authToken) {
        return {
            siteUrl: siteUrl.value,
            authToken: authToken.value,
        }
    }
}
