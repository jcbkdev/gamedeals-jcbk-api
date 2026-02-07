import dotenv from "dotenv";
import cors from "cors";
import dotenvExpand from "dotenv-expand";
import express from "express";
import { fetchDeals } from "./utils/fetchDeals";
import {
  checkActiveDeals,
  checkActiveSales,
  getAllDeals,
  getAllSales,
  getDeal,
  getPaginatedSales,
  removeTokens,
  saveSubscriber,
  syncDeals,
  syncSales,
} from "./db/db";
import { minToMs } from "./utils/minToMs";
import { Steam } from "./services/steam";

dotenvExpand.expand(dotenv.config());
const app = express();
app.use(express.json());

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
  }),
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

app.get("/api/sales", async (req, res) => {
  let pag = Number(req.get("x-pag"));

  if (!pag) {
    pag = 0;
  } else if (isNaN(pag)) {
    res.sendStatus(400);
    return;
  }

  const sales = await getPaginatedSales(pag);
  res.send(sales);
});

app.post("/subscribe", async (req, res) => {
  try {
    const { token, platforms } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Valid FCM token is required" });
      return;
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      res.status(400).json({ error: "Platforms array is required" });
      return;
    }

    const validPlatforms = [
      { id: "check-steam", value: "Steam" },
      { id: "check-epicgames", value: "Epic Games" },
      { id: "check-gog", value: "GOG" },
    ];

    let _platforms: string[] = [];

    for (const platform of platforms) {
      const p = validPlatforms.find((p) => p.id === platform);
      if (p) {
        _platforms.push(p.value);
      }
    }

    if (_platforms.length !== platforms.length) {
      res.status(400).json({ error: "One or more platforms are invalid" });
      return;
    }

    await saveSubscriber(token, _platforms);

    res.status(200).json({ success: true, message: "Subscribed!" });
    return;
  } catch (error) {
    console.error("Subscription error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

app.post("/unsubscribe", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Valid FCM token is required" });
      return;
    }

    await removeTokens([token]);

    res.status(200).json({ success: true, message: "Unsubscribed!" });
    return;
  } catch (error) {
    console.error("Unsubscribing error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});

setInterval(async () => {
  console.log("starting deals cycle...");
  try {
    const deals = await fetchDeals();
    if (deals.length === 0) {
      console.log("skipping deals cycle beacuse of an empty array");
    } else {
      await syncDeals(deals);
    }
  } catch (err) {
    console.error("sales cycle error", err);
  }
  console.log("deals cycle ended");
}, minToMs(15));

setInterval(
  async () => {
    console.log("starting sales cycle...");
    try {
      const sales = await Steam.fetchSales();
      if (sales.length === 0) {
        console.log("skipping sales cycle because of an empty array");
      } else {
        await syncSales(sales);
      }
    } catch (err) {
      console.error("deals cycle error", err);
    }
  },
  minToMs(4 * 60, true),
);

setInterval(async () => {
  console.log("starting status checkup...");
  try {
    await checkActiveDeals();
    await checkActiveSales(true);
  } catch (err) {
    console.error("checkup error", err);
  }
  console.log("checkup ended");
}, minToMs(1));

app.listen(process.env.PORT);
