"use client";

import {
  BarChart3,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  Edit3,
  PackagePlus,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

type CartLine = {
  product: Product;
  quantity: number;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
};

type Sale = {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
  sale_items: SaleItem[];
};

type ActiveTab = "pos" | "artigos" | "relatorios";
type PrintMode = "tickets" | "report" | null;

const paymentMethods = [
  { value: "numerario", label: "Numerário" },
  { value: "mbway", label: "MB Way" },
  { value: "cartao", label: "Cartão" }
];

const emptyProductForm = {
  name: "",
  price: "",
  category: "",
  active: true
};

function localDateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function dateRangeForInput(dateString: string) {
  const start = new Date(`${dateString}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function parsePrice(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function paymentLabel(value: string) {
  return paymentMethods.find((method) => method.value === value)?.label ?? value;
}

function friendlySupabaseError(message: string) {
  if (message.includes("schema cache") || message.includes("Could not find the table")) {
    return "Base de dados sem tabelas. Executa supabase/schema.sql no SQL Editor da Supabase.";
  }

  return message;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pos");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [paymentMethod, setPaymentMethod] = useState("numerario");
  const [selectedDate, setSelectedDate] = useState(localDateInputValue());
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastTickets, setLastTickets] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>(null);

  const activeProducts = useMemo(
    () =>
      products
        .filter((product) => product.active)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [products]
  );

  const categories = useMemo(() => {
    const uniqueCategories = activeProducts
      .map((product) => product.category.trim())
      .filter(Boolean);
    return ["Todos", ...Array.from(new Set(uniqueCategories)).sort((a, b) => a.localeCompare(b))];
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === "Todos" || product.category.trim() === selectedCategory;
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [activeProducts, productSearch, selectedCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * Number(line.product.price), 0),
    [cart]
  );

  const cartQuantity = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );

  const reportSummary = useMemo(() => {
    const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const items = sales.flatMap((sale) => sale.sale_items ?? []);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const byProduct = new Map<string, { name: string; quantity: number; total: number }>();

    for (const item of items) {
      const current = byProduct.get(item.product_name) ?? {
        name: item.product_name,
        quantity: 0,
        total: 0
      };
      current.quantity += item.quantity;
      current.total += Number(item.total);
      byProduct.set(item.product_name, current);
    }

    const productRows = Array.from(byProduct.values()).sort(
      (a, b) => b.quantity - a.quantity || b.total - a.total || a.name.localeCompare(b.name)
    );

    return {
      total,
      quantity,
      saleCount: sales.length,
      averageTicket: sales.length ? total / sales.length : 0,
      productRows
    };
  }, [sales]);

  const loadProducts = async () => {
    if (!supabase) return;
    setLoadingProducts(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(friendlySupabaseError(error.message));
    } else {
      setProducts((data ?? []) as Product[]);
    }

    setLoadingProducts(false);
  };

  const loadSales = async () => {
    if (!supabase) return;
    setLoadingSales(true);
    setErrorMessage("");
    const range = dateRangeForInput(selectedDate);

    const { data, error } = await supabase
      .from("sales")
      .select("id,total,payment_method,created_at,sale_items(*)")
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(friendlySupabaseError(error.message));
    } else {
      setSales((data ?? []) as Sale[]);
    }

    setLoadingSales(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadSales();
  }, [selectedDate]);

  useEffect(() => {
    if (printMode) {
      document.body.setAttribute("data-print-mode", printMode);
    } else {
      document.body.removeAttribute("data-print-mode");
    }
  }, [printMode]);

  useEffect(() => {
    const clearPrintMode = () => setPrintMode(null);
    window.addEventListener("afterprint", clearPrintMode);
    return () => window.removeEventListener("afterprint", clearPrintMode);
  }, []);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setMessage("");
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? { ...line, quantity: Math.max(0, line.quantity + change) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((current) => current.filter((line) => line.product.id !== productId));
  };

  const resetProductForm = () => {
    setProductForm(emptyProductForm);
    setEditingProductId(null);
  };

  const editProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      price: String(product.price).replace(".", ","),
      category: product.category,
      active: product.active
    });
    setEditingProductId(product.id);
    setActiveTab("artigos");
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    const price = parsePrice(productForm.price);
    if (!productForm.name.trim()) {
      setErrorMessage("Indica o nome do artigo.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setErrorMessage("Indica um preço válido.");
      return;
    }

    setSavingProduct(true);
    setErrorMessage("");
    const payload = {
      name: productForm.name.trim(),
      price,
      category: productForm.category.trim(),
      active: productForm.active,
      sort_order: products.length * 10 + 10
    };

    const request = editingProductId
      ? supabase
          .from("products")
          .update({
            name: payload.name,
            price: payload.price,
            category: payload.category,
            active: payload.active
          })
          .eq("id", editingProductId)
      : supabase.from("products").insert(payload);

    const { error } = await request;

    if (error) {
      setErrorMessage(friendlySupabaseError(error.message));
    } else {
      setMessage(editingProductId ? "Artigo atualizado." : "Artigo criado.");
      resetProductForm();
      await loadProducts();
    }

    setSavingProduct(false);
  };

  const toggleProductActive = async (product: Product) => {
    if (!supabase) return;
    setErrorMessage("");

    const { error } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("id", product.id);

    if (error) {
      setErrorMessage(friendlySupabaseError(error.message));
    } else {
      await loadProducts();
    }
  };

  const submitSale = async () => {
    if (!supabase || !cart.length) return;

    setSubmittingSale(true);
    setErrorMessage("");
    setMessage("");

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        total: cartTotal,
        payment_method: paymentMethod
      })
      .select("id,total,payment_method,created_at")
      .single();

    if (saleError || !sale) {
      setErrorMessage(
        saleError ? friendlySupabaseError(saleError.message) : "Não foi possível registar a venda."
      );
      setSubmittingSale(false);
      return;
    }

    const saleItems = cart.map((line) => ({
      sale_id: sale.id,
      product_id: line.product.id,
      product_name: line.product.name,
      quantity: line.quantity,
      unit_price: Number(line.product.price),
      total: Number(line.product.price) * line.quantity
    }));

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);

    if (itemsError) {
      await supabase.from("sales").delete().eq("id", sale.id);
      setErrorMessage(friendlySupabaseError(itemsError.message));
      setSubmittingSale(false);
      return;
    }

    const printableTickets = cart.flatMap((line) =>
      Array.from({ length: line.quantity }, () => line.product.name)
    );

    setLastTickets(printableTickets);
    setCart([]);
    setMessage(`Venda registada: ${formatMoney(cartTotal)}.`);
    setSubmittingSale(false);
    await loadSales();

    window.setTimeout(() => {
      setPrintMode("tickets");
      window.setTimeout(() => window.print(), 120);
    }, 80);
  };

  const printTickets = () => {
    if (!lastTickets.length) return;
    setPrintMode("tickets");
    window.setTimeout(() => window.print(), 120);
  };

  const printReport = () => {
    setPrintMode("report");
    window.setTimeout(() => window.print(), 120);
  };

  const exportReportCsv = () => {
    const rows = [
      ["Venda", "Hora", "Pagamento", "Produto", "Quantidade", "Preço", "Total"],
      ...sales.flatMap((sale) =>
        (sale.sale_items ?? []).map((item) => [
          sale.id,
          formatTime(sale.created_at),
          paymentLabel(sale.payment_method),
          item.product_name,
          String(item.quantity),
          String(item.unit_price).replace(".", ","),
          String(item.total).replace(".", ",")
        ])
      )
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-${selectedDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!supabaseConfigured || !supabase) {
    return (
      <main className="setup-page">
        <section className="setup-panel">
          <ReceiptText size={34} />
          <h1>POS Tickets</h1>
          <p>Configura as variáveis da Supabase antes de iniciar a aplicação.</p>
          <code>NEXT_PUBLIC_SUPABASE_URL</code>
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <ReceiptText size={22} />
            </span>
            <div>
              <h1>POS Tickets</h1>
              <p>{localDateInputValue() === selectedDate ? "Hoje" : selectedDate}</p>
            </div>
          </div>

          <nav className="tabs" aria-label="Navegação principal">
            <button
              className={activeTab === "pos" ? "active" : ""}
              onClick={() => setActiveTab("pos")}
              type="button"
            >
              <ShoppingCart size={18} />
              POS
            </button>
            <button
              className={activeTab === "artigos" ? "active" : ""}
              onClick={() => setActiveTab("artigos")}
              type="button"
            >
              <PackagePlus size={18} />
              Artigos
            </button>
            <button
              className={activeTab === "relatorios" ? "active" : ""}
              onClick={() => setActiveTab("relatorios")}
              type="button"
            >
              <BarChart3 size={18} />
              Relatório
            </button>
          </nav>
        </header>

        {(message || errorMessage) && (
          <div className={`notice ${errorMessage ? "error" : "success"}`} role="status">
            {errorMessage || message}
          </div>
        )}

        {activeTab === "pos" && (
          <section className="pos-layout" aria-label="Registo de venda">
            <div className="tool-panel products-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Frente</span>
                  <h2>Venda</h2>
                </div>
                <button className="icon-button" onClick={loadProducts} type="button" title="Atualizar">
                  <RefreshCw size={18} />
                </button>
              </div>

              <label className="search-field">
                <Search size={18} />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Procurar artigo"
                />
              </label>

              <div className="category-row" role="tablist" aria-label="Categorias">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={selectedCategory === category ? "active" : ""}
                    onClick={() => setSelectedCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="product-grid">
                {loadingProducts ? (
                  <p className="empty-state">A carregar artigos.</p>
                ) : filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      className="product-tile"
                      onClick={() => addToCart(product)}
                      type="button"
                    >
                      <span>{product.name}</span>
                      <strong>{formatMoney(product.price)}</strong>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">Sem artigos ativos.</p>
                )}
              </div>
            </div>

            <aside className="tool-panel order-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Pedido</span>
                  <h2>{cartQuantity} tickets</h2>
                </div>
                <button className="ghost-button" onClick={() => setCart([])} type="button" disabled={!cart.length}>
                  <X size={17} />
                  Limpar
                </button>
              </div>

              <div className="cart-list">
                {cart.length ? (
                  cart.map((line) => (
                    <div className="cart-line" key={line.product.id}>
                      <div>
                        <strong>{line.product.name}</strong>
                        <span>{formatMoney(line.product.price)}</span>
                      </div>
                      <div className="quantity-control">
                        <button onClick={() => updateQuantity(line.product.id, -1)} type="button">
                          -
                        </button>
                        <span>{line.quantity}</span>
                        <button onClick={() => updateQuantity(line.product.id, 1)} type="button">
                          +
                        </button>
                      </div>
                      <button
                        className="icon-button subtle"
                        onClick={() => removeFromCart(line.product.id)}
                        type="button"
                        title="Remover"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Carrinho vazio.</p>
                )}
              </div>

              <div className="payment-box">
                <label>
                  Pagamento
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="checkout-footer">
                <div>
                  <span>Total</span>
                  <strong>{formatMoney(cartTotal)}</strong>
                </div>
                <button
                  className="primary-button"
                  onClick={submitSale}
                  type="button"
                  disabled={!cart.length || submittingSale}
                >
                  <Printer size={19} />
                  {submittingSale ? "A registar" : "Registar e imprimir"}
                </button>
                <button
                  className="secondary-button"
                  onClick={printTickets}
                  type="button"
                  disabled={!lastTickets.length}
                >
                  <ReceiptText size={18} />
                  Reimprimir último
                </button>
              </div>
            </aside>
          </section>
        )}

        {activeTab === "artigos" && (
          <section className="admin-layout" aria-label="Backoffice de artigos">
            <form className="tool-panel product-form" onSubmit={saveProduct}>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Backoffice</span>
                  <h2>{editingProductId ? "Editar artigo" : "Novo artigo"}</h2>
                </div>
                {editingProductId && (
                  <button className="icon-button" onClick={resetProductForm} type="button" title="Cancelar">
                    <X size={18} />
                  </button>
                )}
              </div>

              <label>
                Nome
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Cerveja"
                />
              </label>

              <label>
                Preço
                <input
                  inputMode="decimal"
                  value={productForm.price}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="1,50"
                />
              </label>

              <label>
                Categoria
                <input
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="Bebidas"
                />
              </label>

              <label className="switch-line">
                <input
                  type="checkbox"
                  checked={productForm.active}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                Ativo no POS
              </label>

              <button className="primary-button" type="submit" disabled={savingProduct}>
                {editingProductId ? <Save size={18} /> : <Plus size={18} />}
                {savingProduct ? "A guardar" : editingProductId ? "Guardar" : "Criar artigo"}
              </button>
            </form>

            <div className="tool-panel product-list-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Catálogo</span>
                  <h2>{products.length} artigos</h2>
                </div>
                <button className="icon-button" onClick={loadProducts} type="button" title="Atualizar">
                  <RefreshCw size={18} />
                </button>
              </div>

              <div className="table-like">
                {products.map((product) => (
                  <div className="product-row" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.category || "Sem categoria"}</span>
                    </div>
                    <strong>{formatMoney(product.price)}</strong>
                    <span className={product.active ? "status active" : "status inactive"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </span>
                    <div className="row-actions">
                      <button className="icon-button" onClick={() => editProduct(product)} type="button" title="Editar">
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => toggleProductActive(product)}
                        type="button"
                        title={product.active ? "Desativar" : "Ativar"}
                      >
                        {product.active ? <X size={17} /> : <Check size={17} />}
                      </button>
                    </div>
                  </div>
                ))}
                {!products.length && <p className="empty-state">Sem artigos.</p>}
              </div>
            </div>
          </section>
        )}

        {activeTab === "relatorios" && (
          <section className="report-layout" aria-label="Relatório diário">
            <div className="tool-panel report-panel">
              <div className="panel-heading report-heading">
                <div>
                  <span className="eyebrow">Fecho</span>
                  <h2>Relatório diário</h2>
                </div>
                <div className="report-actions">
                  <label className="date-field">
                    <CalendarDays size={18} />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                    />
                  </label>
                  <button className="secondary-button" onClick={printReport} type="button">
                    <Printer size={18} />
                    Imprimir
                  </button>
                  <button
                    className="secondary-button"
                    onClick={exportReportCsv}
                    type="button"
                    disabled={!sales.length}
                  >
                    <Download size={18} />
                    CSV
                  </button>
                </div>
              </div>

              <div className="metric-grid">
                <div>
                  <span>Vendas</span>
                  <strong>{reportSummary.saleCount}</strong>
                </div>
                <div>
                  <span>Tickets</span>
                  <strong>{reportSummary.quantity}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatMoney(reportSummary.total)}</strong>
                </div>
                <div>
                  <span>Média</span>
                  <strong>{formatMoney(reportSummary.averageTicket)}</strong>
                </div>
              </div>

              <div className="report-columns">
                <div className="report-block">
                  <h3>Produtos</h3>
                  <div className="report-list">
                    {reportSummary.productRows.map((row) => (
                      <div className="summary-row" key={row.name}>
                        <div>
                          <strong>{row.name}</strong>
                          <span>{row.quantity} un.</span>
                        </div>
                        <strong>{formatMoney(row.total)}</strong>
                      </div>
                    ))}
                    {!reportSummary.productRows.length && (
                      <p className="empty-state">Sem vendas neste dia.</p>
                    )}
                  </div>
                </div>

                <div className="report-block">
                  <h3>Movimentos</h3>
                  <div className="sales-list">
                    {loadingSales ? (
                      <p className="empty-state">A carregar vendas.</p>
                    ) : sales.length ? (
                      sales.map((sale) => (
                        <details className="sale-row" key={sale.id}>
                          <summary>
                            <span>
                              {formatTime(sale.created_at)} · {paymentLabel(sale.payment_method)}
                            </span>
                            <strong>{formatMoney(sale.total)}</strong>
                          </summary>
                          <div className="sale-items">
                            {(sale.sale_items ?? []).map((item) => (
                              <div key={item.id}>
                                <span>
                                  {item.quantity} x {item.product_name}
                                </span>
                                <strong>{formatMoney(item.total)}</strong>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))
                    ) : (
                      <p className="empty-state">Sem movimentos.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <PrintSurface
        mode={printMode}
        tickets={lastTickets}
        selectedDate={selectedDate}
        sales={sales}
        reportSummary={reportSummary}
      />
    </main>
  );
}

function PrintSurface({
  mode,
  tickets,
  selectedDate,
  sales,
  reportSummary
}: {
  mode: PrintMode;
  tickets: string[];
  selectedDate: string;
  sales: Sale[];
  reportSummary: {
    total: number;
    quantity: number;
    saleCount: number;
    averageTicket: number;
    productRows: { name: string; quantity: number; total: number }[];
  };
}) {
  return (
    <section className="print-surface" aria-hidden={!mode}>
      {mode === "tickets" && (
        <div className="ticket-sheet">
          {tickets.map((ticket, index) => (
            <article className="ticket-print" key={`${ticket}-${index}`}>
              {ticket}
            </article>
          ))}
        </div>
      )}

      {mode === "report" && (
        <article className="report-print">
          <h1>Relatório diário</h1>
          <p>{selectedDate}</p>
          <div className="print-metrics">
            <div>
              <span>Vendas</span>
              <strong>{reportSummary.saleCount}</strong>
            </div>
            <div>
              <span>Tickets</span>
              <strong>{reportSummary.quantity}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatMoney(reportSummary.total)}</strong>
            </div>
          </div>
          <h2>Produtos</h2>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {reportSummary.productRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.quantity}</td>
                  <td>{formatMoney(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2>Vendas</h2>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Pagamento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatTime(sale.created_at)}</td>
                  <td>{paymentLabel(sale.payment_method)}</td>
                  <td>{formatMoney(sale.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}
    </section>
  );
}
