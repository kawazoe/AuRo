import 'webextension-polyfill'

import {log} from "./logging.js";
import {getFrameDepth} from "./dom.js";

function toPromise(cb) {
  return Promise.resolve().then(cb);
}

function makeEvent (kind, tabs) {
  function sendInner (sender, payload) {
    const uuid = crypto.randomUUID();
    const resultPromise = new Promise((resolve, reject) => {
      log('waiting for response for', kind, uuid);
      browser.runtime.onMessage.addListener(function responseListener (message) {
        if (message.uuid !== uuid) {
          return;
        }

        log('got response for', kind, uuid, 'with success', message.success);
        browser.runtime.onMessage.removeListener(responseListener);

        if (message.success) {
          resolve(message.payload);
        } else {
          reject(new Error(message.error));
        }
      });
    });

    log('sending message', kind, uuid, payload);
    sender({ kind, uuid, payload });

    return resultPromise;
  }

  function sendTabs (tabId, message) {
    return sendInner((p) => browser.tabs.sendMessage(tabId, p), message);
  }
  function sendRuntime (message) {
    return sendInner((p) => browser.runtime.sendMessage(p), message);
  }
  const send = tabs ? sendTabs : sendRuntime;

  send.on = function onMessage (callback) {
    log('listening to', kind, 'on', tabs ?? 'serviceWorker');
    browser.runtime.onMessage.addListener(function mainListener (message, sender) {
      if (message.kind !== kind) {
        return;
      }

      if (tabs && tabs.rootFrame && getFrameDepth() !== 0) {
        return;
      }

      const tabId = sender.tab?.id;

      log('on message', kind, message.uuid, message.payload, sender);
      const sendResponse = tabId == null
        ? (m) => {
          log('replying to message', kind, message.uuid, 'with', m);
          browser.runtime.sendMessage(m);
        }
        : (m) => {
          log('replying to message', kind, message.uuid, 'with', m);
          browser.tabs.sendMessage(tabId, m);
        };

      toPromise(() => callback(message.payload, sender))
        .then(
          payload => sendResponse({ kind, uuid: message.uuid, success: true, payload }),
          error => sendResponse({ kind, uuid: message.uuid, success: false, error })
        );
    });
  }

  // HACK: This is a to-spec implementation of the eventing system. We can't use it because Firefox doesn't support
  // re-entrant messages properly and resolve the promise returned from sendMessage instantly in those cases. As a
  // result, we simulate the entire response channel instead. Use this version once Firefox behaves correctly.
  //
  // send.on = function onMessage (callback) {
  //   log('listening to', kind, 'on', tabs);
  //   browser.runtime.onMessage
  //     .addListener((message, sender, sendResponse) => {
  //       if (message.kind !== kind) {
  //         return;
  //       }
  //
  //       if (tabs && tabs.rootFrame && getFrameDepth() !== 0) {
  //         return;
  //       }
  //
  //       log('on message', message, sender);
  //       return toPromise(() => callback(message, sender))
  //         .then((v) => {
  //           log('replying to message', message, 'with', v);
  //           return v;
  //         }, (e) => {
  //           error('message', message, 'failed with', e);
  //           throw e;
  //         });
  //     });
  // }

  return send;
}

export const extension = {
  getTargets: makeEvent('auro:getTargets'),
  restoreLastOutputDevice: makeEvent('auro:restoreLastOutputDevice'),
  setTheme: makeEvent('auro:setTheme'),
  setTabOutputDevice: makeEvent('auro:setTabOutputDevice'),
  upgradeTabOutputDeviceToHost: makeEvent('auro:upgradeTabOutputDeviceToHost'),
};

export const tabs = {
  setInitialized: makeEvent('auro:setInitialized', true),
  getInitialized: makeEvent('auro:getInitialized', true),
  getMediaState: makeEvent('auro:getMediaState', { rootFrame: true }),
};
