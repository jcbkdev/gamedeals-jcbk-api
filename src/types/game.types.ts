export type Game = {
  id: number;
  name: string;
  description: string;
  image: string;
  url: string;
  end_date: string;
  main_platform: string;
  platforms: string[];
  tags: string[];
  igdb_id?: number;
};
