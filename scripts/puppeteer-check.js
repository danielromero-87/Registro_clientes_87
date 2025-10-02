const puppeteer = require('puppeteer');

(async () => {
  const URL = 'https://www.fasecolda.com/guia-de-valores/';
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const response = await page.goto(URL, { waitUntil: 'networkidle2', timeout: 0 });
    console.log('Status:', response?.status() ?? 'sin respuesta');
    const title = await page.title();
    console.log('Título:', title);
    await browser.close();
  } catch (err) {
    console.error('Error lanzando Puppeteer:', err);
  }
})();
