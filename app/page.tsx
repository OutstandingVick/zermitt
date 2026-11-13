export default function Home() {
  return (
    <main className="container stack">
      <section className="stack-sm">
        <h1>Send money home with one sentence.</h1>
        <p className="lead">
          Type &ldquo;send $50 to mum&rdquo;. Zermitt routes it into dollars (USDC) on NEAR and
          sends a link. Mum claims it with Google — no wallet, no gas, no crypto words.
        </p>
      </section>

      <ol className="steps card">
        <li className="step">
          <span className="step-num">1</span>
          <div>
            <strong>Type</strong>
            <p className="small muted" style={{ margin: 0 }}>Say who and how much, in plain words.</p>
          </div>
        </li>
        <li className="step">
          <span className="step-num">2</span>
          <div>
            <strong>Send</strong>
            <p className="small muted" style={{ margin: 0 }}>See a live quote and fee, confirm, share the link.</p>
          </div>
        </li>
        <li className="step">
          <span className="step-num">3</span>
          <div>
            <strong>Claim</strong>
            <p className="small muted" style={{ margin: 0 }}>
              They sign in with Google and get a named account with the dollars in it.
            </p>
          </div>
        </li>
      </ol>

      <a href="/send" className="btn btn-primary btn-block">Send money</a>

      <p className="trust">
        <span>Gas paid by Zermitt</span>·<span>Receipt on NEAR</span>·<span>Testnet demo</span>
      </p>
    </main>
  );
}
