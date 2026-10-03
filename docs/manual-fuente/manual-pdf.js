const puppeteer = require('puppeteer-core');
const path = require('path');
const [salida] = process.argv.slice(2);
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.goto(require('url').pathToFileURL(path.join(__dirname, 'manual.html')).href, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: salida, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#888;padding:0 18mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial"><span>SIArchivoDigital · Manual de usuario</span><span class="pageNumber"></span></div>',
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log('PDF listo');
})();
