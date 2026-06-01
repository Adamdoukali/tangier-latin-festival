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

// We will write a small script that edge will run, or we can use puppeteer, but since we are doing headless command line, we can inject a script or take a screenshot after changing the window size, or we can evaluate some js.
// Wait! Let's just run a script using bun and Selenium/Playwright or use a simple node script that launches Edge with debug port, connects via WebSocket, and gets the element styles!
// But wait! Is there a simpler way?
// Yes! Edge headless supports remote debugging: --remote-debugging-port=9222
// We can start it, query http://localhost:9222/json to get the websocket debugger URL, connect, and run commands!
// Wait, that is incredibly powerful but a bit complex.
// Is there a simpler explanation?
// Look at the mobile screenshot:
// The white header is visible at the very top.
// The logo is at the top left.
// But wait! The logo wrapper is:
// <a href={localizedHref("/")} className="flex items-center gap-3">
//   <img src={logo} ... />
// </a>
// Wait! Is the hamburger button inside a container that has "hidden lg:flex" instead of "flex lg:hidden"?
// Let's look at Nav.tsx at line 153 again:
// <div className="flex items-center lg:hidden gap-3">
// Wait, is there a hidden class on some parent element?
// Let's check the container on line 100:
// <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
// No, that is visible.
// Wait, what about line 99:
// <div className="border-b border-border/40 bg-background/70 backdrop-blur-xl">
// No, that is visible too.
// Wait! What if the hamburger trigger div has a text-foreground color that matches the background color?
// In light mode, the background color of the header is oklch(1 0 0) (white) with 70% opacity.
// The hamburger button has "text-foreground".
// Wait, is text-foreground white in light mode?
// In styles.css, let's look at the variables:
// :root {
//   --background: oklch(1 0 0); /* pure white */
//   --foreground: oklch(0.18 0.02 60); /* deep charcoal */
// }
// Wait! In styles.css:
// --color-foreground: var(--foreground);
// And the classes map text-foreground to color-foreground.
// So text-foreground should be deep charcoal!
// But wait! Look at the header background in the desktop screenshot:
// The links (e.g. HOME, PROGRAMME, etc.) are rendered in black/charcoal text!
// So text-foreground is definitely dark/charcoal!
// Then why is the hamburger icon invisible?
// Wait! Let's check the import of `Menu` and `X` from `lucide-react`!
// Wait, is it possible that `lucide-react` icons are not rendering on mobile viewport because of some React hook or SSR mismatch?
// No, because they are standard SVG icons.
// Wait! Let's inspect the bounding client rect of the button using a small puppeteer script or a script that connects to the debugging port!
// Let's write a node script that starts Edge, runs a script in the browser console, and logs the console output!
// This is actually extremely simple. We can use a node script to launch Edge with --remote-debugging-port=9222 and fetch the element's position.
// Let's do that! It will tell us exactly where the button is and what its size, visibility, opacity, and color are!
