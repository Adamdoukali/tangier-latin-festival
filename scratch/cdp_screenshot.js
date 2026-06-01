import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let browserPath = edgePath;
if (!fs.existsSync(browserPath)) {
  browserPath = chromePath;
}

const targetUrl = process.argv[2] || "http://localhost:8080/";
const outputName = process.argv[3] || "screenshot-mobile-home.png";
const width = parseInt(process.argv[4]) || 375;
const height = parseInt(process.argv[5]) || 812;
const isMobile = width < 768;

const outputPath = path.resolve(
  "C:\\Users\\Claro\\.gemini\\antigravity-ide\\brain\\4e0cbdfd-e7f9-4a82-8556-4449e5c55666",
  outputName,
);

console.log(`CDP Screenshot: targeting ${targetUrl} (${width}x${height}, mobile: ${isMobile})...`);

const browserProcess = spawn(browserPath, [
  "--headless=new",
  "--remote-debugging-port=9222",
  "--disable-gpu",
  "--hide-scrollbars",
]);

setTimeout(async () => {
  try {
    const listRes = await fetch("http://localhost:9222/json/list");
    const list = await listRes.json();
    const page = list.find((t) => t.type === "page");
    if (!page) {
      console.error("No active page found!");
      browserProcess.kill();
      return;
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: "Page.navigate",
          params: { url: targetUrl },
        }),
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.id === 1) {
        console.log(`Setting device metrics override to ${width}x${height}...`);
        ws.send(
          JSON.stringify({
            id: 2,
            method: "Emulation.setDeviceMetricsOverride",
            params: {
              width,
              height,
              deviceScaleFactor: 2,
              mobile: isMobile,
            },
          }),
        );
      } else if (msg.id === 2) {
        console.log("Emulation configured. Waiting for hydration...");
        setTimeout(() => {
          console.log("Capturing screenshot...");
          ws.send(
            JSON.stringify({
              id: 3,
              method: "Page.captureScreenshot",
              params: {
                format: "png",
                quality: 100,
              },
            }),
          );
        }, 3000);
      } else if (msg.id === 3) {
        console.log("Screenshot data received!");
        const base64Data = msg.result.data;
        const buffer = Buffer.from(base64Data, "base64");

        fs.writeFileSync(outputPath, buffer);
        console.log(`SUCCESS! Screenshot saved to ${outputPath}`);
        console.log(`File size: ${buffer.length} bytes`);

        ws.close();
        browserProcess.kill();
      }
    };
  } catch (err) {
    console.error("Error during CDP screenshot:", err);
    browserProcess.kill();
  }
}, 3000);
