import { MongoClient, Sort } from "mongodb";
import { Game } from "../types/game.types";
import { Tag } from "../types/igdb.types";
import { IGDB } from "../services/igdb";
import { daysToMs } from "../utils/daysToMs";
import { getData } from "../services/gamerpower";
import { broadcastNotification } from "../services/notifications";
import { NOTIFICATION_PLATFORMS } from "../types/notification.types";
import { SteamSaleGame } from "../types/steam.types";
import { Steam } from "../services/steam";
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

// Deals

export async function saveDeal(deal: Game) {
  const db = await connectDb();

  const lowerMain = deal.main_platform.replace(" ", "").toLowerCase();

  const matchingEnum = () => {
    switch (lowerMain) {
      case "steam":
        return NOTIFICATION_PLATFORMS.steam;
      case "epicgames":
        return NOTIFICATION_PLATFORMS.epicGames;
      case "gog":
        return NOTIFICATION_PLATFORMS.gog;
    }
  };

  await db
    .collection("deals")
    .insertOne(deal)
    .then(async () => {
      console.log("Deal inserted: ", deal.name);
      await broadcastNotification(
        `🚨 Free game: ${deal.name}`,
        `Claim it now and keep it! Limited time offer.`,
        matchingEnum()!,
      );
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
        `Checking status of:\n\tid: ${deal.id}\n\tname: ${deal.name}`,
      );

      /**
       * check if the deal is still active
       * by checking if the deal is still present as active
       * fetched from GamerPower
       * on fail deactivate the deal
       */
      if (!gpData.find((gDeal) => gDeal.id === deal.id)) {
        console.log(
          `Deactivating deal: \n\tid: ${deal.id}\n\tname: ${deal.name}\n\treason: Deactivated by GP`,
        );
        await deactivateDeal(deal.id);
        return;
      }

      if (Number.isNaN(Date.parse(deal.end_date))) return;

      if (Date.parse(deal.end_date) < Date.now()) {
        console.log(
          `Deactivating deal: \n\tid: ${deal.id}\n\tname: ${deal.name}\n\treason: deal expired`,
        );
        await deactivateDeal(deal.id);
        return;
      }

      console.log(
        `Deal is still active\n\tid: ${deal.id}\n\tname: ${deal.name}`,
      );
    }),
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
    }),
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

// Sales
export async function saveSale(game: SteamSaleGame) {
  const db = await connectDb();

  await db
    .collection("steam_sales")
    .insertOne(game)
    .then(() => {
      console.log("Steam sale inserted: ", game.name);
    })
    .catch((err) => {
      console.error(
        "An error occured while trying to insert steam sale",
        game,
        err,
      );
    });
}

export async function updateSale(sale: SteamSaleGame, upsert: boolean = false) {
  const db = await connectDb();

  await db
    .collection("steam_sales")
    .updateOne({ id: sale.id }, { $set: { ...sale } }, { upsert: upsert })
    .then(() => {
      console.log("Sale updated: ", sale.id);
    })
    .catch((err) => {
      console.error("An error occured while updating a deal", sale.id, err);
    });
}

export async function getSale(sale_id: number) {
  const db = await connectDb();

  const query = { id: sale_id };

  const sale = await db.collection("steam_sales").findOne<SteamSaleGame>(query);

  return sale;
}

export async function getAllSales(
  onlyActive: boolean = true,
  byPercentage: boolean = true,
) {
  const db = await connectDb();

  const query = onlyActive ? { active: true } : {};
  const sortOptions: Sort = byPercentage ? { discount_percent: -1 } : {};

  const sales = await db
    .collection("steam_sales")
    .find<SteamSaleGame>(query)
    .sort(sortOptions)
    .toArray();

  return sales;
}

export async function getPaginatedSales(
  page: number = 0,
  onlyActive: boolean = true,
  byPercentage: boolean = true,
) {
  const PAGE_SIZE = 6;
  const db = await connectDb();

  const query = onlyActive ? { active: true } : {};
  const sortOptions: Sort = byPercentage ? { discount_percent: -1 } : {};

  const sales = await db
    .collection("steam_sales")
    .find<SteamSaleGame>(query)
    .sort(sortOptions)
    .skip(page * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .toArray();

  const hasMore = sales.length > PAGE_SIZE;

  if (hasMore) {
    sales.pop();
  }

  return {
    sales,
    hasMore,
  };
}

export async function checkActiveSales(onlyTime: boolean = false) {
  const sales = await getAllSales(true);
  let steamData: SteamSaleGame[] = [];
  if (!onlyTime) {
    steamData = await Steam.fetchSales();
  }

  await Promise.all(
    sales.map(async (sale) => {
      console.log(
        `Checking status of:\n\tid: ${sale.id}\n\tname: ${sale.name}`,
      );

      /**
       * check if the sale is still active
       * by checking if the sale is still present as active
       * fetched from Steam
       * on fail deactivate the deal
       */
      if (!onlyTime) {
        if (!steamData.find((sale) => sale.id === sale.id)) {
          console.log(
            `Deactivating sale: \n\tid: ${sale.id}\n\tname: ${sale.name}\n\treason: Deactivated by Steam or the Publisher`,
          );
          await deactivateSale(sale.id);
          return;
        }
      }

      if (sale.discount_expiration < Date.now()) {
        console.log(
          `Deactivating sale: \n\tid: ${sale.id}\n\tname: ${sale.name}\n\treason: sale expired`,
        );
        await deactivateSale(sale.id);
        return;
      }

      console.log(
        `Sale is still active\n\tid: ${sale.id}\n\tname: ${sale.name}`,
      );
    }),
  );
}

export async function syncSales(sales: SteamSaleGame[]) {
  const dbSales = await getAllSales(false);

  await Promise.all(
    sales.map(async (sale) => {
      const existingSale = dbSales.find((s) => s.id === sale.id);

      try {
        //If deal does not exist in the db
        if (!existingSale) {
          await saveSale(sale);
          return;
        }

        //If deal got activated
        if (!existingSale.active && sale.active) {
          await updateSale(sale);
          return;
        }

        //If deal exists in the db
        //Case where the end date is different
        if (
          existingSale.discount_expiration != sale.discount_expiration &&
          sale.active
        ) {
          await updateSale(sale);
          return;
        }

        if (existingSale.discount_expiration < Date.now()) {
          await deactivateSale(sale.id);
          return;
        }

        return;
      } catch (err) {
        console.error("An error occured while synchornizing sales", sale, err);
      }
    }),
  );

  await checkActiveSales();
  return;
}

export async function deactivateSale(sale_id: number) {
  let sale = await getSale(sale_id);

  if (!sale) return;

  sale.active = false;
  await updateSale(sale);
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

// Notifications

export async function saveSubscriber(token: string, platforms: string[]) {
  const db = await connectDb();

  await db
    .collection("subscribers")
    .updateOne(
      { token: token },
      {
        $set: {
          token: token,
          platforms: platforms,
          subscribedAt: new Date(),
        },
      },
      { upsert: true },
    )
    .then(() => console.log(`New subscriber added`))
    .catch((err) => console.error("Error adding subscribers", err));
}

export async function getAllSubscribers(): Promise<
  { token: string; platforms: string[] }[]
> {
  const db = await connectDb();

  const docs = await db
    .collection("subscribers")
    .find({}, { projection: { token: 1, platforms: 1 } })
    .toArray();

  return docs.map((d) => {
    return { token: d.token, platforms: d.platforms };
  });
}

export async function removeTokens(tokensToRemove: string[]) {
  const db = await connectDb();

  await db
    .collection("subscribers")
    .deleteMany({
      token: { $in: tokensToRemove },
    })
    .then(() => {
      console.log(`Cleaned up ${tokensToRemove.length} tokens`);
    })
    .catch((err) => console.error("Error removing tokens", err));
}

//close the connection on shutdown
const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];
signals.forEach((signal) =>
  process.on(signal, () => {
    if (client) {
      client.close();
    }

    process.exit();
  }),
);
