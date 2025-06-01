import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Mock WebSocket before Supabase can try to use it
class MockWebSocket {
  // Declare static properties with type information
  static readonly CONNECTING: number = 0;
  static readonly OPEN: number = 1;
  static readonly CLOSING: number = 2;
  static readonly CLOSED: number = 3;

  constructor() {
    // Immediately trigger connection failure
    setTimeout(() => {
      if (this.onerror) this.onerror(new Event("error"));
      if (this.onclose)
        this.onclose({
          code: 1006,
          reason: "WebSockets disabled",
        } as CloseEvent);
    }, 0);
  }
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  set onopen(fn: (event: Event) => void) {}
  set onclose(fn: (event: CloseEvent) => void) {}
  set onerror(fn: (event: Event) => void) {}
  set onmessage(fn: (event: MessageEvent) => void) {}
}

// Assign to global
global.WebSocket = MockWebSocket as any;

// Replace with your Supabase URL and anon key
const supabaseUrl = "https://kibafauvmytcmsryythu.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYmFmYXV2bXl0Y21zcnl5dGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NzUyNzcsImV4cCI6MjA1OTA1MTI3N30.FmZGs1e6OPvLcHskFXfcfpoD5VJd5C62Ay4FUpRLhKM";

// Minimal client with only auth functionality
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Disable realtime completely
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
  // Intercept any fetch requests
  global: {
    fetch: (...args) => {
      const url = args[0]?.toString() || "";
      // Block any realtime requests
      if (url.includes("/realtime")) {
        return Promise.resolve(new Response("{}", { status: 200 }));
      }
      return fetch(...args);
    },
  },
});

// Completely replace the realtime implementation
Object.defineProperty(supabase, "realtime", {
  value: {
    connect: () => {},
    disconnect: () => {},
    on: () => ({ subscription: null }),
    removeChannel: () => {},
    removeAllChannels: () => {},
    setAuth: () => {},
    getToken: () => null,
    presence: {
      onSync: () => {},
      track: () => {},
      untrack: () => {},
    },
    channel: () => ({
      subscribe: () => ({
        receive: () => ({}),
      }),
      on: () => ({}),
      unsubscribe: () => {},
    }),
    channels: [],
  },
  writable: false,
  configurable: false,
});
