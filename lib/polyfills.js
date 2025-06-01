// Import all required polyfills
import "react-native-polyfill-globals/auto";
import "react-native-url-polyfill/auto";
import EventEmitter from "events";
import {
  ReadableStream,
  WritableStream,
  TransformStream,
} from "web-streams-polyfill/ponyfill";

// Set up global polyfills
if (typeof global !== "undefined") {
  // Event polyfill
  global.EventEmitter = EventEmitter;

  // Use a proper Event implementation with required methods and properties
  if (!global.Event) {
    class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.bubbles = !!options.bubbles;
        this.cancelable = !!options.cancelable;
        this.composed = !!options.composed;
        this.timeStamp = Date.now();
        this.defaultPrevented = false;
        this.currentTarget = null;
        this.target = null;
      }

      preventDefault() {
        if (this.cancelable) {
          this.defaultPrevented = true;
        }
      }

      stopPropagation() {}
      stopImmediatePropagation() {}
    }

    // Add static properties
    CustomEvent.NONE = 0;
    CustomEvent.CAPTURING_PHASE = 1;
    CustomEvent.AT_TARGET = 2;
    CustomEvent.BUBBLING_PHASE = 3;

    global.Event = CustomEvent;
  }

  // Streams API polyfills
  if (!global.ReadableStream) {
    global.ReadableStream = ReadableStream;
    global.WritableStream = WritableStream;
    global.TransformStream = TransformStream;
  }
}
