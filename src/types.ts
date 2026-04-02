export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface FindOutItem {
  unknown: string;
  plan: string;
  checked: boolean;
}

export interface DecisionRow {
  date: string;
  decision: string;
  reasoning: string;
}

export interface TaskPlan {
  id: string;
  title: string;
  ticket: string;
  dateStarted: string;
  contextBucket: string;
  doneItems: ChecklistItem[];
  knowItems: string[];
  findOutItems: string[];
  chunkItems: ChecklistItem[];
  noteItems: string[];
  riskItems: string[];
  images: string[];
  decisions: DecisionRow[];
  actualTime: string;
  surprised: string;
  differently: string;
  createdAt: number;
  updatedAt: number;
}
