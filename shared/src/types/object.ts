export enum ObjectStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  ARCHIVED = "archived",
}

export enum StageType {
  REALTY = "realty",
  PROJECT = "project",
  FOUNDATION = "foundation",
  WALLS = "walls",
  ROOF = "roof",
  ENGINEERING = "engineering",
  FINISH = "finish",
  FURNITURE = "furniture",
}

export enum StageStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export type ObjectStage = {
  id: string;
  objectId: string;
  stageType: StageType;
  status: StageStatus;
  materialsRequest: string | null;
  buildersRequest: string | null;
  equipmentRequest: string | null;
};

export type ConstructionObject = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  currentStage: StageType;
  status: ObjectStatus;
  isVisible: boolean;
  createdAt: string;
  stages?: ObjectStage[];
  user?: {
    id: string;
    name: string;
    companyName: string | null;
    avatarUrl: string | null;
  };
};

export type CreateObjectPayload = {
  title: string;
  description?: string;
  stages: {
    stageType: StageType;
    materialsRequest?: string;
    buildersRequest?: string;
    equipmentRequest?: string;
  }[];
};
