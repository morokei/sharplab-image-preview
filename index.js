
import puppeteer from 'puppeteer';
import express from 'express';

const app = express();
const port = 3000;

app.get('/:url/:wxh', async (req, res) => {
    const [w, h] = req.params.wxh.split('x');
    const width = parseInt(w, 10) || 1280;
    const height = parseInt(h, 10) || 780;
    //v2:CYLg1APg9FAEAqBTAzgFwLACgACAmAjFtgMyx6wDCsA3lrPWadgCywCyAFAJQ10MC+WfkA==
    const url = 'https://sharplab.io/#' + req.params.url;
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
});
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});