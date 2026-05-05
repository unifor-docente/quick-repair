import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchTicket } from '../api/client';
import { TicketStatus } from '../components/TicketStatus';
import type { Ticket } from '../types';

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}

export function TicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!ticketId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [ticketId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="text-sm font-medium text-bspar-700 hover:text-bspar-600">
              Voltar
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Acompanhamento</h1>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Atualizar status
          </button>
        </header>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Carregando chamado...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && ticket && <TicketStatus ticket={ticket} onRefresh={load} />}
      </div>
    </main>
  );
}
