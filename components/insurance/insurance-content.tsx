"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Building2, FileText, CheckCircle2, AlertTriangle, MoreHorizontal, Download, Filter, ShieldCheck, History } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { StatCard } from "@/components/shared/stat-card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { insuranceApi, type InsuranceCompany, type InsuranceClaim, type InsurancePolicy } from "@/lib/api"
import { format } from "date-fns"

interface InsuranceContentProps {
  companies?: InsuranceCompany[]
  claims?: InsuranceClaim[]
  policies?: InsurancePolicy[]
  onRefresh?: () => void
}

export function InsuranceContent({
  companies = [],
  claims = [],
  policies = [],
  onRefresh
}: InsuranceContentProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [claimSearch, setClaimSearch] = useState("")
  const [claimStatus, setClaimStatus] = useState("all")
  const [policySearch, setPolicySearch] = useState("")

  // Modals state
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [isAddPolicyOpen, setIsAddPolicyOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null)
  const [isUpdateClaimOpen, setIsUpdateClaimOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculations for KPI
  const stats = useMemo(() => {
    const totalApproved = claims.filter(c => c.status === 'approved' || c.status === 'settled').length
    const approvalRate = claims.length > 0 ? (totalApproved / claims.length) * 100 : 0
    const expiringSoon = policies.filter(p => {
      if (!p.expiry_date) return false
      const expiry = new Date(p.expiry_date)
      const now = new Date()
      const diff = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24)
      return diff >= 0 && diff <= 30
    }).length

    const totalRevenue = claims.reduce((acc, curr) => acc + (curr.approvedAmount || 0), 0)

    return { totalApproved, approvalRate, expiringSoon, totalRevenue }
  }, [claims, policies])

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchSearch =
        !claimSearch ||
        c.patientName?.toLowerCase().includes(claimSearch.toLowerCase()) ||
        c.claimId?.toLowerCase().includes(claimSearch.toLowerCase())
      const matchStatus = claimStatus === "all" || c.status === claimStatus
      return matchSearch && matchStatus
    })
  }, [claims, claimSearch, claimStatus])

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchSearch =
        !policySearch ||
        p.policyNumber?.toLowerCase().includes(policySearch.toLowerCase()) ||
        p.companyName?.toLowerCase().includes(policySearch.toLowerCase())
      return matchSearch
    })
  }, [policies, policySearch])

  const handleUpdateClaimStatus = async (status: string, approvedAmount?: number) => {
    if (!selectedClaim) return
    setIsSubmitting(true)
    try {
      await insuranceApi.updateClaim(selectedClaim.id, { status: status as any, approvedAmount })
      toast.success("Claim updated successfully")
      setIsUpdateClaimOpen(false)
      onRefresh?.()
    } catch (e) {
      toast.error("Failed to update claim")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insurance Management"
        description="Manage patient policies, claims, and insurance partnerships."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddCompanyOpen(true)}>
            <Building2 className="mr-2 size-4" />
            Add Provider
          </Button>
          <Button onClick={() => setIsAddPolicyOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Policy
          </Button>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="companies">Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Providers"
              value={companies.length}
              icon={Building2}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatCard
              title="Approval Rate"
              value={`${stats.approvalRate.toFixed(1)}%`}
              icon={CheckCircle2}
              description={`${stats.totalApproved} approved claims`}
              iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            />
            <StatCard
              title="Expiring Soon"
              value={stats.expiringSoon}
              icon={AlertTriangle}
              description="Policies expiring in 30 days"
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            />
            <StatCard
              title="Insurance Revenue"
              value={`$${stats.totalRevenue.toLocaleString()}`}
              icon={ShieldCheck}
              description="Total reimbursements received"
              iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="size-4" />
                  Recent Claims
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Patient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.slice(0, 5).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="pl-6 font-medium">{c.patientName}</TableCell>
                        <TableCell>${Number(c.claimAmount).toLocaleString()}</TableCell>
                        <TableCell><StatusBadge status={c.status} /></TableCell>
                        <TableCell className="text-right pr-6 text-muted-foreground">
                          {format(new Date(c.submittedAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  Active Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="space-y-4">
                  {companies.slice(0, 5).map((comp) => {
                    const count = policies.filter(p => p.companyId === comp.id).length
                    return (
                      <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {comp.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{comp.name}</p>
                            <p className="text-xs text-muted-foreground">{count} active policies</p>
                          </div>
                        </div>
                        <StatusBadge status={comp.status} />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Patient Insurance Policies</CardTitle>
                <div className="relative w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search policy or patient..."
                    className="pl-9 h-9"
                    value={policySearch}
                    onChange={(e) => setPolicySearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Policy No.</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 font-mono text-xs">{p.policyNumber}</TableCell>
                      <TableCell className="font-semibold">{p.companyName}</TableCell>
                      <TableCell className="capitalize">{p.coverageType}</TableCell>
                      <TableCell>${p.coverageLimit.toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                        ${p.balanceRemaining.toLocaleString()}
                      </TableCell>
                      <TableCell>{p.expiry_date ? format(new Date(p.expiry_date), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { }}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { }}>Edit Policy</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={async () => {
                              if (confirm("Delete policy?")) {
                                await insuranceApi.deletePolicy(p.id)
                                onRefresh?.()
                              }
                            }}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Insurance Claims Tracking</CardTitle>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient or claim ID..."
                      className="pl-9 h-9"
                      value={claimSearch}
                      onChange={(e) => setClaimSearch(e.target.value)}
                    />
                  </div>
                  <Select value={claimStatus} onValueChange={setClaimStatus}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under-review">Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Claim ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{c.claimId}</TableCell>
                      <TableCell className="font-semibold">{c.patientName}</TableCell>
                      <TableCell>{c.insuranceCompany}</TableCell>
                      <TableCell>{format(new Date(c.submittedAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right font-medium">${Number(c.claimAmount).toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedClaim(c)
                              setIsUpdateClaimOpen(true)
                            }}>Update Status</DropdownMenuItem>
                            <DropdownMenuItem disabled={c.status !== 'approved' && c.status !== 'settled'}>
                              <Download className="mr-2 size-4" />
                              Download Vouch
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Licensed Insurance Providers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Provider Name</TableHead>
                    <TableHead>Coordinator</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6 font-semibold">{c.name}</TableCell>
                      <TableCell>{c.contactPerson ?? "—"}</TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>{c.email ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Claim Update Modal */}
      <Dialog open={isUpdateClaimOpen} onOpenChange={setIsUpdateClaimOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Insurance Claim</DialogTitle>
            <DialogDescription>
              Processing claim <strong>{selectedClaim?.claimId}</strong> for {selectedClaim?.patientName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Claim Status</Label>
              <Select defaultValue={selectedClaim?.status} onValueChange={(v) => setSelectedClaim(prev => prev ? { ...prev, status: v as any } : null)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Approved Amount ($)</Label>
              <Input
                type="number"
                defaultValue={selectedClaim?.approvedAmount}
                onChange={(e) => setSelectedClaim(prev => prev ? { ...prev, approvedAmount: parseFloat(e.target.value) } : null)}
              />
              <p className="text-xs text-muted-foreground">Original Claim: ${selectedClaim?.claimAmount}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateClaimOpen(false)}>Cancel</Button>
            <Button
              onClick={() => handleUpdateClaimStatus(selectedClaim?.status || '', selectedClaim?.approvedAmount)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Company Modal */}
      <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Insurance Provider</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            setIsSubmitting(true)
            try {
              await insuranceApi.createCompany({
                name: formData.get('name') as string,
                contactPerson: formData.get('contact') as string,
                phone: formData.get('phone') as string,
                email: formData.get('email') as string,
                status: 'active'
              })
              toast.success("Provider added")
              setIsAddCompanyOpen(false)
              onRefresh?.()
            } catch { toast.error("Failed to add provider") }
            finally { setIsSubmitting(false) }
          }} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Provider Name</Label>
              <Input name="name" required placeholder="e.g. Aetna, BlueCross" />
            </div>
            <div className="grid gap-2">
              <Label>Contact Person</Label>
              <Input name="contact" placeholder="Coordinator Name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input name="phone" placeholder="+1..." />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="insurance@provider.com" />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddCompanyOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Save Provider</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Policy Modal */}
      <Dialog open={isAddPolicyOpen} onOpenChange={setIsAddPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Patient Policy</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            setIsSubmitting(true)
            try {
              await insuranceApi.createPolicy({
                patientId: formData.get('patientId') as string,
                companyId: formData.get('companyId') as string,
                policyNumber: formData.get('policyNumber') as string,
                coverageType: formData.get('coverageType') as any,
                coverageLimit: parseFloat(formData.get('limit') as string),
                coPayPercent: parseFloat(formData.get('copay') as string),
                expiry_date: formData.get('expiry') as string,
              })
              toast.success("Policy registered")
              setIsAddPolicyOpen(false)
              onRefresh?.()
            } catch { toast.error("Failed to register policy") }
            finally { setIsSubmitting(false) }
          }} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Patient ID</Label>
              <Input name="patientId" required placeholder="Enter Patient ID" />
            </div>
            <div className="grid gap-2">
              <Label>Insurance Provider</Label>
              <Select name="companyId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Policy Number</Label>
              <Input name="policyNumber" required placeholder="POL-12345678" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Coverage Type</Label>
                <Select name="coverageType" defaultValue="partial">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Coverage</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="co-pay">Co-Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Expiry Date</Label>
                <Input name="expiry" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Coverage Limit ($)</Label>
                <Input name="limit" type="number" defaultValue="5000" />
              </div>
              <div className="grid gap-2">
                <Label>Co-Pay (%)</Label>
                <Input name="copay" type="number" defaultValue="20" />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddPolicyOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Register Policy</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
