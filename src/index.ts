#!/usr/bin/env node

import yargs from 'yargs'
import puppeteer from 'puppeteer-extra'
import { cp, readdir, readFile, rm } from 'fs/promises'
import userAgents from 'puppeteer-extra-plugin-anonymize-ua'
import stealth from 'puppeteer-extra-plugin-stealth'
import humanize from '@extra/humanize'
import { setTimeout } from 'timers/promises'
import chromium from 'chromium'
import { join } from 'path'
import { zip } from 'compressing'
import toml from '@sgarciac/bombadil'

puppeteer
    .use(stealth())
    .use(userAgents())
    .use(humanize())

async function sync(args: yargs.Argv) {
    const argv = await args.argv
    const url = new URL(argv.u as string)
    url.pathname.endsWith('/') || (url.pathname += '/')
    const dir = argv.m as string
    const cookie = argv.c as string
    const modsPath = join(process.cwd(), 'mods')
    await cp(dir, modsPath, {
        recursive: true
    })
    const slugs = [] as string[]
    const realModsPath = join(process.cwd(), 'tmp')
    for await (const mod of (await readdir(modsPath)).filter((file) => file.endsWith('.jar'))) {
        const modPath = join(modsPath, mod)
        const realModPath = join(realModsPath, mod.replace('.jar', ''))
        await zip.uncompress(modPath, realModPath)
        const tomlLocation = join(realModPath, 'META-INF', 'mods.toml')
        const plainToml = await readFile(tomlLocation, 'utf8')
        const parser = new toml.TomlReader()
        parser.readToml(plainToml)
        slugs.push(parser.result.mods[0].modId)
    }
    await rm(modsPath, {
        recursive: true
    })
    await rm(realModsPath, {
        recursive: true
    })
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromium.path,
    })
    const page = (await browser.pages())[0]
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
    await page.waitForNavigation()
    let installedSlugs = [...slugs]
    for (const slug of slugs) {
        const dest = new URL(url)
        dest.pathname += `a/curseforge/${slug}`
        await page.goto(dest.toString())
        try {
            await page.waitForSelector('div.btn-success', {
                timeout: 15_000
            }).then(() => page.click('div.btn-success'))
            await setTimeout(6_000)
        } catch {
            console.log(`${slug} cannot be installed, is it on Aternos?`)
            installedSlugs = installedSlugs.filter((installedSlug) => installedSlug !== slug)
            continue
        }
    }
    await browser.close()
    console.log(`Done, installed: ${installedSlugs.join(', ')}`)
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
        'sync [u] [m] [c]',
        'Syncs your mods with Aternos',
        sync
    )
    .option('u', {
        alias: "base-url",
        default: "https://aternos.org/addons/",
        type: "string",
        description: "The base url of the Aternos mods url"
    })
    .option('m', {
        alias: "mod-dir",
        demandOption: true,
        type: 'string',
        description: 'The directory containing the mods to install, usually .minecraft/mods'
    })
    .option('c', {
        alias: 'cookie',
        demandOption: true,
        type: 'string',
        description: 'The Aternos session cookie, it\'s in a cookie called ATERNOS_SESSION'
    })
    .help()
    .parse()