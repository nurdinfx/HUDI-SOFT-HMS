import type { Medicine } from "@/lib/api"

export interface ParsedInventoryItem {
  name: string
  genericName?: string
  category?: string
  batchNumber?: string
  quantity: number
  reorderLevel: number
  unitPrice: number
  expiryDate?: string
  manufacturer?: string
  unit?: string
  isValid: boolean
  errors: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────

function downloadFile(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeCSV(val: unknown): string {
  const s = String(val ?? "").replace(/"/g, '""')
  return `"${s}"`
}

function formatDate(val: unknown): string {
  if (!val) return ""
  if (val instanceof Date) return val.toISOString().split("T")[0]
  const s = String(val).trim()
  // Strip ISO trailing time if present
  return s.replace(/T\d{2}:\d{2}:\d{2}.*/, "")
}

// ─── Export: Excel CSV ───────────────────────────────────────────

export function exportToCSV(medicines: Medicine[], filename = "inventory_export.csv") {
  const headers = [
    "Name", "Generic Name", "Category", "Batch Number",
    "Quantity", "Reorder Level", "Unit Price", "Total Stock Value",
    "Expiry Date", "Manufacturer", "Unit", "Status",
  ]
  const rows = medicines.map((m) => {
    const qty = Number(m.quantity) || 0
    const price = Number(m.unitPrice) || 0
    const reorder = Number(m.reorderLevel) || 0
    const status = qty <= reorder ? "Low Stock" : "In Stock"
    return [
      escapeCSV(m.name),
      escapeCSV(m.genericName),
      escapeCSV(m.category || "General"),
      escapeCSV(m.batchNumber),
      qty,
      reorder,
      price.toFixed(2),
      (qty * price).toFixed(2),
      escapeCSV(formatDate(m.expiryDate)),
      escapeCSV(m.manufacturer),
      escapeCSV(m.unit || "tablet"),
      escapeCSV(status),
    ].join(",")
  })
  const csv = [headers.join(","), ...rows].join("\r\n")
  downloadFile(csv, filename, "text/csv;charset=utf-8;")
}

// ─── Export: Excel XLSX (pure XML / OOXML) ───────────────────────

export function exportToExcel(medicines: Medicine[], filename = "inventory_export.xlsx") {
  // Build XLSX via SheetJS if available, otherwise fallback to CSV
  if (typeof window !== "undefined" && (window as any).XLSX) {
    const XLSX = (window as any).XLSX
    const data = medicines.map((m) => ({
      "Item Name": m.name || "",
      "Generic Name": m.genericName || "",
      "Category": m.category || "General",
      "Batch Number": m.batchNumber || "",
      "Quantity": Number(m.quantity) || 0,
      "Reorder Level": Number(m.reorderLevel) || 0,
      "Unit Price ($)": Number(m.unitPrice) || 0,
      "Stock Value ($)": (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0),
      "Expiry Date": formatDate(m.expiryDate),
      "Manufacturer": m.manufacturer || "",
      "Unit": m.unit || "tablet",
      "Status": Number(m.quantity) <= (Number(m.reorderLevel) || 0) ? "Low Stock" : "In Stock",
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Inventory")
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    downloadFile(buf, filename, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return
  }
  // Fallback: export as CSV with .xlsx extension hint
  exportToCSV(medicines, filename.replace(".xlsx", ".csv"))
}

// ─── Export: QuickBooks IIF ──────────────────────────────────────

export function exportToQuickBooksIIF(medicines: Medicine[], filename = "inventory_quickbooks.iif") {
  const lines: string[] = []
  lines.push("!INVITEM\tNAME\tINVITEMTYPE\tDESC\tPURCHASEDESC\tACCNT\tASSETACCNT\tCOGSACCNT\tPRICE\tCOST\tQTYONHAND\tREORDERPT")
  medicines.forEach((m) => {
    const name = String(m.name || "").replace(/"/g, "'")
    const desc = m.genericName ? `${m.name} (${m.genericName})` : (m.name || "")
    const price = (Number(m.unitPrice) || 0).toFixed(2)
    const qty = Number(m.quantity) || 0
    const reorder = Number(m.reorderLevel) || 0
    lines.push(
      `INVITEM\t"${name}"\tINVENTORY\t"${desc}"\t"${desc}"\t"Sales"\t"Inventory Asset"\t"Cost of Goods Sold"\t${price}\t${price}\t${qty}\t${reorder}`
    )
  })
  downloadFile(lines.join("\r\n"), filename, "text/plain;charset=utf-8;")
}

// ─── Export: QuickBooks CSV ──────────────────────────────────────

export function exportToQuickBooksCSV(medicines: Medicine[], filename = "inventory_quickbooks.csv") {
  const headers = [
    "Item Name", "Description", "Type", "Quantity On Hand", "Reorder Point",
    "Sales Price", "Cost", "Income Account", "Asset Account", "COGS Account",
    "Expiry Date", "Category",
  ]
  const rows = medicines.map((m) => [
    escapeCSV(m.name),
    escapeCSV(m.genericName || m.name),
    '"Inventory"',
    Number(m.quantity) || 0,
    Number(m.reorderLevel) || 0,
    Number(m.unitPrice) || 0,
    Number(m.unitPrice) || 0,
    '"Sales"',
    '"Inventory Asset"',
    '"Cost of Goods Sold"',
    escapeCSV(formatDate(m.expiryDate)),
    escapeCSV(m.category || "General"),
  ].join(","))
  downloadFile([headers.join(","), ...rows].join("\r\n"), filename, "text/csv;charset=utf-8;")
}

// ─── Sample Templates ────────────────────────────────────────────

export function downloadSampleExcelTemplate() {
  const headers = [
    "Name", "Generic Name", "Category", "Batch Number",
    "Quantity", "Reorder Level", "Unit Price", "Expiry Date", "Manufacturer", "Unit",
  ]
  const rows = [
    ['"Paracetamol 500mg"', '"Paracetamol"', '"Tablet"', '"BAT-2026-001"', 250, 50, 0.15, '"2027-12-31"', '"Pharma Corp"', '"tablet"'],
    ['"Amoxicillin Syrup 100ml"', '"Amoxicillin"', '"Syrup"', '"BAT-2026-002"', 40, 15, 3.50, '"2027-08-15"', '"Med Life"', '"bottle"'],
    ['"Hydrocortisone Ointment"', '"Hydrocortisone"', '"Ointment"', '"BAT-2026-003"', 15, 10, 2.20, '"2028-01-20"', '"SkinCare Inc"', '"tube"'],
  ]
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n")
  downloadFile(csv, "inventory_import_sample.csv", "text/csv;charset=utf-8;")
}

export function downloadSampleQuickBooksTemplate(type: "csv" | "iif" = "csv") {
  if (type === "iif") {
    const lines = [
      "!INVITEM\tNAME\tINVITEMTYPE\tDESC\tPURCHASEDESC\tACCNT\tASSETACCNT\tCOGSACCNT\tPRICE\tCOST\tQTYONHAND\tREORDERPT",
      'INVITEM\t"Paracetamol 500mg"\tINVENTORY\t"Paracetamol 500mg"\t"Paracetamol 500mg"\t"Sales"\t"Inventory Asset"\t"Cost of Goods Sold"\t0.15\t0.15\t250\t50',
      'INVITEM\t"Amoxicillin Syrup"\tINVENTORY\t"Amoxicillin Syrup 100ml"\t"Amoxicillin Syrup 100ml"\t"Sales"\t"Inventory Asset"\t"Cost of Goods Sold"\t3.50\t3.50\t40\t15',
    ]
    downloadFile(lines.join("\r\n"), "inventory_quickbooks_sample.iif", "text/plain;charset=utf-8;")
  } else {
    const csv = [
      "Item Name,Description,Type,Quantity On Hand,Reorder Point,Sales Price,Cost,Income Account,Asset Account,COGS Account,Category",
      '"Paracetamol 500mg","Paracetamol","Inventory",250,50,0.15,0.15,"Sales","Inventory Asset","Cost of Goods Sold","Tablet"',
      '"Amoxicillin Syrup","Amoxicillin","Inventory",40,15,3.50,3.50,"Sales","Inventory Asset","Cost of Goods Sold","Syrup"',
    ].join("\r\n")
    downloadFile(csv, "inventory_quickbooks_sample.csv", "text/csv;charset=utf-8;")
  }
}

// ─── Import: Parse CSV ────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let inQuotes = false
  let current = ""
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(h: string): string {
  return String(h || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "")
}

function parseNum(val: string, fallback = 0): number {
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : fallback
}

function parseQty(val: string, fallback = 0): number {
  const n = parseInt(String(val).replace(/[^0-9]/g, ""), 10)
  return Number.isFinite(n) ? n : fallback
}

function mapRowToItem(headers: string[], values: string[]): ParsedInventoryItem {
  const row: Record<string, string> = {}
  headers.forEach((h, i) => { row[h] = (values[i] || "").trim() })

  let name = "", genericName = "", category = "General", batchNumber = ""
  let quantity = 0, reorderLevel = 10, unitPrice = 0, expiryDate = "", manufacturer = "", unit = "tablet"

  Object.entries(row).forEach(([key, val]) => {
    const norm = normalizeHeader(key)
    if (["name", "itemname", "medicinename", "item", "productname", "product"].includes(norm)) name = val
    else if (["genericname", "generic", "formula", "description", "desc"].includes(norm)) genericName = val
    else if (["category", "itemcategory", "group", "type"].includes(norm)) category = val || "General"
    else if (["batchnumber", "batchno", "batch", "lot", "lotnumber"].includes(norm)) batchNumber = val
    else if (["quantity", "qty", "qtyonhand", "stock", "quantityonhand", "count"].includes(norm)) quantity = parseQty(val)
    else if (["reorderlevel", "reorderpoint", "reorder", "minstock", "minqty"].includes(norm)) reorderLevel = parseQty(val, 10)
    else if (["unitprice", "price", "salesprice", "cost", "unitcost", "rate"].includes(norm)) unitPrice = parseNum(val)
    else if (["expirydate", "expiry", "expdate", "expirationdate", "exp"].includes(norm)) expiryDate = val
    else if (["manufacturer", "supplier", "vendor", "brand"].includes(norm)) manufacturer = val
    else if (["unit", "pack", "package", "unitofmeasure"].includes(norm)) unit = val || "tablet"
  })

  const errors: string[] = []
  if (!name) errors.push("Missing Item Name")

  return { name, genericName, category, batchNumber, quantity, reorderLevel, unitPrice, expiryDate, manufacturer, unit, isValid: errors.length === 0, errors }
}

export async function parseCSVFile(file: File): Promise<ParsedInventoryItem[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(normalizeHeader)
  const items: ParsedInventoryItem[] = []

  // Detect QuickBooks CSV by checking if first header is "itemname" or "item name"
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.every(v => !v)) continue
    items.push(mapRowToItem(headers, values))
  }
  return items
}

export async function parseQuickBooksIIFFile(file: File): Promise<ParsedInventoryItem[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/)
  const items: ParsedInventoryItem[] = []

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("!")) return
    const parts = trimmed.split("\t").map(p => p.replace(/^"|"$/g, "").trim())
    if (parts[0]?.toUpperCase() !== "INVITEM") return

    // Standard IIF layout: INVITEM, NAME, TYPE, DESC, PURCHASEDESC, ACCNT, ASSETACCNT, COGSACCNT, PRICE, COST, QTYONHAND, REORDERPT
    const name = parts[1] || ""
    const desc = parts[3] || parts[4] || ""
    const price = parseNum(parts[8] || parts[9] || "0")
    const qty = parseQty(parts[10] || "0")
    const reorder = parseQty(parts[11] || "10", 10)

    const errors: string[] = []
    if (!name) errors.push("Missing Item Name")

    items.push({
      name, genericName: desc, category: "QuickBooks Import",
      batchNumber: "", quantity: qty, reorderLevel: reorder, unitPrice: price,
      expiryDate: "", isValid: errors.length === 0, errors,
    })
  })
  return items
}

// Generic entry point used by the import dialog
export async function parseInventoryFile(file: File, hint: "excel" | "quickbooks" = "excel"): Promise<ParsedInventoryItem[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".iif")) return parseQuickBooksIIFFile(file)
  // .xlsx — try SheetJS if loaded, otherwise ask user to use CSV
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    if (typeof window !== "undefined" && (window as any).XLSX) {
      const XLSX = (window as any).XLSX
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array", cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })
      return rawRows.map((row) => {
        const headers = Object.keys(row).map(normalizeHeader)
        const values = Object.values(row).map(String)
        return mapRowToItem(headers, values)
      })
    }
    // Fallback: inform user XLSX is loading
    throw new Error("XLSX reader is loading. Please use a CSV file for import, or try again in a moment.")
  }
  // Default: CSV (handles .csv and QuickBooks CSV)
  return parseCSVFile(file)
}
