import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import * as cheerio from 'cheerio';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

  // List of ad links to fetch
  const adLinks = JSON.parse(fs.readFileSync('gals.json', 'utf8'));

  // Array to store results
  const results = [];

  for (const link of adLinks) {
    console.log(link);
    try {
      await page.goto(link, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForSelector('.price', { timeout: 15000 }); // Wait for the price elements to load
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      // Get page content
      const content = await page.content();
      const $ = cheerio.load(content);

      // Array to store prices with "minuuttia" duration
      const validPrices = [];

      // Iterate over each price element
      $('.price').each((_, el) => {
        const priceText = $(el).text().trim();
        const durationText = $(el).closest('.duration').text().trim(); // Find the closest .duration element

        // Check if the duration includes "minuuttia"
        if (/minuuttia/i.test(durationText) && /EUR/.test(priceText)) {
          const priceNumber = parseFloat(priceText.replace(/[^0-9.]/g, '').replace(/\./g, ''));
          if (!isNaN(priceNumber)) {
            validPrices.push(priceNumber);
          }
        }
      });

      // Find the lowest valid price
      if (validPrices.length > 0) {
        const lowestPrice = Math.min(...validPrices);
        console.log(`The lowest price found is: ${lowestPrice} EUR`);
        results.push({ link, price: lowestPrice });
      } else {
        console.log('No valid prices found (duration must include "minuuttia").');
        results.push({ link, price: null }); // Add link with no valid price
      }
    } catch (error) {
      console.error(`Error processing ${link}:`, error.message);
      results.push({ link, price: null }); // Add link with error
    }
  }

  // Sort results by price (ascending order)
  results.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

  // Write results to output.toml
  const tomlOutput = results.map((result) => {
    return `[[entry]]
link = "${result.link}"
price = ${result.price !== null ? result.price : 'null'}`;
  }).join('\n');

  fs.writeFileSync('output.toml', tomlOutput);

  console.log('Results written to output.toml');

  await browser.close();
})();