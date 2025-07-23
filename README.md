# AuRo
A *Browser Extension* to pick an audio output device for HTML5 audio and video elements.

Works with Chrome and Firefox, as well as their forks.

## How it works
The extension patches HTML5 audio and video .play() method and manipulates the `sinkId` in order to switch to the desired audio output device.
To not add unnecessary overhead on every page, it avoids loading any script until the extension is given permission.
By default, changes are not persisted. It can save your selection for the current domain.

It does not current work with AudioContext since setSinkId() has not be implemented for it yet.

**Note** that the API requires a successful call to `getUserMedia()` for every site with audio sinks that
need to be manipulated.

## Build
To get a production build, you can run:

```shell
npm run build
```

To get a development build, you can run:

```shell
nom run build -- --profile=verbose
```

You can also use `watch` instead to setup the necessary machinery to
automatically reload the extension whenever a change is made in the code.

No matter the type of build you pick, you will have to load either the appropriate `dist` folder or `zip` file as an unpacked extension in your browser.

## Links
[Chrome Store (source fork)](https://chrome.google.com/webstore/detail/auro-audio-output-device/hglnindfakmbhhkldompfjeknfapaceh)
[GitHub](https://github.com/kawazoe/AuRo)
