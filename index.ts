import puppeteer, { Browser } from 'puppeteer';
import express from 'express';
import asyncHandler from 'express-async-handler';
import genericPool from 'generic-pool';

const app = express();
const port = process.env.PORT || 3000;

const maxWidth = 1024;
const maxHeight = 768;
let browserCreateError: string | unknown | null = "Not prepared yet";

const browserPool = genericPool.createPool({
    async create() {
        let browser;
        try {
            browser = await puppeteer.launch();
            // or
            /* browser = await new Promise<Browser>((_, reject) => {
                setTimeout(() => reject("Test error"), 5 * 1000);
            }); */
        }
        catch (e) {
            browserCreateError = e;
            console.error(e);
            throw e;
        }
        browserCreateError = null;
        console.log("prepared");
        return browser;
    },
    destroy(browser) {
        return browser.close();
    }
}, { min: 3, max: 10 })

app.use((err: unknown, __: express.Request, res: express.Response, _: express.NextFunction) => {
    console.error(err);
    res.status(500).send((err as { message?: string }).message ?? err);
});

app.get('/:url/:wxh', asyncHandler(async (req, res) => {
    const partial = req.params.url;
    const [w, h] = req.params.wxh.split('x');
    if (!partial) {
        res.status(404).send('expected partial url, but got nothing. make sure you provide /:url/:wxh');
        return;
    }
    if (!w || !h) {
        res.status(404).send('expected width and height in pixels, make sure you provide /:url/:wxh');
        return;
    }
    const width = parseInt(w, 10);
    const height = parseInt(h, 10);

    if (width > maxWidth) {
        res.status(404).send(`width is larger than ${maxWidth} pixels`);
        return;
    }
    if (height > maxHeight) {
        res.status(404).send(`height is larger than ${maxHeight} pixels`);
        return;
    }

    //v2:CYLg1APg9FAEAqBTAzgFwLACgACAmAjFtgMyx6wDCsA3lrPWadgCywCyAFAJQ10MC+WfkA==
    const url = 'https://sharplab.io/#' + partial;
    console.log(url);

    if (browserCreateError) {
        res.status(503).send(browserCreateError);
        return;
    }

    let buffer: Buffer;
    const browser = await browserPool.acquire();
    try {
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle0',
        });
        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 1,
        });
        buffer = await page.screenshot() as Buffer;
    }
    finally {
        await browserPool.release(browser);
    }
    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length,
        'Cache-Control': 'public,max-age=31536000'
    });
    res.end(buffer);
}));

const server = app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing');
    await new Promise(done => server.close(done));
    await browserPool.drain();
    await browserPool.clear();
});