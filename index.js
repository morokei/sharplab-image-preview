import puppeteer from 'puppeteer';
import express from 'express';
import asyncHandler from 'express-async-handler';

const app = express();
const port = 3000;

const maxWidth = 1024;
const maxHeight = 768;

app.use((err, __, res, _) => {
    console.error(err);
    res.status(500).send(err.message ?? err);
});

app.get('/:url/:wxh', asyncHandler(async (req, res) => {
    const partial = req.params.url;
    const [w, h] = req.params.wxh.split('x');
    if (!partial) {
        return res.status(404).send('expected partial url, but got nothing. make sure you provide /:url/:wxh');
    }
    if (!w || !h) {
        return res.status(404).send('expected width and height in pixels, make sure you provide /:url/:wxh');
    }
    const width = parseInt(w, 10);
    const height = parseInt(h, 10);

    if (width > maxWidth) {
        return res.status(404).send(`width is larger than ${maxWidth} pixels`);
    }
    if (height > maxHeight) {
        return res.status(404).send(`height is larger than ${maxHeight} pixels`);
    }

    //v2:CYLg1APg9FAEAqBTAzgFwLACgACAmAjFtgMyx6wDCsA3lrPWadgCywCyAFAJQ10MC+WfkA==
    const url = 'https://sharplab.io/#' + partial;
    console.log(url);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: 'networkidle0',
    });
    await page.setViewport({
        width,
        height,
        deviceScaleFactor: 1,
    });
    const buffer = await page.screenshot();
    await browser.close();
    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
    });
    res.end(buffer);
}));

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});