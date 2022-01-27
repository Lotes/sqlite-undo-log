const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    entry: {
        index: "./src/ts/index.ts",
        "sqlite3-adapter": "./src/ts/sqlite3-impl.ts",
    },
    externals: [nodeExternals()],
    externalsPresets: {
        node: true
    },
    output: {
        path: path.resolve(__dirname, './bin'),
        filename: "[name].js"
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: "ts-loader"
        }]
    }
};