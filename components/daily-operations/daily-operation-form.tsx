"use client";

import { useEffect, useState } from "react";
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
import { dailyOperationsApi, hrApi, laboratoryApi, type DailyOperation, type LabCatalogItem } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DailyOperationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: DailyOperation | null;
  onSuccess: () => void;
}

export function DailyOperationForm({ open, onOpenChange, operation, onSuccess }: DailyOperationFormProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<LabCatalogItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    department: "",
    transactionType: "",
    labTestId: "",
    amount: "0",
    description: "",
    date: format(new Date(), "yyyy-MM-dd")
  });

  useEffect(() => {
    if (open) {
      loadDependencies();
      if (operation) {
        setFormData({
          employeeId: operation.employeeId,
          department: operation.department || "",
          transactionType: operation.transactionType,
          labTestId: operation.labTestId || "",
          amount: operation.amount.toString(),
          description: operation.description || "",
          date: operation.date.split('T')[0]
        });
      } else {
        setFormData({
          employeeId: "",
          department: "",
          transactionType: "",
          labTestId: "",
          amount: "0",
          description: "",
          date: format(new Date(), "yyyy-MM-dd")
        });
      }
    }
  }, [open, operation]);

  const loadDependencies = async () => {
    setIsLoading(true);
    try {
      const [empRes, labRes] = await Promise.all([
        hrApi.getEmployees(),
        laboratoryApi.getCatalog()
      ]);
      setEmployees(empRes || []);
      setLabTests(labRes || []);
    } catch (error) {
      console.error("Failed to load form dependencies", error);
      toast.error("Failed to load employees and lab tests");
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

  const handleTestChange = (testId: string) => {
    const test = labTests.find(t => t.id === testId);
    setFormData(prev => ({
      ...prev,
      labTestId: testId,
      amount: test ? test.cost.toString() : prev.amount,
      description: test ? `Lab Test: ${test.name}` : prev.description
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.transactionType) {
      toast.error("Employee and Transaction Type are required");
      return;
    }

    setIsSubmitting(true);
    try {
       const payload = {
           employeeId: formData.employeeId,
           department: formData.department,
           transactionType: formData.transactionType as any,
           labTestId: formData.labTestId || undefined,
           amount: parseFloat(formData.amount || "0"),
           description: formData.description,
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

  const needsLabTest = formData.transactionType === "Staff Laboratory Test" || formData.transactionType === "Laboratory Internal Use";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{operation ? "Edit Record" : "New Daily Operation"}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <form onSubmit={onSubmit} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label>Department</Label>
                <Input 
                    placeholder="Auto-filled or manual" 
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                />
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

            <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={formData.transactionType} onValueChange={(val) => setFormData(prev => ({ ...prev, transactionType: val }))} disabled={isSubmitting}>
                <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Staff Laboratory Test">Staff Laboratory Test</SelectItem>
                    <SelectItem value="Laboratory Internal Use">Laboratory Internal Use</SelectItem>
                    <SelectItem value="Operational Expense">Operational Expense</SelectItem>
                    <SelectItem value="Cash Received">Cash Received</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
                </Select>
            </div>

            {needsLabTest && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label>Laboratory Test</Label>
                <Select value={formData.labTestId} onValueChange={handleTestChange} disabled={isSubmitting}>
                    <SelectTrigger>
                    <SelectValue placeholder="Select Lab Test" />
                    </SelectTrigger>
                    <SelectContent>
                        {labTests.map(test => (
                            <SelectItem key={test.id} value={test.id}>{test.name} - ${test.cost}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
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
