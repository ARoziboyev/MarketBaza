import { fmtDate } from "./format";

export function receiptText(sale) {
  const lines = [];

  lines.push("MarketBaza chek");

  lines.push(fmtDate(sale.created_at, true));

  (sale.items || []).forEach((item) => {
    lines.push(
      `${item.name} x${item.qty} = ${Math.round(item.price * item.qty)}`
    );
  });

  lines.push("Jami: " + Math.round(sale.total) + " so'm");

  lines.push("To'lov: " + (sale.type === "nasiya" ? "Nasiya" : "Naqt pul"));

  if (sale.type === "nasiya") {
    lines.push(`Xaridor: ${sale.buyer_name} / ${sale.buyer_phone}`);
  }

  return lines.join("\n");
}
