// const nativesJsonUrl = 'https://raw.githubusercontent.com/gottfriedleibniz/rdr3-nativedb-codegen/master/out/natives.json'
const nativesJsonUrl = 'https://raw.githubusercontent.com/alloc8or/rdr3-nativedb-data/master/natives.json'

const fs = require('fs')
const rimraf = require('rimraf')

rimraf.sync('./build/[_docs]')
fs.mkdirSync('./build/[_docs]', { recursive: true })

const pascalCase = require('change-case').pascalCase

/**
 * Outputs the dummy lua doc file.
 * @param {string} namespace 
 * @param {object} luaFileData 
 */
const saveLuaFileData = (namespace, luaFileData) => {
    Object.keys(luaFileData).forEach(apiSet => {
        console.log(`./build/[_docs]/[${apiSet}]/${namespace}.lua`)
        if (!fs.existsSync(`./build/[_docs]/[${apiSet}]`)) {
            fs.mkdirSync(`./build/[_docs]/[${apiSet}]`)
        }
        fs.writeFileSync(`./build/[_docs]/[${apiSet}]/${namespace}.lua`, luaFileData[apiSet])
    })
}

const getLuaType = type => {
    let adjustedType = type.toLowerCase().replace(/(const )|(\*)/gi, '')
    switch (adjustedType) {
        case 'int':
        case 'long':
        case 'float':
            return 'number'
        case 'char':
            return 'string'
        case 'bool':
            return 'boolean'
        case 'any':
            return 'any'
        case 'void':
            return 'void'
        case 'vector3':
            return 'vector3'
        default:
            // console.log(adjustedType)
            return type
    }
}

const run = () => {
    const NATIVES = require('./build/natives.json')
    Object.keys(NATIVES).forEach(namespace => {
        let luaFileData = {}
        // console.log(namespace)
        Object.keys(NATIVES[namespace]).forEach(hash => {
            let data = NATIVES[namespace][hash]
            let name = `N_${hash.toLowerCase()}`
            if ('name' in data) {
                name = pascalCase(data.name)
            }
            let fnDocLua = '---\n'
            fnDocLua += `--- ${hash}${('jhash' in data) ? ' ' + data.jhash : '' } | \n`
            fnDocLua += `--- ${data.name || hash} | \n`
            if (data.description) {
                fnDocLua += `--- ${data.description.replace(/\n/g, '\n--- ')}\n`
            }

            let paramNames = []
            data.params.forEach(param => {
                paramNames.push(param.name)
                fnDocLua += `---@param ${param.name} ${getLuaType(param.type)} ${param.description}\n`
            })

            if (data.results) {
                fnDocLua += `---@return ${getLuaType(data.results)}\n`
            }

            fnDocLua += `function ${name}(${paramNames.join(', ')})\nend\n\n`
            if (!('apiset' in data)) {
                if (namespace === 'CFX') {
                    data.apiset = 'unknown'
                } else {
                    data.apiset = 'client'
                }
            }

            if (!(data.apiset in luaFileData)) {
                luaFileData[data.apiset] = ''
            }
            luaFileData[data.apiset] += fnDocLua
        })
        saveLuaFileData(namespace, luaFileData)
    })
}

if (fs.existsSync('./build/natives.json')) {
    run()
} else {
    const request = require('request')

    request(nativesJsonUrl, () => {
        run()
    }).pipe(fs.createWriteStream('./build/natives.json'))
}
