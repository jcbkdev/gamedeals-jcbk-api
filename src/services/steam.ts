import axios from "axios";
import { SaleItem, SteamSaleGame, SteamSales } from "../types/steam.types";

export class Steam {
  private static getUrl(saleItem: SaleItem) {
    const prefix = "https://store.steampowered.com/";
    let url = "";
    switch (saleItem.type) {
      case 0:
        url = prefix + "app/" + saleItem.id + "/";
        break;
      case 1:
        url = prefix + "sub/" + saleItem.id + "/";
        break;
      default:
        break;
    }

    return url;
  }

  public static async getImage(url: string) {
    const response = await axios
      .get(url, { responseType: "arraybuffer" })
      .catch((err) => {
        throw new Error(err);
      });

    return response.data;
  }

  static async fetchSales(): Promise<SteamSaleGame[]> {
    const url = "https://store.steampowered.com/api/featuredcategories";
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const response = await axios.get(url, { headers: headers }).catch((err) => {
      throw new Error(err);
    });

    const sales: SteamSales | undefined = response.data.specials;
    if (!sales) {
      console.log("No sales");
      return [];
    }

    const mapPromise = sales.items.map(async (item) => {
      const url = this.getUrl(item);

      if (url.length == 0) {
        return;
      }

      const game: SteamSaleGame = {
        id: item.id,
        name: item.name,
        discount_expiration: item.discount_expiration * 1000,
        discount_percent: item.discount_percent,
        url: url,
        image: await this.getImage(item.header_image),
        active: true,
      };

      return game;
    });

    const filtered = (await Promise.all(mapPromise)) as SteamSaleGame[];

    return filtered;
  }
}
