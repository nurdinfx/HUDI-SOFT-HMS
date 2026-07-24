"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Activity, 
  WalletCards, 
  DollarSign,
  TrendingDown,
  Building,
  Calendar as CalendarIcon,
  Trash2,
  Edit,
  Download,
  TestTube2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dailyOperationsApi, type DailyOperation, type DailyOperationsSummary } from "@/lib/api";
import { toast } from "sonner";
import { DailyOperationForm } from "./daily-operation-form";

export function DailyOperationsContent() {
  const [operations, setOperations] = useState<DailyOperation[]>([]);
  const [summary, setSummary] = useState<DailyOperationsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateParam, setDateParam] = useState("");
  
  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<DailyOperation | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterType, dateParam]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (filterType !== "all") params.transactionType = filterType;
      if (dateParam) params.date = dateParam;
      
      const [opsRes, sumRes] = await Promise.all([
        dailyOperationsApi.getAll(params),
        dailyOperationsApi.getSummary()
      ]);
      
      setOperations(opsRes);
      setSummary(sumRes);
    } catch (error) {
      console.error("Failed to load operations:", error);
      toast.error("Failed to load daily operations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await dailyOperationsApi.delete(id);
      toast.success("Record deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  const handleEdit = (op: DailyOperation) => {
    setEditingOp(op);
    setIsFormOpen(true);
  };

  const filteredOps = operations.filter(op => 
    op.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    (op.description && op.description.toLowerCase().includes(search.toLowerCase())) ||
    (op.department && op.department.toLowerCase().includes(search.toLowerCase())) ||
    op.transactionType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Daily Operations</h1>
          <p className="text-muted-foreground mt-1">Manage staff lab tests, expenses, and daily cash flows.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Report
          </Button>
          <Button onClick={() => { setEditingOp(null); setIsFormOpen(true); }} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operational Expenses (Today)</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(summary?.expenses || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Received (Today)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(summary?.cashReceived || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Lab Tests (Today)</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.labTests || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Daily Balance</CardTitle>
            <WalletCards className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.netBalance || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
              ${Number(summary?.netBalance || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Operations Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee, description, department..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Transaction Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Staff Laboratory Test">Staff Lab Test</SelectItem>
                  <SelectItem value="Laboratory Internal Use">Lab Internal Use</SelectItem>
                  <SelectItem value="Operational Expense">Operational Expense</SelectItem>
                  <SelectItem value="Cash Received">Cash Received</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[150px]">
              <div className="relative">
                 <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   type="date"
                   className="pl-8"
                   value={dateParam}
                   onChange={(e) => setDateParam(e.target.value)}
                 />
              </div>
            </div>
          </div>

          <div className="rounded-md border table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading records...</TableCell>
                  </TableRow>
                ) : filteredOps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOps.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(op.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-primary">{op.employeeName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3" />
                          {op.department || "No Dept"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          op.transactionType === "Cash Received" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          op.transactionType === "Operational Expense" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          op.transactionType === "Staff Laboratory Test" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {op.transactionType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate font-medium text-slate-700" title={op.description}>
                          {op.description || (op.selectedTests && op.selectedTests.length > 0 ? op.selectedTests.map(t => t.name).join(", ") : (op.labTestName ? op.labTestName : "No details"))}
                        </div>
                        {op.selectedTests && op.selectedTests.length > 0 ? (
                           <div className="flex flex-wrap gap-1 mt-1">
                             {op.selectedTests.map(t => (
                               <Badge key={t.id} variant="outline" className="text-[10px] px-1 py-0 bg-slate-50 border-slate-200">
                                 {t.name}
                               </Badge>
                             ))}
                           </div>
                        ) : op.labTestName && (
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">Test: {op.labTestName}</div>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        op.transactionType === 'Cash Received' ? 'text-green-600 dark:text-green-400' :
                        op.transactionType === 'Operational Expense' ? 'text-red-500' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        ${Number(op.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(op)}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(op.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DailyOperationForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        operation={editingOp}
        onSuccess={fetchData}
      />
    </div>
  );
}
