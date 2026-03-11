export enum CategoryType {
  BUILDERS = "builders",
  MATERIALS = "materials",
  LAND = "land",
  EQUIPMENT = "equipment",
}

export type Category = {
  id: number;
  name: string;
  parentId: number | null;
  icon: string | null;
  type: CategoryType;
  children?: Category[];
};
