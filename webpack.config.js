const path = require("path")
const Dotenv = require("dotenv-webpack")
const CopyPlugin = require("copy-webpack-plugin")

const baseConfig = {
    node: {
        __dirname: false,
    },
    module: {
        noParse: /sql.js/,
        rules: [
            {
                test: /\.node$/,
                loader: "node-loader",
            },
            {
                test: /\.tsx?$/,
                exclude: /(node_modules|\.webpack)/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    },
    plugins: [new Dotenv()],
}

module.exports = [
    {
        ...baseConfig,
        entry: "./src/electron/electron.ts",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "main.js",
        },
        target: "electron-main",
        plugins: [
            ...baseConfig.plugins,
            new CopyPlugin({
                patterns: [
                    {
                        from: "./node_modules/sql.js/dist/sql-wasm.wasm",
                    },
                ],
            }),
        ],
    },
    {
        ...baseConfig,
        entry: "./src/electron/preload.ts",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "preload.js",
        },
        target: "electron-preload",
    },
    {
        ...baseConfig,
        entry: "./src/measurement/services/worker.service.ts",
        output: {
            path: path.join(__dirname, "dist"),
            filename: "worker.service.js",
        },
        target: "node",
    },
]
