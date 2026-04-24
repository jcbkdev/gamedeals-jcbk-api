import { syncDeals } from "../db/db";
import { fetchDeals } from "../utils/fetchDeals";
import { minToMs } from "../utils/minToMs";
import { sleep } from "../utils/sleep";

export async function runDealsCycle() {
  console.log("Deals worker started");
  while (true) {
    console.log("starting deals cycle...");
    try {
      const deals = await fetchDeals();
      if (deals.length === 0) {
        console.log("skipping deals cycle beacuse of an empty array");
      } else {
        await syncDeals(deals);
      }
    } catch (err) {
      console.error("deals cycle error", err);
    }
    console.log("deals cycle ended");

    await sleep(minToMs(15));
  }
}
