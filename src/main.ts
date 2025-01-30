import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import express from "express";
import { getData } from "./services/gamerpower";

dotenvExpand.expand(dotenv.config());

const app = express();

app.get("/api/deals", async (req, res) => {
  const games = await getData();
  res.send(games);
});

app.listen(3000);
