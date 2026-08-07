import { useMemo, useState, useEffect, useCallback } from 'react';
import { Download, AlertTriangle, Package, SlidersHorizontal, ArrowRightLeft, History, RefreshCw, Warehouse, ServerCrash, Layers, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import IconBtn from '../../components/ui/IconBtn';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';

interface InventoryHistoryEntry {
  type: 'order' | 'restock' | 'adjustment' | 'cancel' | 'refund' | 'sale';
  quantity: number;
  reason?: string;
  orderId?: string;
  date?: string;
}

interface InventoryItem {
  _id: string;
  productId: string | { _id: string; name: string; images: Array<{ url: string }>; variants?: Array<{ id: string; name?: string; sku?: string; stock?: number }> };
  variantId?: string;
  sku: string;
  quantity: number;
  reserved: number;
  location?: { warehouse?: string; aisle?: string; shelf?: string; bin?: string } | string;
  reorderPoint: number;
  maxStockLevel?: number;
  cost?: number;
  lastUpdated: string;
  history?: InventoryHistoryEntry[];
  product?: { name: string; images: Array<{ url: string }>; variants?: Array<{ id: string; name?: string; sku?: string; stock?: number }> };
}

interface InventoryResponse {
  data: InventoryItem[];
  pagination?: { total: number; page: number; pages: number; limit: number };
}

const warehouseOf = (item: InventoryItem): string => {
  const location = item.location;
  if (location && typeof location === 'object' && typeof location.warehouse === 'string') return location.warehouse;
  return 'Main';
};

const productNameOf = (item: InventoryItem): string => {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : item.product;
  return product?.name || 'Unknown Product';
};

const productImageOf = (item: InventoryItem): string => {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : item.product;
  return product?.images?.[0]?.url || '';
};

const variantsOf = (item: InventoryItem): Array<{ id: string; name?: string; sku?: string; stock?: number }> => {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : item.product;
  return product?.variants ?? [];
};

const stockTotals = (item: InventoryItem) => {
  let incoming = 0;
  let outgoing = 0;
  for (const entry of item.history ?? []) {
    const qty = Number(entry.quantity) || 0;
    if (qty > 0) incoming += qty;
    else outgoing += Math.abs(qty);
  }
  return { incoming, outgoing };
};

const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');

function formatHistoryDate(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

const HISTORY_LABEL: Record<InventoryHistoryEntry['type'], string> = {
  order: 'Order',
  restock: 'Restock',
  adjustment: 'Adjustment',
  cancel: 'Cancellation',
  refund: 'Refund',
  sale: 'Sale',
};

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [transferring, setTransferring] = useState<InventoryItem | null>(null);
  const [transferQty, setTransferQty] = useState<number>(0);
  const [transferWarehouse, setTransferWarehouse] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<InventoryResponse>('/inventory', { params: { limit: 100 } });
      setInventory(response.data.data || []);
    } catch (error) {
      const message = getApiError(error, 'Failed to fetch inventory');
      setError(message);
      console.error('[Inventory] failed to load', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const openAdjust = (item: InventoryItem) => {
    setEditing(item);
    setQty(item.quantity);
    setReason('');
  };

  const saveAdjust = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await api.put(`/inventory/${editing._id}`, { quantity: qty, reason: reason.trim() || 'Manual adjustment' });
      toast.success('Stock updated — history recorded and product stock synced');
      setEditing(null);
      void fetchInventory();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update stock'));
    } finally {
      setSaving(false);
    }
  };

  const openTransfer = (item: InventoryItem) => {
    setTransferring(item);
    setTransferQty(item.quantity);
    setTransferWarehouse('');
    setTransferNote('');
  };

  const warehouses = useMemo(() => {
    const set = new Set<string>(inventory.map((item) => warehouseOf(item)).filter(Boolean));
    return Array.from(set).sort();
  }, [inventory]);

  const saveTransfer = async () => {
    if (!transferring) return;
    try {
      setSaving(true);
      await api.put(`/inventory/${transferring._id}/transfer`, {
        quantity: transferQty,
        targetWarehouse: transferWarehouse.trim(),
        note: transferNote.trim() || undefined,
      });
      toast.success('Stock transferred — both warehouses and product stock updated');
      setTransferring(null);
      void fetchInventory();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to transfer stock'));
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const name = productNameOf(item);
      const matchesSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'low') return item.quantity <= item.reorderPoint && item.quantity > 0;
      if (filter === 'out') return item.quantity === 0;
      return true;
    });
  }, [inventory, searchQuery, filter]);

  const lowStockCount = inventory.filter((item) => item.quantity <= item.reorderPoint && item.quantity > 0).length;
  const outOfStockCount = inventory.filter((item) => item.quantity === 0).length;
  const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);

  const exportCsv = (rows: InventoryItem[]) => {
    const list = rows.length > 0 ? rows : filteredInventory;
    const csvRows = [
      ['SKU', 'Product', 'Warehouse', 'Quantity', 'Reserved', 'Available', 'Incoming', 'Outgoing', 'Reorder Point', 'Status', 'Last Updated'],
      ...list.map((item) => {
        const available = item.quantity - item.reserved;
        const totals = stockTotals(item);
        const status = item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.reorderPoint ? 'Low Stock' : 'In Stock';
        return [
          item.sku,
          productNameOf(item),
          warehouseOf(item),
          String(item.quantity),
          String(item.reserved),
          String(available),
          String(totals.incoming),
          String(totals.outgoing),
          String(item.reorderPoint),
          status,
          item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '',
        ];
      }),
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(rows.length > 0 ? `${rows.length} items exported` : 'Inventory exported');
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size > 0) return new Set<string>();
      return new Set(filteredInventory.map((item) => item._id));
    });
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'product',
      header: 'Product',
      sortKey: 'product',
      render: (item) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
            {productImageOf(item) ? (
              <img src={productImageOf(item)} alt="" className="w-10 h-10 object-cover rounded-md" />
            ) : (
              <Package className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {productNameOf(item)}
          </span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      sortKey: 'sku',
      render: (item) => <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{item.sku}</span>,
    },
    {
      key: 'variants',
      header: 'Variants',
      sortKey: 'variants',
      render: (item) => {
        const variants = variantsOf(item);
        if (variants.length === 0) return <span className="text-slate-400 text-sm">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{variants.length}</span>
          </div>
        );
      },
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      sortKey: 'warehouse',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {warehouseOf(item)}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortKey: 'quantity',
      render: (item) => <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{item.quantity}</span>,
    },
    {
      key: 'reserved',
      header: 'Reserved',
      sortKey: 'reserved',
      render: (item) => <span className="tabular-nums text-slate-600 dark:text-slate-400">{item.reserved}</span>,
    },
    {
      key: 'available',
      header: 'Available',
      sortKey: 'available',
      render: (item) => (
        <span className={`font-medium tabular-nums ${item.quantity - item.reserved <= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {Math.max(0, item.quantity - item.reserved)}
        </span>
      ),
    },
    {
      key: 'incoming',
      header: 'Incoming',
      sortKey: 'incoming',
      render: (item) => {
        const totals = stockTotals(item);
        return (
          <span className="inline-flex items-center gap-1 text-sm tabular-nums text-slate-600 dark:text-slate-400">
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
            {totals.incoming}
          </span>
        );
      },
    },
    {
      key: 'outgoing',
      header: 'Outgoing',
      sortKey: 'outgoing',
      render: (item) => {
        const totals = stockTotals(item);
        return (
          <span className="inline-flex items-center gap-1 text-sm tabular-nums text-slate-600 dark:text-slate-400">
            <ArrowUpFromLine className="w-3.5 h-3.5 text-red-500" />
            {totals.outgoing}
          </span>
        );
      },
    },
    {
      key: 'reorderPoint',
      header: 'Reorder Point',
      sortKey: 'reorderPoint',
      render: (item) => <span className="tabular-nums text-slate-600 dark:text-slate-400">{item.reorderPoint}</span>,
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      sortKey: 'lastUpdated',
      render: (item) => <span className="text-xs text-slate-400">{fmtDate(item.lastUpdated)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (item) => {
        if (item.quantity === 0) return <Badge tone="red">Out of Stock</Badge>;
        if (item.quantity <= item.reorderPoint) return <Badge tone="amber">Low Stock</Badge>;
        return <Badge tone="green">In Stock</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[150px]',
      noChooser: true,
      render: (item) => (
        <div className="flex items-center gap-1">
          <IconBtn title="Adjust stock" onClick={() => openAdjust(item)}>
            <SlidersHorizontal className="w-4 h-4" />
          </IconBtn>
          <IconBtn title="Transfer stock" onClick={() => openTransfer(item)}>
            <ArrowRightLeft className="w-4 h-4" />
          </IconBtn>
          <IconBtn title="History" onClick={() => setHistoryItem(item)}>
            <History className="w-4 h-4" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Inventory"
      subtitle="Track and manage your stock levels"
      breadcrumbs={[{ label: 'Inventory' }]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => exportCsv([])} className="admin-btn-secondary h-10 px-4 text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => void fetchInventory()} className="admin-btn-secondary h-10 px-4 text-sm flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Stock Lines"
          value={inventory.length}
          icon={<Package className="w-6 h-6" />}
          iconClass="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        />
        <StatCard
          label="Total Units"
          value={totalUnits.toLocaleString()}
          icon={<Warehouse className="w-6 h-6" />}
          iconClass="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          label="Low Stock"
          value={lowStockCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          iconClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          label="Out of Stock"
          value={outOfStockCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          iconClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        />
      </div>

      {error && !loading && (
        <div className="mt-6 admin-card border-red-200 dark:border-red-900/50">
          <EmptyState
            icon={<ServerCrash className="w-6 h-6" />}
            title="Could not load inventory"
            body={error}
            action={
              <button onClick={() => void fetchInventory()} className="admin-btn-primary h-10 px-5 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        </div>
      )}

      {!error && (
        <DataTable
          columns={columns}
          rows={filteredInventory}
          rowKey={(item) => item._id}
          loading={loading}
          searchable
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by SKU or product name..."
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          bulkActions={
            <button onClick={() => exportCsv(inventory.filter((item) => selected.has(item._id)))} className="admin-btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export selected
            </button>
          }
          filters={
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="admin-input !w-auto h-10 text-sm"
            >
              <option value="all">All Items</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          }
          clientPagination
          pageSize={10}
          emptyTitle="No inventory items found"
          emptyBody="Try adjusting your search or filters."
        />
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Adjust Stock"
        footer={
          <>
            <button onClick={() => setEditing(null)} className="admin-btn-secondary h-9 px-4 text-sm">Cancel</button>
            <button onClick={saveAdjust} disabled={saving} className="admin-btn-primary h-9 px-4 text-sm">
              {saving ? 'Saving...' : 'Save Adjustment'}
            </button>
          </>
        }
      >
        {editing && (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{productNameOf(editing)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{editing.sku}</p>
              <p className="text-xs text-slate-400">
                {warehouseOf(editing)} · Current quantity: {editing.quantity} · Reserved: {editing.reserved} · Reorder point: {editing.reorderPoint}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New quantity</label>
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="admin-input"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Received restock, damaged units removed…"
                className="admin-input"
              />
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!transferring}
        onClose={() => setTransferring(null)}
        title="Transfer Stock"
        footer={
          <>
            <button onClick={() => setTransferring(null)} className="admin-btn-secondary h-9 px-4 text-sm">Cancel</button>
            <button
              onClick={saveTransfer}
              disabled={saving || !transferring || !transferWarehouse.trim() || transferQty <= 0}
              className="admin-btn-primary h-9 px-4 text-sm"
            >
              {saving ? 'Transferring...' : 'Transfer Stock'}
            </button>
          </>
        }
      >
        {transferring && (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{productNameOf(transferring)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{transferring.sku}</p>
              <p className="text-xs text-slate-400">
                Source: {warehouseOf(transferring)} · Available: {Math.max(0, transferring.quantity - transferring.reserved)}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity to transfer</label>
              <input
                type="number"
                min={1}
                max={Math.max(0, transferring.quantity)}
                value={transferQty}
                onChange={(e) => setTransferQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="admin-input"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Target warehouse</label>
              <input
                type="text"
                value={transferWarehouse}
                onChange={(e) => setTransferWarehouse(e.target.value)}
                placeholder={warehouseOf(transferring) === 'Main' ? 'e.g. Boutique' : 'e.g. Main'}
                className="admin-input"
                list="inventory-warehouses"
              />
              {warehouses.length > 1 && (
                <datalist id="inventory-warehouses">
                  {warehouses.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              )}
              <p className="text-xs text-slate-400 mt-1">Stock is moved to the target warehouse; a new ledger line is created if needed.</p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Note (optional)</label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="e.g. Restock the boutique for the weekend"
                className="admin-input"
              />
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!historyItem}
        onClose={() => setHistoryItem(null)}
        title={`Stock History — ${historyItem ? productNameOf(historyItem) : ''}`}
        wide
      >
        {historyItem && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-mono">{historyItem.sku}</span>
              <span>·</span>
              <span>{warehouseOf(historyItem)}</span>
              <span>·</span>
              <span>Current: <span className="font-medium text-slate-800 dark:text-slate-200">{historyItem.quantity}</span></span>
              <span>·</span>
              <span>Reserved: <span className="font-medium text-slate-800 dark:text-slate-200">{historyItem.reserved}</span></span>
            </div>
            {(historyItem.history ?? []).length === 0 ? (
              <EmptyState title="No transactions yet" body="Stock adjustments, orders and transfers will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-th">Date</th>
                      <th className="admin-th">Type</th>
                      <th className="admin-th">Change</th>
                      <th className="admin-th">Reason</th>
                      <th className="admin-th">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(historyItem.history ?? [])]
                      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
                      .map((entry, idx) => {
                        const change = Number(entry.quantity) || 0;
                        return (
                          <tr key={idx} className="admin-tr">
                            <td className="admin-td whitespace-nowrap">{formatHistoryDate(entry.date)}</td>
                            <td className="admin-td">
                              <Badge tone={change > 0 ? 'green' : change < 0 ? 'red' : 'slate'}>
                                {HISTORY_LABEL[entry.type] ?? entry.type}
                              </Badge>
                            </td>
                            <td className={`admin-td font-medium tabular-nums ${change > 0 ? 'text-emerald-600 dark:text-emerald-400' : change < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                              {change > 0 ? `+${change}` : change}
                            </td>
                            <td className="admin-td text-sm text-slate-600 dark:text-slate-300">{entry.reason || '—'}</td>
                            <td className="admin-td font-mono text-xs text-slate-400">{entry.orderId ? String(entry.orderId).slice(0, 8) : '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>
    </PageShell>
  );
}
