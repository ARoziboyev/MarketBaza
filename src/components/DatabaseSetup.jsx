export default function DatabaseSetup({ error }) {
  const projectId = 'nusqwqycwnejtywfbqsv';
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;

  return (
    <div className="db-setup-wrap">
      <div className="db-setup-card">
        <div className="db-setup-icon">DB</div>
        <div className="db-setup-kicker">MarketBaza · Supabase</div>
        <h1>Supabase bazasi hali sozlanmagan</h1>
        <p className="db-setup-lead">
          <code>public.products</code>, <code>public.sales</code> yoki <code>public.printer_settings</code> jadvallari Supabase loyihangizda topilmadi.
        </p>

        <div className="db-setup-steps">
          <div><b>1.</b><span>Supabase Dashboard → <b>SQL Editor</b> ni oching.</span></div>
          <div><b>2.</b><span>Proyekt ichidagi <code>supabase/schema.sql</code> faylining hammasini nusxalang.</span></div>
          <div><b>3.</b><span>SQL Editor'ga joylashtirib <b>Run</b> tugmasini bosing.</span></div>
          <div><b>4.</b><span>Keyin MarketBaza sahifasini <b>Ctrl + R</b> bilan yangilang.</span></div>
        </div>

        <a className="btn btn-gold db-setup-link" href={sqlEditorUrl} target="_blank" rel="noreferrer">
          Supabase SQL Editor'ni ochish
        </a>

        <details className="db-setup-details">
          <summary>Nega bu xato chiqdi?</summary>
          <p>
            <code>PGRST205</code> — Supabase REST API jadvalni schema cache ichidan topa olmayotganini bildiradi. Bu React kodi xatosi emas; jadval hali yaratilmagan yoki yangi yaratilgan jadval schema cache'ga hali qaytmagan.
          </p>
          {error?.message && <pre>{error.message}</pre>}
        </details>
      </div>
    </div>
  );
}