"use client"

import { useState, useEffect } from "react"
import { revenueAnalyticsApi, Department, ServiceCategory } from "@/lib/api"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search, Plus, Filter, LayoutGrid, List } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { DepartmentFormModal } from "./department-form-modal"
import { ServiceCategoryFormModal } from "./service-category-form-modal"

export function DepartmentsContent() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [depts, cats] = await Promise.all([
        revenueAnalyticsApi.getDepartments(),
        revenueAnalyticsApi.getServiceCategories()
      ])
      setDepartments(depts || [])
      setCategories(cats || [])
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load departments and services")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
  )

  const filteredCats = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Departments & Services" 
          description="Manage hospital departments and service categories for dynamic revenue reporting" 
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCatModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Service Category
            </Button>
            <Button onClick={() => setDeptModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Department
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or code..." 
              className="pl-10 bg-white border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4">
          <TabsTrigger value="departments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Departments ({departments.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <List className="mr-2 h-4 w-4" />
            Service Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Code</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">Loading departments...</TableCell>
                  </TableRow>
                ) : filteredDepts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">No departments found.</TableCell>
                  </TableRow>
                ) : (
                  filteredDepts.map((dept) => (
                    <TableRow key={dept.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">{dept.code || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={dept.isActive ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(dept.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Category Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Description</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">Loading categories...</TableCell>
                  </TableRow>
                ) : filteredCats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">No categories found.</TableCell>
                  </TableRow>
                ) : (
                  filteredCats.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-slate-500 text-sm max-w-xs truncate">{cat.description || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={cat.isActive ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(cat.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <DepartmentFormModal 
        open={deptModalOpen} 
        onOpenChange={setDeptModalOpen} 
        onSuccess={fetchData} 
      />
      <ServiceCategoryFormModal 
        open={catModalOpen} 
        onOpenChange={setCatModalOpen} 
        onSuccess={fetchData} 
      />
    </div>
  )
}
