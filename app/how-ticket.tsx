"use client";
import { useState } from "react";

const states = [
  { status:"Draft", to:"Mum", settles:"—", amount:"$40.00", kicker:"You type", text:"Send $40 to Mum for groceries.", title:"Type it.", line:"Say it the way you would text it. The agent works out the rest." },
  { status:"Ready to confirm", to:"mama.zermitt.testnet", settles:"In seconds", amount:"39.78 USDC", kicker:"Quote", text:"Route, fee and arrival, shown before you confirm.", title:"Send it.", line:"Check the quote, then confirm the transfer." },
  { status:"Claimed", to:"mama.zermitt.testnet", settles:"Just now", amount:"39.78 USDC", kicker:"On WhatsApp", text:"Mama, your $40 is ready. Claim with Google.", title:"They claim it.", line:"One familiar link. No wallet setup and no gas to manage." },
];
export function HowTicket(){ const [active,setActive]=useState(0); const s=states[active]; return <div className="ticket-wrap"><div className="ticket"><div className="ticket-main"><div className="ticket-head"><span>Zermitt</span><span className="status-pill">{s.status}</span></div><div className="ticket-route"><span>USDT</span><i/><span>USDC</span></div><dl><div><dt>To</dt><dd>{s.to}</dd></div><div><dt>Settles</dt><dd>{s.settles}</dd></div><div><dt>Amount</dt><dd>{s.amount}</dd></div></dl></div><aside><small>Gas fee</small><strong>$0.00</strong><hr/><small>{s.kicker}</small><p>“{s.text}”</p></aside></div><div className="ticket-tabs" role="tablist" aria-label="Send stages">{states.map((state,i)=><button key={state.status} role="tab" aria-selected={active===i} onClick={()=>setActive(i)}><span>{i+1}</span>{state.status}</button>)}</div><h3>{s.title}</h3><p className="ticket-line" role="status">{s.line}</p></div> }
