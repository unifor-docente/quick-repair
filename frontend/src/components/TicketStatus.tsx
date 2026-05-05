import { useState } from 'react';
import { validateTicket } from '../api/client';
import type { Ticket, TicketStatus } from '../types';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  OUT_OF_WARRANTY: 'Fora da garantia',
  ASSIGNED: 'Tecnico alocado',
  TECHNICIAN_COMPLETED: 'Aguardando validacao',
  CLIENT_VALIDATED: 'Validado pelo cliente',
  AUTO_CLOSED: 'Encerrado automaticamente',
  CLOSED: 'Encerrado',
};

const STATUS_CLASSES: Record<TicketStatus, string> = {
  OPEN: 'border-amber-200 bg-amber-50 text-amber-800',
  OUT_OF_WARRANTY: 'border-slate-200 bg-slate-100 text-slate-700',
  ASSIGNED: 'border-blue-200 bg-blue-50 text-blue-800',
  TECHNICIAN_COMPLETED: 'border-violet-200 bg-violet-50 text-violet-800',
  CLIENT_VALIDATED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  AUTO_CLOSED: 'border-slate-200 bg-slate-100 text-slate-600',
  CLOSED: 'border-slate-200 bg-slate-100 text-slate-600',
};

interface Props {
  ticket: Ticket;
  onRefresh: () => void;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}

function formatDate(value?: string): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TicketStatus({ ticket, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    setError(null);
    setLoading(true);

    try {
      await validateTicket(ticket.rowKey);
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Chamado</p>
          <p className="break-all font-mono text-sm font-semibold text-slate-900">{ticket.rowKey}</p>
        </div>
        <span
          className={`inline-flex w-fit rounded-lg border px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[ticket.status]}`}
        >
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cliente</dt>
          <dd className="mt-1 font-medium text-slate-900">{ticket.clientName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Contrato</dt>
          <dd className="mt-1 font-medium text-slate-900">{ticket.contractId}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Imovel</dt>
          <dd className="mt-1 font-medium text-slate-900">{ticket.propertyName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Problema</dt>
          <dd className="mt-1 font-medium text-slate-900">{ticket.problemType}</dd>
        </div>
        {ticket.technicianName && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tecnico</dt>
            <dd className="mt-1 font-medium text-slate-900">{ticket.technicianName}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Criado em</dt>
          <dd className="mt-1 font-medium text-slate-900">{formatDate(ticket.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Descricao</p>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {ticket.description}
        </p>
      </div>

      {ticket.status === 'TECHNICIAN_COMPLETED' && (
        <div className="mt-5 rounded-lg border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm text-violet-900">
            Visita concluida em {formatDate(ticket.technicianCompletedAt)}. A validacao fica
            disponivel por 72 horas.
          </p>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <button
            type="button"
            onClick={handleValidate}
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Validando...' : 'Confirmar atendimento resolvido'}
          </button>
        </div>
      )}
    </article>
  );
}
