"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dailyOperationsApi, hrApi, laboratoryApi, revenueAnalyticsApi, type DailyOperation, type LabCatalogItem, type Department, type ServiceCategory } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Plus, X, ListFilter, TestTube2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DailyOperationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: DailyOperation | null;
  onSuccess: () => void;
}

interface SelectedTest {
    id: string;
    name: string;
    amount: number;
}

export function DailyOperationForm({ open, onOpenChange, operation, onSuccess }: DailyOperationFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<LabCatalogItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    department: "",
    transactionType: "", 
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    manualAmount: "0",
    useManualAmount: false
  });

  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);

  const calculatedTotal = useMemo(() => {
    return selectedTests.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [selectedTests]);

  const displayAmount = formData.useManualAmount ? formData.manualAmount : calculatedTotal.toString();

  useEffect(() => {
    if (open) {
      loadDependencies();
      if (operation) {
        setFormData({
          employeeId: operation.employeeId,
          department: operation.department || "",
          transactionType: operation.transactionType,
          description: operation.description || "",
          date: operation.date.split('T')[0],
          manualAmount: operation.amount.toString(),
          useManualAmount: operation.selectedTests && operation.selectedTests.length > 0 ? false : true
        });
        setSelectedTests(operation.selectedTests || []);
      } else {
        resetForm();
      }
    }
  }, [open, operation]);

  const resetForm = () => {
    setFormData({
      employeeId: "",
      department: "",
      transactionType: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      manualAmount: "0",
      useManualAmount: false
    });
    setSelectedTests([]);
  };

  const loadDependencies = async () => {
    setIsLoading(true);
    try {
      const [empRes, labRes, deptRes, catRes] = await Promise.all([
        hrApi.getEmployees(),
        laboratoryApi.getCatalog(),
        revenueAnalyticsApi.getDepartments(),
        revenueAnalyticsApi.getServiceCategories()
      ]);
      setEmployees(empRes || []);
      setLabTests(labRes || []);
      setDepartments(deptRes || []);
      setCategories(catRes || []);
    } catch (error) {
      console.error("Failed to load form dependencies", error);
      toast.error("Failed to load form options");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    setFormData(prev => ({
      ...prev,
      employeeId: empId,
      department: emp?.department || prev.department
    }));
  };

  const addTest = (testId: string) => {
    if (selectedTests.length >= 5) {
      toast.error("Maximum 5 tests allowed per record");
      return;
    }
    const test = labTests.find(t => t.id === testId);
    if (test && !selectedTests.find(st => st.id === testId)) {
      setSelectedTests(prev => [...prev, { id: test.id, name: test.name, amount: test.cost }]);
      setFormData(prev => ({ ...prev, useManualAmount: false }));
    }
  };

  const removeTest = (testId: string) => {
    setSelectedTests(prev => prev.filter(t => t.id !== testId));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.transactionType) {
      toast.error("Employee and Transaction Type are required");
      return;
    }

    setIsSubmitting(true);
    try {
       const finalAmount = formData.useManualAmount ? parseFloat(formData.manualAmount || "0") : calculatedTotal;
       const payload = {
           employeeId: formData.employeeId,
           department: formData.department,
           transactionType: formData.transactionType as any,
           selectedTests: selectedTests.length > 0 ? selectedTests : undefined,
           amount: finalAmount,
           description: formData.description || (selectedTests.length > 0 ? `Tests: ${selectedTests.map(t => t.name).join(", ")}` : ""),
           date: formData.date
       };

       if (operation) {
           await dailyOperationsApi.update(operation.id, payload);
           toast.success("Record updated successfully");
       } else {
           await dailyOperationsApi.create(payload);
           toast.success("Record created successfully");
       }
       onSuccess();
       onOpenChange(false);
    } catch (error) {
       toast.error(operation ? "Failed to update record" : "Failed to create record");
       console.error(error);
    } finally {
       setIsSubmitting(false);
    }
  };

  const needsLabTest = useMemo(() => {
    const t = (formData.transactionType || "").toLowerCase();
    return t.includes("lab") || t.includes("test");
  }, [formData.transactionType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{operation ? "Edit Record" : "New Daily Operation"}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={formData.employeeId} onValueChange={handleEmployeeChange} disabled={isSubmitting}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={formData.department} onValueChange={(val) => setFormData(prev => ({ ...prev, department: val }))} disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Transaction Category / Type</Label>
                    <Select value={formData.transactionType} onValueChange={(val) => setFormData(prev => ({ ...prev, transactionType: val }))} disabled={isSubmitting}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Deduplicate and filter categories */}
                        {Array.from(new Set([
                          ...categories.map(c => c.name),
                          "Operational Expense",
                          "Other"
                        ])).map(catName => (
                          <SelectItem key={catName} value={catName}>{catName}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
            </div>

            {needsLabTest && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 border-primary/20 bg-primary/5">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-primary font-bold">
                            <ListFilter className="h-4 w-4" />
                            Select Laboratory Tests (Max 5)
                        </Label>
                        <span className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">Required</span>
                    </div>
                    
                    <Select onValueChange={addTest} disabled={isSubmitting}>
                        <SelectTrigger className="bg-white border-primary/20 focus:ring-primary shadow-sm h-11">
                            <SelectValue placeholder="🔎 Search or select tests from catalog..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            <ScrollArea className="h-full">
                                {labTests.length > 0 ? (
                                  labTests.map(test => (
                                      <SelectItem key={test.id} value={test.id} disabled={selectedTests.some(t => t.id === test.id)}>
                                          <div className="flex justify-between items-center w-full min-w-[240px]">
                                              <span className="font-medium">{test.name}</span>
                                              <Badge variant="outline" className="ml-2 font-mono text-[10px] border-primary/20 text-primary">
                                                  ${test.cost}
                                              </Badge>
                                          </div>
                                      </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-xs text-muted-foreground">No lab tests available in catalog</div>
                                )}
                            </ScrollArea>
                        </SelectContent>
                    </Select>

                    {selectedTests.length > 0 ? (
                        <div className="space-y-2 mt-2">
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                {selectedTests.map(test => (
                                    <Badge key={test.id} variant="secondary" className="pl-3 pr-1 py-1.5 gap-2 bg-white border-primary/30 text-primary shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors group">
                                        <span className="text-xs font-semibold">{test.name}</span>
                                        <Badge variant="outline" className="bg-slate-50 border-none px-1 text-[10px] text-muted-foreground">${test.amount}</Badge>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-5 w-5 p-0 group-hover:text-red-500 rounded-full"
                                            onClick={() => removeTest(test.id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="text-[10px] text-primary/70 italic px-1">
                                Total for {selectedTests.length} test(s): <span className="font-bold underline">${Number(calculatedTotal || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/10 rounded-md bg-white/50 text-muted-foreground">
                            <TestTube2 className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-[11px] font-medium">Please add at least one test to proceed</p>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Amount ($)</Label>
                    {!formData.useManualAmount && calculatedTotal > 0 && (
                         <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] text-primary"
                            onClick={() => setFormData(prev => ({ ...prev, useManualAmount: true }))}
                         >Override</Button>
                    )}
                </div>
                <div className="relative">
                    <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        disabled={!formData.useManualAmount && !formData.useManualAmount && calculatedTotal > 0 && selectedTests.length > 0}
                        value={displayAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, manualAmount: e.target.value, useManualAmount: true }))}
                        className={cn(
                            !formData.useManualAmount && selectedTests.length > 0 && "bg-slate-50 font-bold text-primary border-primary/20"
                        )}
                    />
                    {!formData.useManualAmount && selectedTests.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[10px]">AUTO</Badge>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Description / Notes</Label>
                <Input 
                    placeholder="Brief details about the transaction" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {operation ? "Save Changes" : "Save Record"}
                </Button>
            </DialogFooter>
            </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
