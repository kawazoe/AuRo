export function main () {
  window.$AuRo = {
    // selected device id
    /////////////////////
    deviceId: null,
    orphans: [],
    async getSelectedDeviceId () {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();

      const selectedDevice = devices.find(({ deviceId }) => deviceId === $AuRo.deviceId);

      if (selectedDevice) {
        return selectedDevice.deviceId;
      } else {
        auro.logging.warn('Requested output device was not found. It was probably disconnected. You might want to update your preferred device.');
        auro.logging.warn('Falling back to the default output device.');
        return '';
      }
    },
    async setSelectedDeviceId (deviceId) {
      $AuRo.deviceId = deviceId;

      await Promise.all(
        Array
          .from(document.querySelectorAll('audio,video'))
          .concat($AuRo.orphans)
          .map(el => $AuRo.setSinkId(el, deviceId))
      );
    },

    // Per browser setSinkId patch
    //////////////////////////////
    async setSinkId(el, deviceId) {
      auro.logging.log(`setSinkId(${deviceId})`, el);
      const isFirefox = !window.chrome?.app;
      if (isFirefox) {
        return $AuRo.setSinkId_Firefox(el, deviceId);
      } else {
        return $AuRo.setSinkId_Chrome(el, deviceId);
      }
    },
    async setSinkId_Firefox(el, deviceId) {
      // Firefox refuses to setSinkId when the media is NOT playing.
      if (el.paused) {
        auro.logging.log(`setSinkId_Firefox(${deviceId}) - paused`, el);
        return Promise.resolve()
          .then(() => el.$AuRo.play.call(el))
          .then(() => el.setSinkId(deviceId))
          .then(() => el.pause());
      } else {
        auro.logging.log(`setSinkId_Firefox(${deviceId}) - playing`, el);
        return Promise.resolve()
          .then(() => el.setSinkId(deviceId));
      }
    },
    async setSinkId_Chrome(el, deviceId) {
      // Chrome refuses to setSinkId when the media IS playing.
      if (el.paused) {
        auro.logging.log(`setSinkId_Chrome(${deviceId}) - paused`, el);
        return Promise.resolve()
          .then(() => el.setSinkId(deviceId));
      } else {
        auro.logging.log(`setSinkId_Chrome(${deviceId}) - playing`, el);
        return Promise.resolve()
          .then(() => el.pause(deviceId))
          .then(() => el.setSinkId(deviceId))
          .then(() => el.$AuRo.play.call(el));
      }
    },

    // Mokeypatching HTMLMediaElement
    /////////////////////////////////
    patch (element, name) {
      if (element.prototype.$AuRo) {
        auro.logging.log(`${name} is already patched. Skipping!`);
        return;
      }

      element.prototype.$AuRo = { play: element.prototype.play };

      element.prototype.play = async function () {
        auro.logging.log(`${name}.play()`, this);

        // Enables detection and sink updates for orphaned elements
        if (!this.parentNode && !$AuRo.orphans.includes(this)) {
          auro.logging.warn(`Detected orphan ${name}, being tracking...`);
          $AuRo.orphans.push(this);
        }

        const deviceId = await $AuRo.getSelectedDeviceId();

        return Promise.resolve()
          .then(() => $AuRo.setSinkId(this, deviceId))
          .then(() => this.$AuRo.play.call(this))
          .catch(e => auro.logging.error(`${name}.play() failed`, e));
      };
    }
  };

  $AuRo.patch(HTMLAudioElement, 'HTMLAudioElement');
  $AuRo.patch(HTMLVideoElement, 'HTMLVideoElement');

  auro.logging.log('Monkeypatched');
}

export function updateOutputDevice (deviceId) {
  if (typeof $AuRo !== 'undefined') {
    $AuRo.setSelectedDeviceId(deviceId)
      .catch(e => auro.logging.error(`updateOutputDevice(${deviceId}) failed`, e));
  }
}
