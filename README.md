[![Codacy Badge](https://app.codacy.com/project/badge/Grade/7842944ada6b4c7ebb4f9dc83ed6a654)](https://app.codacy.com/gh/django-files/web-extension/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Test](https://github.com/django-files/web-extension/actions/workflows/test.yaml/badge.svg)](https://github.com/django-files/web-extension/actions/workflows/test.yaml)
[![Mozilla Add-on Version](https://img.shields.io/amo/v/django-files?logo=firefox)](https://addons.mozilla.org/addon/django-files/)
# Django Files Web Extension

Upload Files Directly from Google Chrome or Firefox Web Browser to [Django Files](https://github.com/django-files/django-files)

*   Firefox: https://addons.mozilla.org/addon/django-files/
*   Chrome: _Coming Soon._ See:[Chrome Install](#chrome-install)

_Work in Progress_

## Table of Contents

*   [Features](#features)
*   [Chrome Install](#chrome-install)
*   [Firefox Install](#firefox-install)
*   [Configure](#configure)
*   [Known Issues](#known-issues)

## Features

-   View Recent Uploads on Popup
-   Right Click to Upload any Image, Video, or Audio
-   Right Click to Shorten any URL

## Chrome Install

1.  Download the latest release: [chrome.zip](https://github.com/django-files/web-extension/releases/latest/download/chrome.zip)
1.  Unzip the archive, place the folder where it must remain and note its location for later.
1.  Open Chrome, click the `3 dots` in the top right, click `Extensions`, click `Manage Extensions`.
1.  In the top right, click `Developer Mode` then on the top left click `Load unpacked`.
1.  Navigate to the folder you extracted in step #3 then click `Select Folder`.

The addon should now be installed and running in Chrome. 

## Firefox Install

Retail users must use: https://addons.mozilla.org/addon/django-files/

This **does not** work on Release Firefox! You must use [ESR](https://www.mozilla.org/en-CA/firefox/all/#product-desktop-esr) (recommended), Development, or Nightly.

1.  Download the latest release: [firefox.zip](https://github.com/django-files/web-extension/releases/latest/download/firefox.zip)
1.  Open `about:config` search for `xpinstall.signatures.required` and set to `false`.
1.  Open `about:addons` and drag the zip file to the page or choose Install from File from the Settings Wheel.

The addon should now be installed and running in Firefox.

## Configure

1.  Click the `Puzzle Piece` in the top right corner, find `Django Files` and click the `Pin` icon.
1.  Click on the `Django Files icon` and click on `Open Options`.
1.  Log in to your Django Files instance, and select `Copy URL` from the menu in the top right.
1.  Go back to the Django Files Options tab and paste the `URL` into the URL box.
1.  Repeat #3 and #4 for Auth Token and then click `Save Settings`!

The addon should now be configured to work with your Django Files instance.

Click the Django Files add-on icon to view your recetn uploads.  
Right-click on any Image, Video, Audio, or URL upload to Django Files or Shorten URL.  

## Known Issues

### Chrome

-   After uploading a file or creating a short url, the url is not always copied to the clipboard.

### Firefox

-   Notifications are not showing up after you upload a file or create a short url.
-   A green dot appears on popup icon on page loads that says `Permission needed` on mouseover.
