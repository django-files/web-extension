[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/abpbiefojfkekhkjnpakpekkpeibnjej?logo=google&logoColor=white&label=google%20users)](https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/django-files?logo=mozilla&label=mozilla%20users)](https://addons.mozilla.org/addon/django-files)
[![Manifest Version](https://img.shields.io/github/manifest-json/v/django-files/web-extension?filename=manifest.json&logo=json&label=manifest)](https://github.com/django-files/web-extension/blob/master/manifest.json)
[![GitHub Release Version](https://img.shields.io/github/v/release/django-files/web-extension?logo=github)](https://github.com/django-files/web-extension/releases/latest)
[![Mozilla Add-on Version](https://img.shields.io/amo/v/django-files?label=firefox&logo=firefox)](https://addons.mozilla.org/addon/django-files)
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/abpbiefojfkekhkjnpakpekkpeibnjej?label=chrome&logo=googlechrome)](https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Build](https://github.com/django-files/web-extension/actions/workflows/build.yaml/badge.svg)](https://github.com/django-files/web-extension/actions/workflows/build.yaml)
[![Test](https://github.com/django-files/web-extension/actions/workflows/test.yaml/badge.svg)](https://github.com/django-files/web-extension/actions/workflows/test.yaml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/7842944ada6b4c7ebb4f9dc83ed6a654)](https://app.codacy.com/gh/django-files/web-extension/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
# Django Files Web Extension

[Chrome](https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej) and 
[Firefox](https://addons.mozilla.org/addon/django-files) web extension for 
[Django Files](https://github.com/django-files/django-files) to view recent uploads, shorten URLs, 
and upload any Image, Video or Audio files with right click.

## Table of Contents

*   [Install](#install)
*   [Features](#features)
*   [Configure](#configure)
*   [Known Building](#building)
*   [Development](#development)

# Install

*   [Google Chrome Web Store](https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
*   [Mozilla Firefox Add-ons](https://addons.mozilla.org/addon/django-files)

<a href="https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej">
    <img src="https://raw.githubusercontent.com/raivo-otp/issuer-icons/master/vectors/google.com/google-chrome.svg" width="48" height="48" /></a>
<a href="https://addons.mozilla.org/addon/django-files">
    <img src="https://raw.githubusercontent.com/raivo-otp/issuer-icons/master/vectors/firefox.com/firefox.svg" width="48" height="48" /></a>
<a href="https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej">
    <img src="https://raw.githubusercontent.com/raivo-otp/issuer-icons/master/vectors/microsoft.com/microsoft-edge.svg" width="48" height="48" /></a>
<a href="https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej">
    <img src="https://raw.githubusercontent.com/raivo-otp/issuer-icons/master/vectors/opera.com/opera.svg" width="48" height="48" /></a>
<a href="https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej">
    <img src="https://raw.githubusercontent.com/raivo-otp/issuer-icons/master/vectors/brave.com/brave.svg" width="48" height="48" /></a>
<a href="https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej">
    <img src="https://raw.githubusercontent.com/raivo-otp/issuer-icons/master/vectors/vivaldi.com/vivaldi.svg" width="48" height="48" /></a>
  
All Chromium Based Browsers can install the extension from the
[Chrome Web Store](https://chrome.google.com/webstore/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej).

## Features

*   View Recent Uploads on Popup
*   Right Click to Upload any Image, Video, or Audio
*   Right Click to Shorten any URL

## Configure

You can pin the Addon by clicking the `Puzzle Piece`, find the `Django Files icon`, then;  
**Firefox**, click the `Settings Wheel` and `Pin to Toolbar`.  
**Chrome**, click the `Pin` icon.

1.  Click on the `Django Files icon` and click on `Open Options`.
1.  Log in to your Django Files instance, and select `Copy URL` from the menu in the top right.
1.  Go back to the Django Files Options tab and paste the `URL` into the URL box.
1.  Repeat #3 and #4 for Auth Token and then click `Save Settings`!

The addon should now be configured to work with your Django Files instance.

Click the Django Files add-on icon to view your recent uploads.  
Right-click on any Image, Video, Audio, or URL upload to Django Files or Shorten URL.

# Development

**Quick Start**

To run chrome or firefox with web-ext.
```shell
npm isntall
npm run chrome
npm run firefox
```

To Load Unpacked/Temporary Add-on make a `manifest.json` with.
```shell
npm run manifest:chrome
npm run manifest:firefox
```

For more information on web-ext, [read this documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/).  
To pass additional arguments to an `npm run` command, use `--`.  
Example: `npm run chrome -- --chromium-binary=...`

## Building

Install the requirements and copy libraries into the `src/dist` directory by running `npm install`.
See [gulpfile.js](gulpfile.js) for more information on postinstall.
```shell
npm install
```

To load unpacked or temporary addon from the [src](src) folder, you must generate the `src/manifest.json` for the desired browser.
```shell
npm run manifest:chrome
npm run manifest:firefox
```

If you would like to create a `.zip` archive of the [src](src) directory for the desired browser.
```shell
npm run build
npm run build:chrome
npm run build:firefox
```

For more information on building, see the scripts in the [package.json](package.json) file.

## Chrome Setup

1.  Build or Download a [Release](https://github.com/django-files/web-extension/releases).
1.  Unzip the archive, place the folder where it must remain and note its location for later.
1.  Open Chrome, click the `3 dots` in the top right, click `Extensions`, click `Manage Extensions`.
1.  In the top right, click `Developer Mode` then on the top left click `Load unpacked`.
1.  Navigate to the folder you extracted in step #3 then click `Select Folder`.

## Firefox Setup

Note: Firefox Temporary addon's will **not** remain after restarting Firefox, therefore;
it is very useful to keep addon storage after uninstall/restart with `keepStorageOnUninstall`.

1.  Build or Download a [Release](https://github.com/django-files/web-extension/releases).
1.  Unzip the archive, place the folder where it must remain and note its location for later.
1.  Go to `about:debugging#/runtime/this-firefox` and click `Load Temporary Add-on...`
1.  Navigate to the folder you extracted earlier, select `manifest.json` then click `Select File`.
1.  Open `about:config` search for `extensions.webextensions.keepStorageOnUninstall` and set to `true`.

> **Note**
>
> This method **does not** work on Release Firefox and is NOT recommended for development.
> You must use [ESR](https://www.mozilla.org/en-CA/firefox/all/#product-desktop-esr), Development, or Nightly.

1.  Open `about:config` search for `xpinstall.signatures.required` and set to `false`.
1.  Open `about:addons` and drag the zip file to the page or choose Install from File from the Settings wheel.
