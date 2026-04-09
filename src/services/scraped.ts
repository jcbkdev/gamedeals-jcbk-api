import mysql from "mysql2/promise";
import { SteamSaleGame } from "../types/steam.types";
import { Steam } from "./steam";
import { isatty } from "tty";

export class ScrapedDatabase {
  static async fetchSales(): Promise<SteamSaleGame[]> {
    try {
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DB,
      });

      const [rows] = await connection.execute(
        `SELECT appid, name, discount_percent, sale_end_date, header_image 
   FROM active_sales 
   WHERE review_percentage >= 65 AND review_count > 1000`,
      );

      await connection.end();

      const dbRows = rows as any[];

      const mapPromise = dbRows.map(async (row) => {
        const expirationMs = row.sale_end_date ? row.sale_end_date * 1000 : 0;

        const isActive = expirationMs > Date.now();

        const game: SteamSaleGame = {
          id: row.appid,
          name: row.name,
          discount_expiration: expirationMs,
          discount_percent: row.discount_percent,
          url: `https://store.steampowered.com/app/${row.appid}/`,
          image: await Steam.getImage(row.header_image),
          active: isActive,
        };
        return game;
      });

      const filtered = (await Promise.all(mapPromise)) as SteamSaleGame[];
      return filtered;
    } catch (err) {
      console.error("Scraped database fetch error:", err);
      return [];
    }
  }
}
