// JS auth.js

// eslint-disable-next-line no-extra-semi
;(async () => {
    await chrome.runtime.sendMessage(getCredentials())
})()

/**
 * Handle Messages
 * @function getCredentials
 * @return {Object}
 */
function getCredentials() {
    const siteUrl = document.getElementById('site-url')
    const authToken = document.getElementById('auth-token')
    if (siteUrl?.value && authToken?.value) {
        return {
            siteUrl: siteUrl.value,
            authToken: authToken.value,
        }
    }
}
