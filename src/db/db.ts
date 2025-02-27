import { MongoClient } from "mongodb";
import { Game } from "../types/game.types";
import { Tag } from "../types/igdb.types";
import { IGDB } from "../services/igdb";
import { daysToMs } from "../utils/daysToMs";
import { getData } from "../services/gamerpower";
export let client: MongoClient | null = null;

async function connectDb() {
  const url = process.env.DATABASE_URL;

  if (!url)
    throw new Error("The URL to the database was not provided successfully");

  if (!client) {
    client = new MongoClient(url);

    try {
      await client.connect();
      console.log("Connected to MongoDB");
    } catch (error) {
      client = null; // Reset client if connection fails
      throw error;
    }
  }

  return client.db(process.env.MONGO_INITDB_DATABASE);
}

export async function saveDeal(deal: Game) {
  const db = await connectDb();

  await db
    .collection("deals")
    .insertOne(deal)
    .then(() => {
      console.log("Deal inserted: ", deal.name);
    })
    .catch((err) => {
      console.error("An error occured while trying to insert deal", deal, err);
    });
}

export async function updateDeal(deal: Game, upsert: boolean = false) {
  const db = await connectDb();

  await db
    .collection("deals")
    .updateOne({ id: deal.id }, { $set: { ...deal } }, { upsert: upsert })
    .then(() => {
      console.log("Deal updated: ", deal.id);
    })
    .catch((err) => {
      console.error("An error occured while updating a deal", deal.id, err);
    });
}

export async function checkActiveDeals() {
  const deals = await getAllDeals(true);
  const gpData = await getData();

  await Promise.all(
    deals.map(async (deal) => {
      console.log(
        `Checking status of:\n\tid: ${deal.id}\n\tname: ${deal.name}`
      );

      /**
       * check if the deal is still active
       * by checking if the deal is still present as active
       * fetched from GamerPower
       * on fail deactivate the deal
       */
      if (!gpData.find((gDeal) => gDeal.id === deal.id)) {
        console.log(
          `Deactivating deal: \n\tid: ${deal.id}\n\tname: ${deal.name}\n\treason: Deactivated by GP`
        );
        await deactivateDeal(deal.id);
        return;
      }

      if (Number.isNaN(Date.parse(deal.end_date))) return;

      if (Date.parse(deal.end_date) < Date.now()) {
        console.log(
          `Deactivating deal: \n\tid: ${deal.id}\n\tname: ${deal.name}\n\treason: deal expired`
        );
        await deactivateDeal(deal.id);
        return;
      }

      console.log(
        `Deal is still active\n\tid: ${deal.id}\n\tname: ${deal.name}`
      );
    })
  );
}

export async function syncDeals(deals: Game[]) {
  const dbDeals = await getAllDeals(false);

  await Promise.all(
    deals.map(async (deal) => {
      if (Number.isNaN(Date.parse(deal.end_date))) return;

      const existingDeal = dbDeals.find((d) => d.id === deal.id);

      try {
        //If deal does not exist in the db
        if (!existingDeal) {
          await saveDeal(deal);
          return;
        }

        //If deal got activated
        if (!existingDeal.active && deal.active) {
          await updateDeal(deal);
          return;
        }

        //If deal exists in the db
        //Case where the end date is different
        if (existingDeal.end_date != deal.end_date && deal.active) {
          await updateDeal(deal);
          return;
        }

        if (Date.parse(existingDeal.end_date) < Date.now()) {
          await deactivateDeal(deal.id);
          return;
        }

        return;
      } catch (err) {
        console.error("An error occured while synchornizing deals", deal, err);
      }
    })
  );

  await checkActiveDeals();
  return;
}

export async function getDeal(deal_id: number) {
  const db = await connectDb();

  const query = { id: deal_id };

  const deal = await db.collection("deals").findOne<Game>(query);

  return deal;
}

export async function getAllDeals(onlyActive: boolean = true) {
  const db = await connectDb();

  const query = onlyActive ? { active: true } : {};

  const deals = await db.collection("deals").find<Game>(query).toArray();

  return deals;
}

export async function removeDeal(deal_id: number) {
  const db = await connectDb();

  const query = { id: deal_id };

  const result = await db.collection("deals").deleteOne(query);

  return result.deletedCount === 1;
}

export async function deactivateDeal(deal_id: number) {
  let deal = await getDeal(deal_id);

  if (!deal) return;

  deal.active = false;
  await updateDeal(deal);
  return;
}

async function saveFetchDate(): Promise<void> {
  const db = await connectDb();
  const date = Date.now();

  await db
    .collection("fetchTime")
    .updateOne({ id: 0 }, { $set: { date: date } }, { upsert: true });
}

async function getFetchDate(): Promise<number | null> {
  const db = await connectDb();

  const result = await db
    .collection("fetchTime")
    .findOne<{ id: number; date: number }>({ id: 0 });

  if (result) return result.date;
  return null;
}

/**
 * Fetches the data from IGDB and then stores it in the DB
 * @returns Array of Tag[]
 */
async function fetchTags(): Promise<Tag[]> {
  const client = new IGDB(process.env.IGDB_ID!, process.env.IGDB_SECRET!);

  console.log("fetching tags...");
  const result = await client.getTags();

  if (!result) throw new Error("Could not receive tags");

  await saveFetchDate();

  const db = await connectDb();
  await db.collection("tags").insertMany(result);
  return result;
}

/**
 *
 * @returns Array of Tag[]
 */
export async function getTagLib(): Promise<Tag[]> {
  const db = await connectDb();

  const lastDate = await getFetchDate();
  let result;
  if (lastDate != null && lastDate + daysToMs(30) > Date.now()) {
    result = await db.collection("tags").find<Tag>({}).toArray();
  }

  if (!result || result.length === 0) result = await fetchTags();

  return result;
}

//close the connection on shutdown
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach((signal) =>
  process.on(signal, () => {
    if (client) {
      client.close();
    }

    process.exit();
  })
);
