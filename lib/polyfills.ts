// Basic URL polyfill
import "react-native-url-polyfill/auto";

// Minimal global process
if (!global.process) {
  global.process = {
    env: {},
    nextTick: (fn) => setTimeout(fn, 0),
    browser: true,
  };
}

// Mock EventEmitter (needed by Supabase auth)
if (!global.EventEmitter) {
  const EventEmitter = require("events");
  global.EventEmitter = EventEmitter;
}

// Completely disable WebSockets
global.WebSocket = class {
  constructor() {
    setTimeout(() => {
      if (this.onerror) {
        this.onerror(new Error("WebSockets are not supported"));
      }
      if (this.onclose) {
        this.onclose({ wasClean: false, code: 1006 });
      }
    }, 0);
  }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

// Minimal Buffer implementation for auth
global.Buffer = global.Buffer || require("buffer").Buffer;
