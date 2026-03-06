import { POSTerminal } from "@/components/pos/pos-terminal"

export default function POSPage() {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-black tracking-tight uppercase">Point of Sale</h2>
            </div>
            <POSTerminal />
        </div>
    )
}
