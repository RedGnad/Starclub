import puppeteer, { Browser } from "puppeteer";

export interface ScrapedDappComplete {
  name: string;
  logoUrl: string | null;
  category: string | null;
  description: string | null;
  detailsUrl: string;

  // Social links (scraped from detail page)
  website: string | null;
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
  github: string | null;
  docs: string | null;

  // Metrics (from detail page)
  accountsCount: number;
  transactionsCount: number;

  // Contracts (from Contracts tab)
  contracts: ContractInfo[];
}

export interface ContractInfo {
  address: string;
  name: string | null;
  type: string | null;
}

/**
 * Complete scraper for Monvision ecosystem
 * 1. Gets all projects from ecosystem page
 * 2. For each project, visits detail page to get:
 *    - Social links
 *    - Metrics
 *    - Contracts (from Contracts tab)
 */
export async function scrapeMonvisionComplete(): Promise<ScrapedDappComplete[]> {
  console.log("🚀 Starting complete Monvision scrape...");

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

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Click on "All Projects" tab
    console.log("📂 Looking for 'All Projects' tab...");

    const allProjectsClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));

      for (const button of buttons) {
        const text = button.textContent?.trim() || '';
        if (text === 'All Projects' || text.includes('All Projects')) {
          console.log(`Found button with text: "${text}"`);
          (button as HTMLButtonElement).click();
          return true;
        }
      }

      return false;
    });

    if (allProjectsClicked) {
      console.log("✅ Clicked 'All Projects' tab");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      console.log("⚠️  'All Projects' tab not found, continuing...");
    }

    // Click "Load More" button until all projects are loaded
    console.log("📜 Loading all projects...");
    let loadMoreClicks = 0;
    const maxLoadMoreClicks = 20; // Safety limit to avoid infinite loop

    while (loadMoreClicks < maxLoadMoreClicks) {
      // Count current projects
      const projectCountBefore = await page.evaluate(() =>
        document.querySelectorAll('a[href*="/project/"]').length
      );

      // Try to find and click "Load More" button
      // Common text variations: "Load More", "Show More", "More Projects", etc.
      const loadMoreButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));

        for (const button of buttons) {
          const text = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';

          if (
            text.includes('load') ||
            text.includes('more') ||
            text.includes('show') ||
            ariaLabel.includes('load') ||
            ariaLabel.includes('more')
          ) {
            // Found a potential "Load More" button
            return {
              found: true,
              text: button.textContent?.trim(),
              disabled: button.disabled || button.hasAttribute('disabled'),
            };
          }
        }

        return { found: false, text: null, disabled: false };
      });

      if (!loadMoreButton.found) {
        console.log("✅ No more 'Load More' button found - all projects loaded");
        break;
      }

      if (loadMoreButton.disabled) {
        console.log("✅ 'Load More' button is disabled - all projects loaded");
        break;
      }

      console.log(`🔄 Clicking "${loadMoreButton.text}" button (attempt ${loadMoreClicks + 1})...`);

      // Click the button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const button of buttons) {
          const text = button.textContent?.toLowerCase() || '';
          if (text.includes('load') || text.includes('more') || text.includes('show')) {
            (button as HTMLButtonElement).click();
            return;
          }
        }
      });

      // Wait for new content to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if new projects were loaded
      const projectCountAfter = await page.evaluate(() =>
        document.querySelectorAll('a[href*="/project/"]').length
      );

      const newProjectsLoaded = projectCountAfter - projectCountBefore;
      console.log(`   📊 Projects before: ${projectCountBefore}, after: ${projectCountAfter} (+${newProjectsLoaded})`);

      if (newProjectsLoaded === 0) {
        console.log("✅ No new projects loaded - all projects loaded");
        break;
      }

      loadMoreClicks++;
    }

    console.log(`✅ Loaded all projects after ${loadMoreClicks} clicks`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get all project URLs from the ecosystem page
    console.log("🔍 Extracting project URLs...");
    const projectUrls = await page.evaluate(() => {
      // Find all links with href="/project/..."
      const projectLinks = Array.from(
        document.querySelectorAll('a[href*="/project/"]')
      );

      const projects: any[] = [];
      const seen = new Set<string>();

      for (const link of projectLinks) {
        const href = link.getAttribute("href");
        if (!href || seen.has(href)) continue;

        seen.add(href);

        // Get project name from link text
        const name = link.textContent?.trim();
        if (!name) continue;

        // Try to find logo - look for img in nearby elements
        let logoUrl: string | null = null;
        const parent = link.closest("div, section, article");
        if (parent) {
          const img = parent.querySelector("img");
          logoUrl = img?.src || null;
        }

        projects.push({
          name,
          logoUrl,
          detailsUrl: href.startsWith("http") ? href : `https://testnet.monvision.io${href}`,
          category: null,
          description: null,
        });
      }

      return projects;
    });

    console.log(`📊 Found ${projectUrls.length} projects to enrich`);

    // Enrich each project with details
    const enrichedDapps: ScrapedDappComplete[] = [];

    for (let i = 0; i < projectUrls.length; i++) {
      const project = projectUrls[i];
      console.log(`\n[${i + 1}/${projectUrls.length}] Enriching ${project.name}...`);

      try {
        const enrichedData = await enrichProject(browser, project);
        enrichedDapps.push(enrichedData);
        console.log(`  ✅ ${project.name} enriched`);
      } catch (error) {
        console.error(`  ❌ Error enriching ${project.name}:`, error);
        // Add basic data even if enrichment fails
        enrichedDapps.push({
          ...project,
          detailsUrl: project.detailsUrl!,
          website: null,
          twitter: null,
          discord: null,
          telegram: null,
          github: null,
          docs: null,
          accountsCount: 0,
          transactionsCount: 0,
          contracts: [],
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Complete scrape finished: ${enrichedDapps.length} projects`);
    return enrichedDapps;
  } catch (error) {
    console.error("❌ Error in complete scrape:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Enrich a single project with data from its detail page
 */
async function enrichProject(
  browser: Browser,
  basicInfo: {
    name: string;
    logoUrl: string | null;
    detailsUrl: string;
    category: string | null;
    description: string | null;
  }
): Promise<ScrapedDappComplete> {
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    console.log(`  🔍 Visiting ${basicInfo.detailsUrl}...`);
    await page.goto(basicInfo.detailsUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Extract social links, metrics, and category from the page
    const pageData = await page.evaluate(() => {
      // Find social links
      let twitter: string | null = null;
      let discord: string | null = null;
      let telegram: string | null = null;
      let github: string | null = null;
      let website: string | null = null;
      let docs: string | null = null;

      const allLinks = Array.from(document.querySelectorAll('a[href]'));

      // First pass: find social links
      for (const link of allLinks) {
        const href = link.getAttribute('href') || '';

        if (!twitter && (href.includes('twitter.com') || href.includes('x.com')) && !href.includes('/intent/') && !href.includes('/search')) {
          twitter = href;
        }
        if (!discord && (href.includes('discord.com') || href.includes('discord.gg'))) {
          discord = href;
        }
        if (!telegram && (href.includes('t.me') || href.includes('telegram.org'))) {
          telegram = href;
        }
        if (!github && href.includes('github.com')) {
          github = href;
        }
      }

      // Second pass: find website and docs
      for (const link of allLinks) {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.toLowerCase().trim() || '';

        // Skip social media and blockchain explorer links
        if (
          href.includes('twitter.com') ||
          href.includes('x.com') ||
          href.includes('discord') ||
          href.includes('telegram') ||
          href.includes('github.com') ||
          href.includes('testnet.monvision.io') ||
          href.includes('/address/') ||
          href.includes('/tx/')
        ) {
          continue;
        }

        // Look for docs
        if (!docs && (href.includes('docs.') || href.includes('documentation') || text.includes('documentation'))) {
          docs = href;
        }

        // Look for website (external http links)
        if (
          !website &&
          (href.startsWith('http://') || href.startsWith('https://')) &&
          !href.includes('testnet.monvision.io')
        ) {
          website = href;
        }
      }

      // Extract category (Type)
      let category: string | null = null;
      const typeElements = Array.from(document.querySelectorAll('*'));
      for (const el of typeElements) {
        const text = el.textContent?.trim() || '';
        // Look for "Type" label followed by value
        if (text.startsWith('Type\n')) {
          category = text.replace('Type\n', '').trim().split('\n')[0];
          break;
        }
      }

      // Extract logo from detail page
      let logoUrl: string | null = null;
      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        const src = img.src;
        const alt = img.alt?.toLowerCase() || '';
        // Look for logo images (usually have specific size or are near the top)
        // Skip tiny icons and social media images
        if (src && !src.includes('icon') && !src.includes('twitter') && !src.includes('discord')) {
          if (img.width > 40 && img.height > 40) {
            logoUrl = src;
            break; // Take the first reasonable logo found
          }
        }
      }

      // Extract metrics
      let accountsCount = 0;
      let transactionsCount = 0;

      const textContent = document.body.innerText;
      const lines = textContent.split('\n').map(l => l.trim());

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Look for "Accounts (30D)" followed by a number
        if (line.includes('Accounts (30D)') && i + 1 < lines.length) {
          const nextLine = lines[i + 1].replace(/,/g, '');
          const match = nextLine.match(/\d+/);
          if (match) accountsCount = parseInt(match[0], 10);
        }

        // Look for "Transactions (30D)" or similar
        if (
          (line.includes('Transactions (30D)') || line.includes('Txns (30D)')) &&
          i + 1 < lines.length
        ) {
          const nextLine = lines[i + 1].replace(/,/g, '');
          const match = nextLine.match(/\d+/);
          if (match) transactionsCount = parseInt(match[0], 10);
        }
      }

      return {
        logoUrl,
        website,
        twitter,
        discord,
        telegram,
        github,
        docs,
        category,
        accountsCount,
        transactionsCount,
      };
    });

    // Now scrape contracts from the Contracts tab
    let contracts: ContractInfo[] = [];
    try {
      console.log(`  📋 Looking for Contracts tab...`);

      // Try to find and click the Contracts tab
      // The tab is in a <li> element with text "Contract"
      const clicked = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        for (const el of allElements) {
          const text = el.textContent?.trim();
          if (text === 'Contract' && (el.tagName === 'LI' || el.tagName === 'BUTTON')) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (clicked) {
        console.log(`  📂 Clicked Contracts tab, waiting for load...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Extract contract addresses from href attributes
        contracts = await page.evaluate(() => {
          const addressRegex = /0x[a-fA-F0-9]{40}/;
          const links = Array.from(document.querySelectorAll('a[href*="/address/0x"]'));
          const contracts: Array<{ address: string; name: string | null; type: string | null }> = [];

          for (const link of links) {
            const href = link.getAttribute('href') || '';
            const match = href.match(addressRegex);

            if (match) {
              const address = match[0];
              const name = link.textContent?.trim() || null;

              // Avoid duplicates
              if (!contracts.find(c => c.address === address)) {
                contracts.push({
                  address,
                  name,
                  type: null, // Type is not easily available in the table
                });
              }
            }
          }

          return contracts;
        });

        console.log(`  ✅ Found ${contracts.length} contracts`);
      } else {
        console.log(`  ⚠️  Contracts tab not found`);
      }
    } catch (error) {
      console.log(`  ⚠️  Error scraping contracts:`, error);
    }

    return {
      name: basicInfo.name,
      logoUrl: pageData.logoUrl || basicInfo.logoUrl, // Prefer logo from detail page
      category: pageData.category || basicInfo.category,
      description: basicInfo.description,
      detailsUrl: basicInfo.detailsUrl,
      website: pageData.website,
      twitter: pageData.twitter,
      discord: pageData.discord,
      telegram: pageData.telegram,
      github: pageData.github,
      docs: pageData.docs,
      accountsCount: pageData.accountsCount,
      transactionsCount: pageData.transactionsCount,
      contracts,
    };
  } finally {
    await page.close();
  }
}
