// Custom "app://" scheme used in production to serve the packaged Angular UI.
// Implemented with Electron's modern protocol.handle() API and explicit MIME
// types so ES-module scripts and stylesheets are served with the correct
// Content-Type (the deprecated registerBufferProtocol path intermittently
// mis-served index.html as text, showing raw CSS/HTML instead of the app).
//
// Implementing a custom protocol (instead of file://) lets Angular use ES module
// targets and avoids running the app in a file:// origin.

const fs = require("fs")
const path = require("path")

const DIST_PATH = path.join(__dirname, "../../app/dist")
const scheme = "app"

const mimeTypes = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".html": "text/html",
    ".htm": "text/html",
    ".json": "application/json",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".ico": "image/vnd.microsoft.icon",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".map": "application/json",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".wasm": "application/wasm",
    ".txt": "text/plain",
}

function mimeFor(filePath) {
    return (
        mimeTypes[path.extname(filePath).toLowerCase()] ||
        "application/octet-stream"
    )
}

// protocol.handle() handler: resolve the request path under DIST_PATH and return
// a Response with an explicit Content-Type. Requests look like
// "app://index.html/<path>" (host is always "index.html"); we key off the path,
// defaulting to index.html for the app shell.
async function handle(request) {
    let pathname
    try {
        pathname = new URL(request.url).pathname
    } catch {
        pathname = "/"
    }
    let rel = decodeURIComponent(pathname || "/")
    if (rel === "/" || rel === "") {
        rel = "/index.html"
    }

    const distRoot = path.normalize(DIST_PATH)
    const filePath = path.normalize(path.join(distRoot, rel))

    // Prevent path traversal outside the packaged dist directory.
    if (filePath !== distRoot && !filePath.startsWith(distRoot + path.sep)) {
        return new Response("Forbidden", { status: 403 })
    }

    try {
        const data = await fs.promises.readFile(filePath)
        return new Response(data, {
            status: 200,
            headers: { "content-type": mimeFor(filePath) },
        })
    } catch (err) {
        console.error(`[app protocol] ${rel}: ${err.code || err.message}`)
        return new Response("Not found", { status: 404 })
    }
}

module.exports = {
    scheme,
    handle,
}
