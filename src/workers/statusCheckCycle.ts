import { checkActiveDeals, checkActiveSales } from "../db/db";
import { minToMs } from "../utils/minToMs";
import { sleep } from "../utils/sleep";

export async function runStatusCheckCycle() {
  console.log("Status check worker started");
  while (true) {
    console.log("starting status checkup...");
    try {
      await checkActiveDeals();
      await checkActiveSales(true);
    } catch (err) {
      console.error("checkup error", err);
    }
    console.log("checkup ended");

    await sleep(minToMs(1));
  }
}
