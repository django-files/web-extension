// JS auth.js

;(async () => {
    const credentials = getCredentials()
    if (credentials) {
        await chrome.runtime.sendMessage(credentials)
    }
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
