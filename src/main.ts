import express from "express";
import { getData } from "./services/gamerpower";
const app = express();

app.get("/api/deals", async (req, res) => {
  const games = await getData();
  res.send(games);
});

app.listen(3000);
