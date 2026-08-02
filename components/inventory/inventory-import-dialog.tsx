"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  FileSpreadsheet,
  FileCode,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { pharmacyApi } from "@/lib/api"
import {
  parseInventoryFile,
  downloadSampleExcelTemplate,
  downloadSampleQuickBooksTemplate,
  type ParsedInventoryItem,
} from "@/lib/utils/inventory-io"

interface InventoryImportDialogProps {
  onImportSuccess?: () => void
}

export function InventoryImportDialog({ onImportSuccess }: InventoryImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [importType, setImportType] = useState<"excel" | "quickbooks">("excel")
  const [file, setFile] = useState<File | null>(null)
  const [parsedItems, setParsedItems] = useState<ParsedInventoryItem[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    await processFile(selectedFile)
  }

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsParsing(true)
    const filename = selectedFile.name.toLowerCase()
    if (filename.endsWith(".iif")) setImportType("quickbooks")
    try {
      let items: ParsedInventoryItem[] = []
      items = await parseInventoryFile(selectedFile, importType)

      setParsedItems(items)
      if (items.length === 0) {
        toast.error("No valid inventory rows found in the selected file.")
      } else {
        toast.success(`Parsed ${items.length} records from ${selectedFile.name}`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to parse file: ${err.message || "Unknown error"}`)
      setParsedItems([])
    } finally {
      setIsParsing(false)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      await processFile(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const resetState = () => {
    setFile(null)
    setParsedItems([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const validItems = parsedItems.filter((item) => item.isValid)
  const invalidCount = parsedItems.length - validItems.length

  const handleImportSubmit = async () => {
    if (validItems.length === 0) {
      toast.error("No valid items to import.")
      return
    }

    setIsImporting(true)
    try {
      // Send items to backend bulk endpoint
      const payload = validItems.map((item) => ({
        name: item.name,
        genericName: item.genericName || null,
        category: item.category || "General",
        batchNumber: item.batchNumber || null,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        unitPrice: item.unitPrice,
        expiryDate: item.expiryDate || null,
        manufacturer: item.manufacturer || null,
        unit: item.unit || "tablet",
      }))

      if (pharmacyApi.bulkCreateMedicines) {
        const res = await pharmacyApi.bulkCreateMedicines(payload)
        toast.success(res.message || `Successfully imported ${validItems.length} items!`)
      } else {
        // Fallback sequentially if endpoint is missing
        let count = 0
        for (const item of payload) {
          await pharmacyApi.createMedicine(item)
          count++
        }
        toast.success(`Successfully imported ${count} items into inventory!`)
      }

      setOpen(false)
      resetState()
      onImportSuccess?.()
    } catch (err: any) {
      console.error(err)
      toast.error(`Import failed: ${err.message || "Failed to save items to inventory."}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetState() }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="size-4" />
          Import Inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="size-5 text-primary" />
            Import Inventory (Excel & QuickBooks)
          </DialogTitle>
          <DialogDescription>
            Import inventory items from Excel spreadsheets (.xlsx, .xls, .csv) or QuickBooks (.iif, .csv).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Import Source & Template Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Import Format:</span>
              <Button
                type="button"
                size="sm"
                variant={importType === "excel" ? "default" : "outline"}
                onClick={() => setImportType("excel")}
                className="gap-1.5"
              >
                <FileSpreadsheet className="size-4" />
                Excel / CSV (.xlsx, .csv)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={importType === "quickbooks" ? "default" : "outline"}
                onClick={() => setImportType("quickbooks")}
                className="gap-1.5"
              >
                <FileCode className="size-4 text-emerald-600" />
                QuickBooks (.iif, .csv)
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sample Templates:</span>
              {importType === "excel" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={downloadSampleExcelTemplate}
                  className="h-8 gap-1 text-xs"
                >
                  <Download className="size-3.5" />
                  Excel Template
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadSampleQuickBooksTemplate("iif")}
                    className="h-8 gap-1 text-xs"
                  >
                    <Download className="size-3.5" />
                    QB .IIF Sample
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadSampleQuickBooksTemplate("csv")}
                    className="h-8 gap-1 text-xs"
                  >
                    <Download className="size-3.5" />
                    QB .CSV Sample
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* File Upload Zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 rounded-xl cursor-pointer transition-colors text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  importType === "excel"
                    ? ".xlsx, .xls, .csv"
                    : ".iif, .csv, .xlsx, .xls"
                }
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="p-3 bg-primary/10 rounded-full text-primary mb-3">
                <Upload className="size-6" />
              </div>
              <p className="font-semibold text-base mb-1">
                Click to browse or drop your {importType === "excel" ? "Excel / CSV" : "QuickBooks"} file here
              </p>
              <p className="text-xs text-muted-foreground">
                Supports {importType === "excel" ? ".xlsx, .xls, .csv" : ".iif, .csv, .xlsx"} files with item name, quantity, price, etc.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/60 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="size-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · Format: {importType.toUpperCase()}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="size-4" />
                Remove File
              </Button>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="flex items-center justify-center p-8 gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Parsing file contents...</span>
            </div>
          )}

          {/* Preview Table */}
          {!isParsing && parsedItems.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">Parsed Items Preview</h4>
                  <Badge variant="outline" className="gap-1 font-normal">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    {validItems.length} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="gap-1 font-normal">
                      <XCircle className="size-3" />
                      {invalidCount} Invalid
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Total: {parsedItems.length} records</span>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">Status</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Generic Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Reorder</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.map((item, idx) => (
                      <TableRow key={idx} className={!item.isValid ? "bg-destructive/5" : undefined}>
                        <TableCell>
                          {item.isValid ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="size-4 text-amber-500" title={item.errors.join(", ")} />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name || <span className="text-destructive font-semibold">Missing Name</span>}</TableCell>
                        <TableCell className="text-muted-foreground">{item.genericName || "—"}</TableCell>
                        <TableCell>{item.category || "General"}</TableCell>
                        <TableCell className="font-mono text-xs">{item.batchNumber || "—"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.reorderLevel}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{item.expiryDate || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between border-t pt-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImportSubmit}
            disabled={validItems.length === 0 || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Import {validItems.length} Items to Inventory
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
