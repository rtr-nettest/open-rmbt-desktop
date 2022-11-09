const path = require("path")
const TerserPlugin = require("terser-webpack-plugin")

module.exports = {
    entry: "./src/measurement/services/worker.service.ts",
    output: {
        path: path.join(__dirname, "src/measurement/services"),
        filename: "worker.service.js",
    },
    target: "node",
    node: {
        __dirname: false,
    },
    module: {
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
    optimization: {
        minimizer: [
            new TerserPlugin({
                extractComments: false,
            }),
        ],
    },
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    },
}
