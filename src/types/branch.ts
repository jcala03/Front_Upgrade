export type BranchSummary = {
  id: number;
  code: string;
  name: string;
  city: string;
  is_active: boolean;
};

export type Branch = BranchSummary & {
  slug: string;
  created_at: string;
  updated_at: string;
};

export type BranchPaginator = {
  current_page: number;
  data: Branch[];
  per_page: number;
  total: number;
  last_page?: number;
};

export type CreateBranchPayload = {
  code: string;
  name: string;
  city: string;
};

export type UpdateBranchPayload = {
  name?: string;
  city?: string;
  is_active?: boolean;
};
