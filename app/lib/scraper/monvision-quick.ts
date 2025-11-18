import puppeteer from "puppeteer";

export interface ScrapedDapp {
  name: string;
  logoUrl: string | null;
  detailsUrl: string | null;
}

/**
 * Quick scraper for Monvision ecosystem page
 * Only gets basic info: name, logo, and details URL
 * Does NOT get social links, contracts, or Twitter followers
 */
export async function scrapeMonvisionQuick(): Promise<ScrapedDapp[]> {
  console.log("🚀 Starting quick Monvision scrape...");

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log("📍 Navigating to Monvision ecosystem...");
    await page.goto("https://testnet.monvision.io/ecosystem", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for the page to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Click on "All Projects" tab if it exists
    try {
      const allProjectsButton = await page.$('button:has-text("All Projects")');
      if (allProjectsButton) {
        console.log("📂 Clicking 'All Projects' tab...");
        await allProjectsButton.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log("⚠️  'All Projects' tab not found, continuing...");
    }

    // Scrape the project cards
    // NOTE: These selectors need to be adapted based on the actual DOM structure
    console.log("🔍 Extracting projects...");

    const dapps = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-project-card], .project-card, [class*="project"], [class*="card"]'));

      return cards
        .map((card) => {
          // Try to find name
          const nameEl =
            card.querySelector('[data-project-name]') ||
            card.querySelector('.project-name') ||
            card.querySelector('h3') ||
            card.querySelector('h2');

          const name = nameEl?.textContent?.trim();
          if (!name) return null;

          // Try to find logo
          const logoEl = card.querySelector('img');
          const logoUrl = logoEl?.src || null;

          // Try to find details link
          const linkEl = card.querySelector('a');
          const detailsUrl = linkEl?.href || null;

          return {
            name,
            logoUrl,
            detailsUrl,
          };
        })
        .filter((item): item is { name: string; logoUrl: string | null; detailsUrl: string | null } =>
          item !== null
        );
    });

    console.log(`✅ Scraped ${dapps.length} projects`);

    return dapps;
  } catch (error) {
    console.error("❌ Error scraping Monvision:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
