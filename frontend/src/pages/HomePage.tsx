import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketForm } from '../components/TicketForm';
import type { CreateTicketResponse } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<CreateTicketResponse | null>(null);
  const [lookupId, setLookupId] = useState('');

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticketId = lookupId.trim();
    if (ticketId) {
      navigate(`/ticket/${ticketId}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 border-b border-slate-200 pb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-bspar-600">BSPAR</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Quick Repair</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Abertura e acompanhamento de chamados de garantia para visitas tecnicas.
            </p>
          </div>

          <TicketForm onSuccess={setResult} />
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Consultar chamado</h2>
            <form onSubmit={handleLookup} className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="lookupId">
                ID do chamado
              </label>
              <input
                id="lookupId"
                type="text"
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="UUID do chamado"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-bspar-500 focus:ring-2 focus:ring-bspar-100"
              />
              <button
                type="submit"
                className="w-full rounded-lg border border-bspar-600 px-4 py-2.5 text-sm font-semibold text-bspar-700 transition hover:bg-bspar-50"
              >
                Consultar status
              </button>
            </form>
          </section>

          {result && (
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                {result.warrantyValid ? 'Chamado aberto' : 'Imovel fora da garantia'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{result.message}</p>
              <p className="mt-4 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                {result.ticketId}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {result.warrantyValid && (
                  <button
                    type="button"
                    onClick={() => navigate(`/ticket/${result.ticketId}`)}
                    className="rounded-lg bg-bspar-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-bspar-700"
                  >
                    Ver chamado
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir outro
                </button>
              </div>
            </section>
          )}

        </aside>
      </div>
    </main>
  );
}
