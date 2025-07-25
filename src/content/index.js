import {auro} from '../lib';

if (auro.dom.getFrameDepth() === 0) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  auro.events.extension.setTheme({ isDark });
}

function filterValidDeviceTargets (targets, devices) {
  const isValid = (v) => devices.find(({ deviceId }) => deviceId === v);
  return Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, isValid(v) ? v : null]));
}

let isInitialized = false;
auro.events.tabs.setInitialized.on(() => {
  isInitialized = true
});
auro.events.tabs.getInitialized.on(() => isInitialized);

/**
 * Used by the popup to get the current list of devices and targets.
 */
auro.events.tabs.getMediaState.on(async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    // Fails when the user denies media permissions.
    auro.logging.log('failed to getUserMedia', e);
    return { devices: [] };
  }

  const mediaDeviceInfos = await navigator.mediaDevices.enumerateDevices();
  const devices = mediaDeviceInfos
    .filter(({ kind }) => kind === 'audiooutput')
    // Serialize results for IPC
    .map(d => d.toJSON())
    // HACK: Firefox doesn't include the default device, so we remove it if it's there and regenerate it ourselves
    .filter(({ deviceId }) => deviceId !== 'default')
    .concat([{
      deviceId: 'default',
      groupId: 'default',
      kind: 'audiooutput',
      label: 'Default'
    }]);

  devices.sort((l, r) => l.label < r.label ? -1 : l.label > r.label ? 1 : 0);

  const targets = filterValidDeviceTargets(await auro.events.extension.getTargets(), devices);
  return { devices, targets };
});

auro.events.extension.restoreLastOutputDevice();
