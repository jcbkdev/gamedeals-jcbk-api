import { syncSales } from "../db/db";
import { SalesTracker } from "../services/sales";
import { minToMs } from "../utils/minToMs";
import { sleep } from "../utils/sleep";

export async function runSalesCycle() {
  console.log("Sales worker started");
  while (true) {
    console.log("starting sales cycle...");
    try {
      const sales = await SalesTracker.getMergedSales(false);
      if (sales.length === 0) {
        console.log("skipping sales cycle because of an empty array");
      } else {
        await syncSales(sales);
      }
    } catch (err) {
      console.error("sales cycle error", err);
    }
    console.log("sales cycle ended");

    await sleep(minToMs(10));
  }
}
