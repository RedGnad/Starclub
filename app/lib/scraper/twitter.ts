import puppeteer, { Browser } from "puppeteer";

export interface ScraperResult {
  username: string;
  success: boolean;
  followersCount?: number | string;
  error?: string;
}

/**
 * Extract username from Twitter URL
 * https://x.com/Balancer -> Balancer
 * https://twitter.com/Balancer -> Balancer
 */
function extractUsername(urlOrUsername: string): string {
  if (
    urlOrUsername.includes("twitter.com") ||
    urlOrUsername.includes("x.com")
  ) {
    const match = urlOrUsername.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
    return match ? match[1] : urlOrUsername;
  }
  return urlOrUsername.replace("@", "");
}

/**
 * Parse follower count text to number
 * Rules:
 * - "16.2K Followers" -> 16200 (point before K/M/B = decimal)
 * - "2,552 Followers" -> 2552 (comma/space = thousand separator)
 */
function parseFollowerCount(text: string): number | null {
  console.log(`    🔍 Parsing: "${text}"`);

  // Remove "Followers" or "abonnés" (French)
  let cleaned = text.replace(/Followers?|abonnés?/gi, "").trim();
  console.log(`    📝 After removing text: "${cleaned}"`);

  // Check if there's a K/M/B suffix
  const hasSuffix = /[KMB]/i.test(cleaned);
  console.log(`    🏷️  Has suffix: ${hasSuffix}`);

  if (hasSuffix) {
    // Rule 1: With K/M/B, keep decimal point
    // "16.2K" -> 16.2 * 1000, "154,9 k" -> 154.9 * 1000
    cleaned = cleaned.replace(/[,\s](\d{1,2})\s*([KMB])/i, ".$1$2");
    cleaned = cleaned.replace(/\s+/g, "");
  } else {
    // Rule 2: Without K/M/B, remove ALL separators (comma, space, non-breaking space, etc.)
    // "2,552" -> 2552, "8 408" -> 8408
    console.log(`    🔧 Removing ALL separators...`);
    console.log(
      `    🔍 Character codes: ${Array.from(cleaned)
        .map((c) => `${c}(${c.charCodeAt(0)})`)
        .join(" ")}`
    );
    cleaned = cleaned.replace(/[,\s\u00A0\u202F\u2009\u200A]+/g, ""); // All possible space types
    console.log(`    📝 After cleaning: "${cleaned}"`);
  }

  const match = cleaned.match(/([\d.]+)\s*([KMB])?/i);
  if (!match) {
    console.log(`    ❌ No match found!`);
    return null;
  }

  console.log(
    `    ✅ Matched: number="${match[1]}", suffix="${match[2] || "none"}"`
  );

  const number = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();

  let result: number;
  switch (suffix) {
    case "K":
      result = Math.round(number * 1000);
      break;
    case "M":
      result = Math.round(number * 1000000);
      break;
    case "B":
      result = Math.round(number * 1000000000);
      break;
    default:
      result = Math.round(number);
  }

  console.log(`    🎯 Final result: ${result}`);
  return result;
}

/**
 * Scrape single account with existing browser
 */
async function scrapeAccount(
  browser: Browser,
  username: string
): Promise<ScraperResult> {
  const cleanUsername = extractUsername(username);
  const url = `https://x.com/${cleanUsername}`;

  console.log(`  🔍 Scraping @${cleanUsername}...`);

  try {
    const page = await browser.newPage();

    // Optimizations
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 720 });

    // Block images and media to speed up loading
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "media", "font", "stylesheet"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate with reasonable timeout
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Try selectors - get the PARENT link element, not individual spans
    const possibleSelectors = [
      'a[href$="/verified_followers"]',
      'a[href$="/followers"]',
      '[data-testid="primaryColumn"] a[href*="followers"]',
    ];

    let followersText = null;

    for (const selector of possibleSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          // Get the full text content of the link (includes all child spans)
          const text = await page.evaluate(
            (el) => el.textContent?.trim(),
            element
          );
          console.log(
            `    📄 Found text for selector "${selector}": "${text}"`
          );
          if (
            text &&
            (text.includes("Followers") ||
              text.includes("abonnés") ||
              /[\d,\s]+(\.\d+)?[KMB]?\s*(Followers?|abonnés?)/i.test(text))
          ) {
            followersText = text;
            console.log(`    ✅ Selected follower text: "${followersText}"`);
            break;
          }
        }
        if (followersText) break;
      } catch (err) {
        console.log(`    ⚠️  Error with selector "${selector}": ${err}`);
        // Continue to next selector
      }
    }

    await page.close();

    if (followersText) {
      // Remove "Followers" or "abonnés" and keep just the number part
      const cleanedCount = followersText
        .replace(/\s*(Followers?|abonnés?)\s*/gi, "")
        .trim();
      console.log(
        `    ✅ @${cleanUsername}: ${cleanedCount} (from "${followersText}")`
      );
      return {
        username: cleanUsername,
        success: true,
        followersCount: cleanedCount,
      };
    } else {
      console.log(`    ⚠️  @${cleanUsername}: Follower count not found`);
      return {
        username: cleanUsername,
        success: false,
        error: "Follower count not found",
      };
    }
  } catch (error) {
    console.log(
      `    ⚠️  @${cleanUsername}: ${error instanceof Error ? error.message : "Error"}`
    );
    return {
      username: cleanUsername,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Scrape multiple accounts in batches
 * @param accounts - Array of Twitter URLs or usernames
 * @param batchSize - Number of concurrent scrapes (default: 3)
 * @param delayBetweenBatches - Delay in ms between batches (default: 2000)
 */
export async function scrapeTwitterFollowers(
  accounts: string[],
  batchSize: number = 5, // Balance between speed and reliability
  delayBetweenBatches: number = 1500 // Balance between avoiding rate limits and speed
): Promise<ScraperResult[]> {
  if (accounts.length === 0) {
    return [];
  }

  console.log(`🚀 Starting Twitter scrape of ${accounts.length} accounts`);
  console.log(`   Batch size: ${batchSize}, Delay: ${delayBetweenBatches}ms\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });

  const results: ScraperResult[] = [];

  try {
    // Process in batches
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);
      console.log(
        `📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(accounts.length / batchSize)}`
      );

      // Scrape batch in parallel
      const batchResults = await Promise.all(
        batch.map((account) => scrapeAccount(browser, account))
      );

      results.push(...batchResults);

      // Delay between batches to avoid rate limiting
      if (i + batchSize < accounts.length) {
        console.log(
          `   ⏳ Waiting ${delayBetweenBatches}ms before next batch...\n`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    }
  } finally {
    await browser.close();
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `\n✅ Twitter scraping complete: ${successCount}/${results.length} successful\n`
  );

  return results;
}
