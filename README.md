[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/abpbiefojfkekhkjnpakpekkpeibnjej?logo=google&logoColor=white&label=google%20users)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/django-files?logo=mozilla&label=mozilla%20users)](https://addons.mozilla.org/addon/django-files)
[![Manifest Version](https://img.shields.io/github/manifest-json/v/django-files/web-extension?filename=manifest.json&logo=json&label=manifest)](https://github.com/django-files/web-extension/blob/master/manifest.json)
[![GitHub Release Version](https://img.shields.io/github/v/release/django-files/web-extension?logo=github)](https://github.com/django-files/web-extension/releases/latest)
[![Mozilla Add-on Version](https://img.shields.io/amo/v/django-files?label=firefox&logo=firefox)](https://addons.mozilla.org/addon/django-files)
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/abpbiefojfkekhkjnpakpekkpeibnjej?label=chrome&logo=googlechrome)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Build](https://github.com/django-files/web-extension/actions/workflows/build.yaml/badge.svg)](https://github.com/django-files/web-extension/actions/workflows/build.yaml)
[![Test](https://github.com/django-files/web-extension/actions/workflows/test.yaml/badge.svg)](https://github.com/django-files/web-extension/actions/workflows/test.yaml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/7842944ada6b4c7ebb4f9dc83ed6a654)](https://app.codacy.com/gh/django-files/web-extension/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
# Django Files Web Extension

[Chrome](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej) and 
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

*   [Google Chrome Web Store](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
*   [Mozilla Firefox Add-ons](https://addons.mozilla.org/addon/django-files)

[![Chrome](https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_48x48.png)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Firefox](https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_48x48.png)](https://addons.mozilla.org/addon/django-files)
[![Edge](https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge_48x48.png)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Chromium](https://raw.githubusercontent.com/alrra/browser-logos/main/src/chromium/chromium_48x48.png)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Brave](https://raw.githubusercontent.com/alrra/browser-logos/main/src/brave/brave_48x48.png)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Vivaldi](https://raw.githubusercontent.com/alrra/browser-logos/main/src/vivaldi/vivaldi_48x48.png)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)
[![Opera](https://raw.githubusercontent.com/alrra/browser-logos/main/src/opera/opera_48x48.png)](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej)

All Chromium Based Browsers can install the extension from the
[Chrome Web Store](https://chromewebstore.google.com/detail/django-files/abpbiefojfkekhkjnpakpekkpeibnjej).

## Features

*   View Recent Uploads on Popup
*   Right Click to Upload any Image, Video, or Audio
*   Right Click to Shorten any URL

## Configure

You can pin the Addon by clicking the `Puzzle Piece`, find the `Django Files icon`, then;  
**Firefox**, click the `Settings Wheel` and `Pin to Toolbar`.  
**Chrome**, click the `Pin` icon.

To automatically configure the web extension to work with your Django Files instance do the following:

-   Log in to your Django Files Instance
-   Click the Popup Icon (from above)
-   Click `Add Auth from Current Site`

The addon should now be configured to work with your Django Files instance.

You can now click the Django Files icon to view your recent uploads.  
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
