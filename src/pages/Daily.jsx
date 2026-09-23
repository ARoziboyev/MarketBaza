import { useData } from '../context/DataContext';
import { fmt, fmtDate } from '../lib/format';
import { dailySeries } from '../lib/stats';
import LineChart from '../components/LineChart';

export default function Daily() {
  const { sales } = useData();
  const seriesAsc = dailySeries(sales, 30);
  const seriesDesc = [...seriesAsc].reverse();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Kunlik daromad</h1>
          <div className="page-sub">Oxirgi 30 kunlik tushum va foyda hisobot</div>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="section-title">Kunlik tushum</div>
        <LineChart data={seriesAsc.map((d) => d.revenue)} color="#C68A2E" />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th>Sana</th><th>Tushum</th><th>Foyda</th><th>Cheklar</th><th>Sotilgan</th></tr>
              {seriesDesc.length ? seriesDesc.map((d, i) => (
                <tr key={i}>
                  <td>{fmtDate(d.date)}</td>
                  <td className="mono-num">{fmt(d.revenue)}</td>
                  <td className="mono-num">{fmt(d.profit)}</td>
                  <td className="mono-num">{d.count}</td>
                  <td className="mono-num">{d.items} dona</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="empty-state">Ma'lumot yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}