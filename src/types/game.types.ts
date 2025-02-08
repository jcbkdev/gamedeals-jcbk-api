export type Game = {
  id: number;
  name: string;
  description: string;
  images: string[];
  url: string;
  end_date: string;
  main_platform: string;
  platforms: string[];
  tags: string[];
  active: boolean;
  igdb_id?: number;
};
