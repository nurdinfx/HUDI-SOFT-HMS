import * as XLSX from "xlsx"
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

/**
 * Downloads a file to the user's browser
 */
export function downloadFile(content: BlobPart, filename: string, mimeType: string) {
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

/**
 * Export inventory data to Excel (.xlsx)
 */
export function exportToExcel(medicines: Medicine[], filename = "inventory_export.xlsx") {
  const exportData = medicines.map((m) => ({
    "Item Name": m.name || "",
    "Generic Name": m.genericName || "",
    "Category": m.category || "General",
    "Batch Number": m.batchNumber || "",
    "Quantity": Number(m.quantity) || 0,
    "Reorder Level": Number(m.reorderLevel) || 0,
    "Unit Price ($)": Number(m.unitPrice) || 0,
    "Total Stock Value ($)": (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0),
    "Expiry Date": m.expiryDate || "",
    "Manufacturer": m.manufacturer || "",
    "Unit": m.unit || "tablet",
    "Status": Number(m.quantity) <= (Number(m.reorderLevel) || 0) ? "Low Stock" : "In Stock",
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory")

  // Write file buffer and download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  downloadFile(
    excelBuffer,
    filename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
}

/**
 * Export inventory data to standard CSV
 */
export function exportToCSV(medicines: Medicine[], filename = "inventory_export.csv") {
  const headers = [
    "Name",
    "Generic Name",
    "Category",
    "Batch Number",
    "Quantity",
    "Reorder Level",
    "Unit Price",
    "Expiry Date",
    "Manufacturer",
    "Unit",
  ]

  const rows = medicines.map((m) => [
    `"${(m.name || "").replace(/"/g, '""')}"`,
    `"${(m.genericName || "").replace(/"/g, '""')}"`,
    `"${(m.category || "General").replace(/"/g, '""')}"`,
    `"${(m.batchNumber || "").replace(/"/g, '""')}"`,
    m.quantity || 0,
    m.reorderLevel || 0,
    m.unitPrice || 0,
    `"${m.expiryDate || ""}"`,
    `"${(m.manufacturer || "").replace(/"/g, '""')}"`,
    `"${m.unit || "tablet"}"`,
  ])

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;")
}

/**
 * Export inventory data to QuickBooks IIF format (.iif)
 */
export function exportToQuickBooksIIF(medicines: Medicine[], filename = "inventory_quickbooks.iif") {
  const lines: string[] = []

  // IIF Header for Inventory Items
  lines.push("!INVITEM\tNAME\tINVITEMTYPE\tDESC\tPURCHASEDESC\tACCNT\tASSETACCNT\tCOGSACCNT\tPRICE\tCOST\tQTYONHAND\tREORDERPT")
  
  medicines.forEach((m) => {
    const name = m.name || ""
    const type = "INVENTORY"
    const desc = m.genericName ? `${m.name} (${m.genericName})` : m.name || ""
    const purchaseDesc = desc
    const accnt = "Sales"
    const assetAccnt = "Inventory Asset"
    const cogsAccnt = "Cost of Goods Sold"
    const price = Number(m.unitPrice || 0).toFixed(2)
    const cost = Number(m.unitPrice || 0).toFixed(2)
    const qtyOnHand = Number(m.quantity || 0)
    const reorderPt = Number(m.reorderLevel || 0)

    lines.push(
      `INVITEM\t"${name}"\t${type}\t"${desc}"\t"${purchaseDesc}"\t"${accnt}"\t"${assetAccnt}"\t"${cogsAccnt}"\t${price}\t${cost}\t${qtyOnHand}\t${reorderPt}`
    )
  })

  const iifContent = lines.join("\r\n")
  downloadFile(iifContent, filename, "text/plain;charset=utf-8;")
}

/**
 * Export inventory data to QuickBooks CSV format
 */
export function exportToQuickBooksCSV(medicines: Medicine[], filename = "inventory_quickbooks.csv") {
  const headers = [
    "Item Name",
    "Description",
    "Type",
    "Quantity On Hand",
    "Reorder Point",
    "Sales Price",
    "Cost",
    "Income Account",
    "Asset Account",
    "COGS Account",
    "Expiry Date",
    "Category",
  ]

  const rows = medicines.map((m) => [
    `"${(m.name || "").replace(/"/g, '""')}"`,
    `"${(m.genericName || m.name || "").replace(/"/g, '""')}"`,
    `"Inventory"`,
    m.quantity || 0,
    m.reorderLevel || 0,
    m.unitPrice || 0,
    m.unitPrice || 0,
    `"Sales"`,
    `"Inventory Asset"`,
    `"Cost of Goods Sold"`,
    `"${m.expiryDate || ""}"`,
    `"${(m.category || "General").replace(/"/g, '""')}"`,
  ])

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;")
}

/**
 * Helper to clean up header names for flexible matching
 */
function normalizeHeader(h: string): string {
  return String(h || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
}

/**
 * Parse Excel (.xlsx, .xls) or CSV files into Inventory items
 */
export async function parseExcelOrCSVFile(file: File): Promise<ParsedInventoryItem[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

  const parsedItems: ParsedInventoryItem[] = []

  rawRows.forEach((row, index) => {
    // Find matching keys flexible to variations
    let name = ""
    let genericName = ""
    let category = "General"
    let batchNumber = ""
    let quantity = 0
    let reorderLevel = 10
    let unitPrice = 0
    let expiryDate = ""
    let manufacturer = ""
    let unit = "tablet"

    Object.keys(row).forEach((key) => {
      const norm = normalizeHeader(key)
      const val = row[key]

      if (["name", "itemname", "medicinename", "item", "productname", "product"].includes(norm)) {
        name = String(val).trim()
      } else if (["genericname", "generic", "formula", "description", "desc"].includes(norm)) {
        genericName = String(val).trim()
      } else if (["category", "itemcategory", "group", "type"].includes(norm)) {
        category = String(val).trim() || "General"
      } else if (["batchnumber", "batchno", "batch", "lot", "lotnumber"].includes(norm)) {
        batchNumber = String(val).trim()
      } else if (["quantity", "qty", "qtyonhand", "stock", "quantityonhand", "count"].includes(norm)) {
        const parsed = parseInt(String(val), 10)
        quantity = Number.isFinite(parsed) ? parsed : 0
      } else if (["reorderlevel", "reorderpoint", "reorder", "minstock", "minqty"].includes(norm)) {
        const parsed = parseInt(String(val), 10)
        reorderLevel = Number.isFinite(parsed) ? parsed : 10
      } else if (["unitprice", "price", "salesprice", "cost", "unitcost", "rate"].includes(norm)) {
        const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ""))
        unitPrice = Number.isFinite(parsed) ? parsed : 0
      } else if (["expirydate", "expiry", "expdate", "expirationdate", "exp"].includes(norm)) {
        if (val instanceof Date) {
          expiryDate = val.toISOString().split("T")[0]
        } else {
          expiryDate = String(val).trim()
        }
      } else if (["manufacturer", "supplier", "vendor", "brand"].includes(norm)) {
        manufacturer = String(val).trim()
      } else if (["unit", "pack", "package", "unitofmeasure"].includes(norm)) {
        unit = String(val).trim() || "tablet"
      }
    })

    const errors: string[] = []
    if (!name) {
      errors.push("Missing Item Name")
    }

    parsedItems.push({
      name,
      genericName,
      category: category || "General",
      batchNumber,
      quantity,
      reorderLevel,
      unitPrice,
      expiryDate,
      manufacturer,
      unit,
      isValid: errors.length === 0,
      errors,
    })
  })

  return parsedItems
}

/**
 * Parse QuickBooks IIF format file (.iif)
 */
export async function parseQuickBooksIIFFile(file: File): Promise<ParsedInventoryItem[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/)
  const parsedItems: ParsedInventoryItem[] = []

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("!")) return // skip empty or header lines

    const parts = trimmed.split("\t").map((p) => p.replace(/^"|"$/g, "").trim())
    const lineType = parts[0]?.toUpperCase()

    if (lineType === "INVITEM") {
      // Standard IIF INVITEM layout:
      // INVITEM, NAME, INVITEMTYPE, DESC, PURCHASEDESC, ACCNT, ASSETACCNT, COGSACCNT, PRICE, COST, QTYONHAND, REORDERPT
      const name = parts[1] || ""
      const desc = parts[3] || parts[4] || ""
      const priceStr = parts[8] || parts[9] || "0"
      const qtyStr = parts[10] || "0"
      const reorderStr = parts[11] || "10"

      const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0
      const qty = parseInt(qtyStr, 10) || 0
      const reorder = parseInt(reorderStr, 10) || 10

      const errors: string[] = []
      if (!name) errors.push("Missing Item Name")

      parsedItems.push({
        name,
        genericName: desc,
        category: "QuickBooks Import",
        batchNumber: "",
        quantity: qty,
        reorderLevel: reorder,
        unitPrice: price,
        expiryDate: "",
        isValid: errors.length === 0,
        errors,
      })
    }
  })

  return parsedItems
}

/**
 * Generate Sample Excel Template for download
 */
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "Item Name": "Paracetamol 500mg",
      "Generic Name": "Paracetamol",
      "Category": "Tablet",
      "Batch Number": "BAT-2026-001",
      "Quantity": 250,
      "Reorder Level": 50,
      "Unit Price": 0.15,
      "Expiry Date": "2027-12-31",
      "Manufacturer": "Pharma Corp",
      "Unit": "tablet",
    },
    {
      "Item Name": "Amoxicillin Syrup 100ml",
      "Generic Name": "Amoxicillin",
      "Category": "Syrup",
      "Batch Number": "BAT-2026-002",
      "Quantity": 40,
      "Reorder Level": 15,
      "Unit Price": 3.50,
      "Expiry Date": "2027-08-15",
      "Manufacturer": "Med Life",
      "Unit": "bottle",
    },
    {
      "Item Name": "Hydrocortisone Ointment",
      "Generic Name": "Hydrocortisone",
      "Category": "Ointment",
      "Batch Number": "BAT-2026-003",
      "Quantity": 15,
      "Reorder Level": 10,
      "Unit Price": 2.20,
      "Expiry Date": "2028-01-20",
      "Manufacturer": "SkinCare Inc",
      "Unit": "tube",
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(sampleData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sample Inventory")
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  downloadFile(
    buffer,
    "inventory_import_sample_excel.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
}

/**
 * Generate Sample QuickBooks Template for download
 */
export function downloadSampleQuickBooksTemplate(type: "csv" | "iif" = "csv") {
  if (type === "iif") {
    const lines = [
      "!INVITEM\tNAME\tINVITEMTYPE\tDESC\tPURCHASEDESC\tACCNT\tASSETACCNT\tCOGSACCNT\tPRICE\tCOST\tQTYONHAND\tREORDERPT",
      'INVITEM\t"Paracetamol 500mg"\tINVENTORY\t"Paracetamol 500mg (Paracetamol)"\t"Paracetamol 500mg"\t"Sales"\t"Inventory Asset"\t"Cost of Goods Sold"\t0.15\t0.15\t250\t50',
      'INVITEM\t"Amoxicillin Syrup"\tINVENTORY\t"Amoxicillin Syrup 100ml"\t"Amoxicillin Syrup 100ml"\t"Sales"\t"Inventory Asset"\t"Cost of Goods Sold"\t3.50\t3.50\t40\t15',
    ]
    downloadFile(lines.join("\r\n"), "inventory_quickbooks_sample.iif", "text/plain;charset=utf-8;")
  } else {
    const csvContent = [
      "Item Name,Description,Type,Quantity On Hand,Reorder Point,Sales Price,Cost,Income Account,Asset Account,COGS Account,Category",
      '"Paracetamol 500mg","Paracetamol","Inventory",250,50,0.15,0.15,"Sales","Inventory Asset","Cost of Goods Sold","Tablet"',
      '"Amoxicillin Syrup","Amoxicillin","Inventory",40,15,3.50,3.50,"Sales","Inventory Asset","Cost of Goods Sold","Syrup"',
    ].join("\r\n")
    downloadFile(csvContent, "inventory_quickbooks_sample.csv", "text/csv;charset=utf-8;")
  }
}
