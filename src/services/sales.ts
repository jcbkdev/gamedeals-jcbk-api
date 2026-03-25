import { SteamSaleGame } from "../types/steam.types";
import { ScrapedDatabase } from "./scraped";
import { Steam } from "./steam";

export class SalesTracker {
  private static cachedSteamSales: SteamSaleGame[] = [];
  private static lastSteamFetchTime: number = 0;
  private static readonly CACHE_DURATION = 4 * 60 * 60 * 1000;

  // Added enableSteam parameter (defaults to true)
  static async getMergedSales(
    enableSteam: boolean = true,
  ): Promise<SteamSaleGame[]> {
    const now = Date.now();
    let steamSalesPromise: Promise<SteamSaleGame[]> = Promise.resolve([]);

    if (enableSteam) {
      if (
        this.cachedSteamSales.length > 0 &&
        now - this.lastSteamFetchTime < this.CACHE_DURATION
      ) {
        console.log(`[SalesTracker] Using CACHED Steam data`);
        steamSalesPromise = Promise.resolve(this.cachedSteamSales);
      } else {
        console.log(`[SalesTracker] Fetching FRESH data from Steam API...`);
        steamSalesPromise = Steam.fetchSales().then((sales) => {
          this.cachedSteamSales = sales;
          this.lastSteamFetchTime = Date.now();
          return sales;
        });
      }
    } else {
      console.log(`[SalesTracker] Steam API fetch is DISABLED. Skipping.`);
    }

    const dbSalesPromise = ScrapedDatabase.fetchSales();

    const [dbSales, steamSales] = await Promise.all([
      dbSalesPromise,
      steamSalesPromise,
    ]);

    const mergedMap = new Map<number, SteamSaleGame>();

    dbSales.forEach((game) => {
      mergedMap.set(game.id, game);
    });

    steamSales.forEach((game) => {
      mergedMap.set(game.id, game);
    });

    const finalArray = Array.from(mergedMap.values());
    console.log(
      `[SalesTracker] Merge complete! Total unique games: ${finalArray.length}`,
    );

    return finalArray;
  }
}
