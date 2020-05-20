const fs = require("fs");
const rimraf = require("rimraf");
const pascalCase = require("change-case").pascalCase;
const config = require("./config.json");

const args = process.argv.slice(2);

/**
 * Outputs the dummy lua doc file.
 * @param {string} namespace
 * @param {object} luaFileData
 */
const saveLuaFileData = (game, namespace, luaFileData) => {
	Object.keys(luaFileData).forEach((apiSet) => {
		console.log(`./build/${game}/[_docs]/[${apiSet}]/${namespace}.lua`);
		if (!fs.existsSync(`./build/${game}/[_docs]/[${apiSet}]`)) {
			fs.mkdirSync(`./build/${game}/[_docs]/[${apiSet}]`);
		}
		fs.writeFileSync(
			`./build/${game}/[_docs]/[${apiSet}]/${namespace}.lua`,
			luaFileData[apiSet]
		);
	});
};

const getLuaType = (type) => {
	let adjustedType = type.toLowerCase().replace(/(const )|(\*)/gi, "");
	switch (adjustedType) {
		case "int":
		case "long":
		case "float":
			return "number";
		case "char":
			return "string";
		case "bool":
			return "boolean";
		case "any":
			return "any";
		case "void":
			return "void";
		case "vector3":
			return "vector3";
		default:
			// console.log(adjustedType)
			return type;
	}
};

const run = (game, source) => {
	const NATIVES = require(`./build/${game}-${source}-natives.json`);
	Object.keys(NATIVES).forEach((namespace) => {
		let luaFileData = {};
		// console.log(namespace)
		Object.keys(NATIVES[namespace])
			.sort()
			.forEach((hash) => {
				let data = NATIVES[namespace][hash];
				let name = `N_${hash.toLowerCase()}`;
				if ("name" in data) {
					name = pascalCase(data.name);
				}
				let fnDocLua = "---\n";
				fnDocLua += `--- ${hash}${
					"jhash" in data ? " " + data.jhash : ""
				} | \n`;
				fnDocLua += `--- ${data.name || hash} | \n`;
				if (data.description) {
					fnDocLua += `--- ${data.description.replace(
						/\n/g,
						"\n--- "
					)}\n`;
				}

				let paramNames = [];
				data.params.forEach((param) => {
					paramNames.push(param.name);
					fnDocLua += `---@param ${param.name} ${getLuaType(
						param.type
					)} ${param.description}\n`;
				});

				if (data.results) {
					fnDocLua += `---@return ${getLuaType(data.results)}\n`;
				}

				fnDocLua += `function ${name}(${paramNames.join(
					", "
				)})\nend\n\n`;
				if (!("apiset" in data)) {
					if (namespace === "CFX") {
						data.apiset = "unknown";
					} else {
						data.apiset = "client";
					}
				}

				if (!(data.apiset in luaFileData)) {
					luaFileData[data.apiset] = "";
				}
				luaFileData[data.apiset] += fnDocLua;
			});
		saveLuaFileData(game, namespace, luaFileData);
	});
};

function CreateGameDocFiles(game, sources) {
	rimraf.sync(`./build/${game}/[_docs]`);
	fs.mkdirSync(`./build/${game}/[_docs]`, { recursive: true });
	
	const request = require("request");
	
	for (let [source, natives] of Object.entries(sources)) {
		if (!fs.existsSync(`./build/${game}-${source}-natives.json`)) {
			const stream = request(natives).pipe(fs.createWriteStream(`./build/${game}-${source}-natives.json`));

			stream.on("finish", () => { run(game, source) })
		} else {
			run(game, source)
		}
	}
}

if (args.length > 0) {
	for (let arg of args) {
		if (typeof config.natives[arg] !== "undefined") {
			const [game, natives] = [arg, config.natives[arg]];

			CreateGameDocFiles(game, natives);
		} else {
			console.error(`[Error] Unable to find "${arg}" in the list of supported games.`);
		}
	}
} else {
	for (let [game, natives] of Object.entries(config.natives)) {
		CreateGameDocFiles(game, natives);
	}
}
