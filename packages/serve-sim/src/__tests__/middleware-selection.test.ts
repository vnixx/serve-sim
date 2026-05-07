import { describe, expect, test } from "bun:test";
import {
  browserReachableState,
  deviceFromPreviewPath,
  selectServeSimState,
  type ServeSimState,
} from "../middleware";

const states: ServeSimState[] = [
  {
    pid: 101,
    port: 3100,
    device: "DEVICE-A",
    url: "http://127.0.0.1:3100",
    streamUrl: "http://127.0.0.1:3100/stream.mjpeg",
    wsUrl: "ws://127.0.0.1:3100/ws",
  },
  {
    pid: 102,
    port: 3101,
    device: "DEVICE-B",
    url: "http://127.0.0.1:3101",
    streamUrl: "http://127.0.0.1:3101/stream.mjpeg",
    wsUrl: "ws://127.0.0.1:3101/ws",
  },
];

describe("selectServeSimState", () => {
  test("keeps existing first-state behavior when no device is requested", () => {
    expect(selectServeSimState(states)?.device).toBe("DEVICE-A");
  });

  test("selects the requested device state", () => {
    expect(selectServeSimState(states, "DEVICE-B")?.device).toBe("DEVICE-B");
  });

  test("returns null when the requested device is not running", () => {
    expect(selectServeSimState(states, "DEVICE-C")).toBeNull();
  });
});

describe("deviceFromPreviewPath", () => {
  test("extracts a device from root-mounted preview paths", () => {
    expect(deviceFromPreviewPath("/device/DEVICE-A", "")).toBe("DEVICE-A");
    expect(deviceFromPreviewPath("/devices/DEVICE-B", "")).toBe("DEVICE-B");
  });

  test("extracts a device from nested preview paths", () => {
    expect(deviceFromPreviewPath("/.sim/device/DEVICE-A", "/.sim")).toBe("DEVICE-A");
  });

  test("ignores unrelated paths", () => {
    expect(deviceFromPreviewPath("/api", "")).toBeNull();
    expect(deviceFromPreviewPath("/other/device/DEVICE-A", "/.sim")).toBeNull();
  });

  test("ignores malformed encoded device paths", () => {
    expect(deviceFromPreviewPath("/device/%", "")).toBeNull();
  });
});

describe("browserReachableState", () => {
  test("rewrites helper URLs to the browser-visible hostname", () => {
    const state = browserReachableState(states[0]!, {
      headers: { host: "192.168.1.20:3200" },
      socket: {},
    });

    expect(state.url).toBe("http://192.168.1.20:3100");
    expect(state.streamUrl).toBe("http://192.168.1.20:3100/stream.mjpeg");
    expect(state.wsUrl).toBe("ws://192.168.1.20:3100/ws");
  });

  test("uses secure protocols when the preview request is HTTPS", () => {
    const state = browserReachableState(states[1]!, {
      headers: { host: "sim.example.com", "x-forwarded-proto": "https" },
      socket: {},
    });

    expect(state.url).toBe("https://sim.example.com:3101");
    expect(state.wsUrl).toBe("wss://sim.example.com:3101/ws");
  });
});
