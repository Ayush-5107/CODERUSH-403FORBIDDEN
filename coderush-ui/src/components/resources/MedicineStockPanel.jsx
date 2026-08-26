// Split out from HospitalCapacityPanel if the medicine-queue view needs to
// grow beyond a "low stock" flag — e.g. a dedicated queue/backorder view
// once the algorithm side models medicine restocking as its own resource.
export default function MedicineStockPanel({ medicineStock }) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <h2 className="text-sm font-semibold mb-2">Medicine stock</h2>
      <div className="flex flex-col gap-1 text-xs">
        {medicineStock.map((m) => (
          <div key={`${m.hospitalId}-${m.drug}`} className="flex justify-between text-white/60">
            <span>{m.drug}</span>
            <span>{m.unitsRemaining} units</span>
          </div>
        ))}
      </div>
    </div>
  )
}
