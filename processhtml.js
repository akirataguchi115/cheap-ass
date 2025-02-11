import * as fs from 'fs';
import * as cheerio from 'cheerio';

// Path to the downloaded HTML file
const htmlFilePath = './index.html';

// Read the HTML file
fs.readFile(htmlFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the HTML file:', err);
        return;
    }

    // Load the HTML content into Cheerio
    const $ = cheerio.load(data);
    const adLinks = [];

    // Extract all ad links
    $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/ads\/\d+\/\w+/)) {
            adLinks.push(href);
        }
    });

    // Remove duplicate links
    const uniqueAdLinks = [...new Set(adLinks)];

    console.log(uniqueAdLinks);
    fs.writeFileSync('gals.json', JSON.stringify([...uniqueAdLinks]), 'utf8');

});