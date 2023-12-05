// JS check-site.js

;(async () => {
    console.log('check-site.js')
    const siteUrl = document.getElementById('site-url')
    const authToken = document.getElementById('auth-token')
    if (siteUrl && authToken) {
        const message = {
            action: 'auth',
            siteUrl: siteUrl.value,
            authToken: authToken.value,
        }
        const response = await chrome.runtime.sendMessage(message)
        // do something with response here, not outside the function
        console.log(response)
    }
})()
