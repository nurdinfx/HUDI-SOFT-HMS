"use client"

import { useState, useEffect } from "react"
import { paymentsApi } from "@/lib/api"
import { PaymentsContent } from "@/components/payments/payments-content"

export default function PaymentsPage() {
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchPayments = async () => {
        try {
            const data = await paymentsApi.getAll()
            setPayments(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayments()
    }, [])

    if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading payments...</p></div>

    return <PaymentsContent payments={payments} onRefresh={fetchPayments} />
}
