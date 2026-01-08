import dotenv from "dotenv";
import cors from "cors";
import dotenvExpand from "dotenv-expand";
import express from "express";
import { getData } from "./services/gamerpower";
import { fetchDeals } from "./utils/fetchDeals";
import { checkActiveDeals, getAllDeals, getDeal, syncDeals } from "./db/db";
import { minToMs } from "./utils/minToMs";

dotenvExpand.expand(dotenv.config());
const app = express();

const allowedOrinings = ["https://gamedeals.jcbk.pl", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrinings.indexOf(origin) === -1) {
        let msg = `The CORS policy for this site does not allow access from the specified Origin.`;
        return callback(new Error(msg), false);
      }

      return callback(null, true);
    },
  })
);

app.get("/api/deals", async (req, res) => {
  const games = await getAllDeals();
  res.send(games);
});

app.get("/api/deal", async (req, res) => {
  const id = Number(req.get("x-id"));

  if (isNaN(id)) {
    res.sendStatus(400);
    return;
  }

  const game = await getDeal(id);

  if (!game) {
    res.sendStatus(400);
    return;
  }

  res.send(game);
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
