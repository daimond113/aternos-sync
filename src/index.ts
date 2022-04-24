#!/usr/bin/env node

import yargs from 'yargs'
import axios from 'axios'
import puppeteer from 'puppeteer-extra'
import { readdir } from 'fs/promises'
import prompts from 'prompts'
import { distance } from 'fastest-levenshtein'
import userAgents from 'puppeteer-extra-plugin-anonymize-ua'
import stealth from 'puppeteer-extra-plugin-stealth'
import humanize from '@extra/humanize'
import { setTimeout } from 'timers/promises'
<<<<<<< HEAD
import chromium from 'chromium'
=======
>>>>>>> 9dc1521 (initial commit)

puppeteer
    .use(stealth())
    .use(userAgents())
    .use(humanize())

<<<<<<< HEAD
const searchURL = new URL('https://api.curseforge.com/v1/mods/search')
=======
const baseURL = 'https://api.curseforge.com'
const searchURL = new URL(`${baseURL}/v1/mods/search`)
>>>>>>> 9dc1521 (initial commit)
searchURL.searchParams.set('gameId', '432')

async function search(key: string, mod: string, isRetyped: boolean) {
    if (mod === "SYNC_SKIP") return undefined
    const clone = new URL(searchURL)
    clone.searchParams.set('searchFilter', mod)
    const results = axios.get(clone.toString(), {
        headers: {
            'x-api-key': key
        }
    })
    const { data: { data } } = await results
    if (data.length === 0) {
        if (!isRetyped) {
            const result = await prompts({
                type: 'text',
                name: 'value',
                message: `No results found for ${mod}. Try to retype the mod name.`,
            })
            if (result.value) {
                return search(key, result.value, true)
            }
        }
        else {
            console.log(`No results found for ${mod}`)
            return
        }
    }
    if (data.length > 1) {
        const choices = data.map((mod) => ({
            title: `${mod.name} (${mod.slug})`,
            realName: mod.name,
            value: mod.slug
        })).sort((a, b) => distance(a.realName, mod) - distance(b.realName, mod))
        let { value } = await prompts({
            type: 'autocomplete',
            name: 'value',
            message: `${mod} is ambiguous, which one do you want?`,
            choices,
            initial: choices[0].value,
            onState: function () {
                this.fallback = { title: this.input, description: `Selects ${this.input}`, value: this.input };

                // Check to make sure there are no suggestions so we do not override a suggestion
                if (this.suggestions.length === 0) {
                    this.value = this.input;
                }
            },
        })
        if (!choices.find((choice) => choice.value === value)) {
            // it is a custom choice, we need to research
            value = await search(key, value.trim(), false)
        }
        return value
    }
    return data[0].slug
}

async function sync(args: yargs.Argv) {
    const argv = await args.argv
    const key = argv.k as string
    const url = new URL(argv.u as string)
    url.pathname.endsWith('/') || (url.pathname += '/')
    const dir = argv.m as string
    const cookie = argv.c as string
    const mods = (await readdir(dir)).map((name) => name.replace('.jar', '').match(/([a-zA-Z]+'?[a-zA-Z]+)/g).join(' ').trim())
    let _slugs = [] as string[]
    for (const mod of mods) {
        _slugs.push(await search(key, mod, false))
    }
    const slugs = _slugs.filter((slug) => slug !== undefined)
    const browser = await puppeteer.launch({
<<<<<<< HEAD
        headless: false,
        executablePath: chromium.path,
    })
    const page = (await browser.pages())[0]
=======
        headless: false
    })
    const page = await browser.newPage()
>>>>>>> 9dc1521 (initial commit)
    page.setCookie({
        name: 'ATERNOS_SESSION',
        httpOnly: true,
        sameSite: 'Lax',
        value: cookie,
        domain: 'aternos.org',
        path: '/'
    })
    await page.goto(url.toString())
    try {
        await page.waitForSelector('div#accept-choices', {
            timeout: 15_000
        }).then(() => page.click('div#accept-choices'))
    } catch {
        // it didnt prompt for cookies
    }
    await page.waitForSelector('div.server-body').then(() => page.click('div.server-body'))
<<<<<<< HEAD
    await page.waitForNavigation()
    let installedSlugs = [...slugs]
=======
>>>>>>> 9dc1521 (initial commit)
    for (const slug of slugs) {
        const dest = new URL(url)
        dest.pathname += `a/curseforge/${slug}`
        await page.goto(dest.toString())
        try {
            await page.waitForSelector('div.btn-success', {
                timeout: 15_000
            }).then(() => page.click('div.btn-success'))
            await setTimeout(10_000)
        } catch {
            console.log(`${slug} cannot be installed, is it on Aternos?`)
<<<<<<< HEAD
            installedSlugs = installedSlugs.filter((installedSlug) => installedSlug !== slug)
=======
>>>>>>> 9dc1521 (initial commit)
            continue
        }
    }
    await browser.close()
<<<<<<< HEAD
    console.log(`Done, installed: ${installedSlugs.join(', ')}`)
=======
>>>>>>> 9dc1521 (initial commit)
}

function getProcessArgvBinIndex() {
    if (isBundledElectronApp()) return 0
    return 1
}

function isBundledElectronApp() {
    return isElectronApp() && !(process as any).defaultApp
}

function isElectronApp() {
    return !!(process as any).versions.electron
}

export function hideBin(argv: string[]) {
    return argv.slice(getProcessArgvBinIndex() + 1)
}

const args = yargs(hideBin(process.argv))

args.scriptName('aternos-sync')

args
    .command(
        'sync [k] [u] [m]',
        'Syncs your mods with Aternos',
        sync
    )
    .option('k', {
        alias: "api-key",
        type: 'string',
        demandOption: true
    })
    .option('u', {
        alias: "base-url",
        default: "https://aternos.org/addons/",
        type: "string"
    })
    .option('m', {
        alias: "mod-dir",
        demandOption: true,
        type: 'string'
    })
    .option('c', {
        alias: 'cookie',
        demandOption: true,
        type: 'string'
    })
    .help()
    .parse()