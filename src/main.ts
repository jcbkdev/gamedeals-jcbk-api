import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import express from "express";
import { getData } from "./services/gamerpower";
import { fetchDeals } from "./utils/fetchDeals";
import { getAllDeals, syncDeals } from "./db/db";

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
}, 15 * 60 * 1000);

app.listen(process.env.PORT);
