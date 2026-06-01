import { spawn } from "child_process";
import fs from "fs";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let browserPath = edgePath;
if (!fs.existsSync(browserPath)) {
  browserPath = chromePath;
}

console.log("Launching browser with remote debugging port...");
const browserProcess = spawn(browserPath, [
  "--headless=new",
  "--remote-debugging-port=9222",
  "--disable-gpu",
  "--window-size=375,812",
  "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  "http://localhost:8080/",
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
      const evalExpr = `(() => {
        const logoImg = document.querySelector('header img');
        const header = document.querySelector('header > div > div');
        const viewportWidth = window.innerWidth;
        
        return JSON.stringify({
          viewportWidth,
          logo: logoImg ? {
            rect: { x: logoImg.getBoundingClientRect().x, y: logoImg.getBoundingClientRect().y, width: logoImg.getBoundingClientRect().width, height: logoImg.getBoundingClientRect().height },
            src: logoImg.src,
            naturalWidth: logoImg.naturalWidth,
            naturalHeight: logoImg.naturalHeight
          } : null,
          header: header ? {
            rect: { x: header.getBoundingClientRect().x, y: header.getBoundingClientRect().y, width: header.getBoundingClientRect().width, height: header.getBoundingClientRect().height }
          } : null
        });
      })()`;

      ws.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: { expression: evalExpr, returnByValue: true },
        }),
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        console.log("\n--- CDP ELEMENT SIZES ---");
        console.log(JSON.stringify(JSON.parse(msg.result.result.value), null, 2));
        console.log("-------------------------\n");
        ws.close();
        browserProcess.kill();
      }
    };
  } catch (err) {
    console.error("Error:", err);
    browserProcess.kill();
  }
}, 3000);
