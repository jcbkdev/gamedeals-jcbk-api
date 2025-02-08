import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import express from "express";
import { getData } from "./services/gamerpower";
import { fetchDeals } from "./utils/fetchDeals";
import { checkActiveDeals, getAllDeals, syncDeals } from "./db/db";
import { minToMs } from "./utils/minToMs";

dotenvExpand.expand(dotenv.config());

const app = express();

app.get("/api/deals", async (req, res) => {
  const games = await getAllDeals();
  res.send(games);
});

setInterval(async () => {
  console.log("starting cycle...");
  try {
    const deals = await fetchDeals();
    if (deals.length === 0) {
      console.log("skipping cycle beacuse of an empty array");
    } else {
      await syncDeals(deals);
    }
  } catch (err) {
    console.error("cycle error", err);
  }
  console.log("cycle ended");
}, minToMs(15));

setInterval(async () => {
  console.log("starting status checkup...");
  try {
    await checkActiveDeals();
  } catch (err) {
    console.error("checkup error", err);
  }
  console.log("checkup ended");
}, minToMs(1));

app.listen(process.env.PORT);
