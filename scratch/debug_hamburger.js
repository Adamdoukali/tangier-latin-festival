import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let browserPath = edgePath;
if (!fs.existsSync(browserPath)) {
  browserPath = chromePath;
}

console.log("Using browser path:", browserPath);

// Start edge headless and dump console logs with our evaluation script
const evalScript = `
  setTimeout(() => {
    const btn = document.querySelector('button[aria-label="Toggle mobile menu"]');
    if (!btn) {
      console.log("BUTTON_NOT_FOUND");
      return;
    }
    const btnRect = btn.getBoundingClientRect();
    const btnStyle = window.getComputedStyle(btn);
    const parent = btn.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const parentStyle = window.getComputedStyle(parent);
    const svg = btn.querySelector('svg');
    const svgStyle = svg ? window.getComputedStyle(svg) : {};
    
    console.log("BUTTON_EVAL:" + JSON.stringify({
      button: {
        rect: btnRect,
        display: btnStyle.display,
        visibility: btnStyle.visibility,
        opacity: btnStyle.opacity,
        zIndex: btnStyle.zIndex,
        color: btnStyle.color,
        backgroundColor: btnStyle.backgroundColor,
        border: btnStyle.border
      },
      parent: {
        rect: parentRect,
        display: parentStyle.display,
        visibility: parentStyle.visibility,
        opacity: parentStyle.opacity
      },
      svg: {
        display: svgStyle.display,
        stroke: svgStyle.stroke,
        color: svgStyle.color
      }
    }));
  }, 2000);
`;

// Write the eval script to a temp HTML file so we can load it or run it via CDP
// Actually, Chrome headless allows executing JS via --evaluate, but --evaluate runs instantly.
// Since we want to wait for React to hydrate, let's write a small wrapper page or run it via a debug port.
// Wait! Let's launch Edge with a debug port:
// --remote-debugging-port=9222
// And then write a node script that connects to it, navigates to http://localhost:8080/, evaluates the script, and prints the result!
// This is 100% robust and standard! Let's do that!
// We can use the 'ws' or built-in 'http' module to query CDP.
