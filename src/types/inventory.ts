import type { BranchSummary } from "./branch";

export type InventoryProductSummary = { id: number; name: string; sku: string | null; is_active: boolean };
export type InventoryVariantSummary = { id: number; product_id: number; name: string; sku: string | null; is_active: boolean; product?: InventoryProductSummary | null };
export type InventoryItem = { id: number; product_id: number | null; product_variant_id: number | null; product?: InventoryProductSummary | null; product_variant?: InventoryVariantSummary | null };
export type InventoryCatalogVariant = { id: number; product_id: number; name: string; display_name?: string | null; sku: string | null; is_active: boolean };
export type InventoryCatalogProduct = { id: number; name: string; sku: string | null; is_active: boolean; variants?: InventoryCatalogVariant[] };
export type InventoryCatalog = { products: InventoryCatalogProduct[] };
export type InventoryStockStatus = "normal" | "low" | "out";

export type InventoryStock = {
  id: number; branch_id: number; inventory_item_id: number; product_id: number; product_variant_id: number | null;
  type: "product" | "variant"; branch: BranchSummary | null; product: InventoryProductSummary | null;
  product_variant: InventoryVariantSummary | null; quantity: number; minimum_quantity: number;
  is_low_stock: boolean; status: InventoryStockStatus; created_at: string; updated_at: string;
};

export type LaravelPaginator<T> = {
  current_page: number; data: T[]; last_page: number; per_page: number; total: number;
  from?: number | null; to?: number | null; next_page_url?: string | null; prev_page_url?: string | null;
};

export type InventoryStockFilters = { branch_id?: number; product_id?: number; product_variant_id?: number; search?: string; low_stock?: boolean; page?: number; per_page?: number };
export type ManualInventoryMovementType = "entry" | "exit" | "adjustment";
export type InventoryMovementType = ManualInventoryMovementType | "sale" | "sale_reversal" | "transfer_out" | "transfer_in";

export type InventoryMovement = {
  id: number; product_id: number; product_variant_id: number | null; branch_id: number | null; inventory_item_id: number | null;
  inventory_transfer_item_id: number | null; type: InventoryMovementType; quantity_delta: number; stock_before: number;
  stock_after: number; reason: string | null; notes: string | null; created_by: number | null;
  reference_type: string | null; reference_id: number | null; created_at: string; updated_at: string;
  branch?: BranchSummary | null; inventory_item?: InventoryItem | null; product?: InventoryProductSummary | null;
  product_variant?: InventoryVariantSummary | null; creator?: { id: number; name: string; email?: string } | null;
};

export type InventoryMovementFilters = { branch_id?: number; inventory_item_id?: number; product_id?: number; product_variant_id?: number; type?: InventoryMovementType };
export type InventoryMovementPayload = { branch_id: number; product_id: number; product_variant_id?: number | null; type: ManualInventoryMovementType; quantity?: number | null; new_stock?: number | null; reason: string; notes?: string | null };
export type UpdateInventoryMinimumPayload = { branch_id: number; product_id: number; product_variant_id?: number | null; minimum_quantity: number };

export type InventoryTransferStatus = "requested" | "in_transit" | "received" | "cancelled";
export type InventoryTransferItem = {
  id: number; inventory_item_id: number; product_id: number; product_variant_id: number | null;
  product_name_snapshot: string; variant_name_snapshot: string | null; sku_snapshot: string | null; quantity: number;
  product: InventoryProductSummary | null; product_variant: InventoryVariantSummary | null;
};
export type InventoryTransferActor = { id: number; name: string };
export type InventoryTransfer = {
  id: number; number: string; status: InventoryTransferStatus; source_branch_id: number; destination_branch_id: number;
  requested_by: number; dispatched_by: number | null; received_by: number | null; cancelled_by: number | null;
  requested_at: string; dispatched_at: string | null; received_at: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; notes: string | null; created_at: string; updated_at: string;
  source_branch: BranchSummary | null; destination_branch: BranchSummary | null; items: InventoryTransferItem[];
  requester: InventoryTransferActor | null; dispatcher: InventoryTransferActor | null; receiver: InventoryTransferActor | null; canceller: InventoryTransferActor | null;
};
export type InventoryTransferFilters = { status?: InventoryTransferStatus; source_branch_id?: number; destination_branch_id?: number; branch_id?: number; from?: string; to?: string; search?: string; page?: number; per_page?: number };
export type CreateInventoryTransferPayload = { source_branch_id: number; destination_branch_id: number; items: Array<{ product_id: number; product_variant_id?: number | null; quantity: number }>; notes?: string | null; client_request_key: string };
