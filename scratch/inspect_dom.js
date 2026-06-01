import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Use edge or chrome
let browserPath = edgePath;
if (!fs.existsSync(browserPath)) {
  browserPath = chromePath;
}

console.log("Using browser path:", browserPath);

// Run a headless browser to print the page outerHTML for the header
const args = ["--headless=new", "--disable-gpu", "--dump-dom", "http://localhost:8080/"];

const proc = spawn(browserPath, args);
let html = "";

proc.stdout.on("data", (data) => {
  html += data.toString();
});

proc.stderr.on("data", (data) => {
  // Console.error(`stderr: ${data}`);
});

proc.on("close", (code) => {
  console.log(`dump-dom exited with code ${code}`);

  // Let's search for "Toggle mobile menu" or "Menu" in the dumped HTML
  const hasHamburger = html.includes("Toggle mobile menu") || html.includes("lucide-menu");
  console.log("Does HTML contain mobile hamburger button?", hasHamburger);

  if (hasHamburger) {
    const buttonIndex = html.indexOf("Toggle mobile menu");
    const snippet = html.substring(Math.max(0, buttonIndex - 200), buttonIndex + 400);
    console.log("\n--- HTML Snippet around hamburger button ---");
    console.log(snippet);
    console.log("-------------------------------------------\n");
  } else {
    console.log("Could not find button in HTML.");
    console.log("First 1000 characters of header container:");
    const headerIndex = html.indexOf("<header");
    if (headerIndex !== -1) {
      console.log(html.substring(headerIndex, headerIndex + 1500));
    } else {
      console.log("No <header> element found in HTML!");
    }
  }
});
