const path = require("path");

const library = "Nixi";
const coreFilename = library.toLowerCase();

const config = env => ({
	mode: "production",
	optimization: {
		minimize: !!env.production
	},
	resolve: {
		modules: ["node_modules"],
		extensions: [".js", ".ts"],
		alias: {
			core: path.resolve(__dirname, "./src/core"),
			platform: path.resolve(__dirname, "./src/platform")
		}
	},
	entry: path.resolve(__dirname, "./src/index.ts"),
	output: {
		path: path.resolve(__dirname, "./lib"),
		filename: env.production
			? `${coreFilename}.umd.min.js`
			: `${coreFilename}.imd.js`,
		library: library,
		libraryTarget: "umd",
		umdNamedDefine: true
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				},
				exclude: /node_modules/
			}
		]
	},
	plugins: []
});

module.exports = config;
