import { FormEvent, useState } from 'react';
import { getSasUrl, openTicket, uploadPhoto } from '../api/client';
import type { CreateTicketResponse, ProblemType } from '../types';

const PROBLEM_LABELS: Record<ProblemType, string> = {
  hidrossanitario: 'Hidrossanitario',
  eletrico: 'Eletrico',
  estrutural: 'Estrutural',
  acabamento: 'Acabamento',
  outro: 'Outro',
};

interface Props {
  onSuccess: (response: CreateTicketResponse) => void;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}

export function TicketForm({ onSuccess }: Props) {
  const [contractId, setContractId] = useState('');
  const [problemType, setProblemType] = useState<ProblemType>('hidrossanitario');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await openTicket({
        contractId: contractId.trim().toUpperCase(),
        problemType,
        description: description.trim(),
      });

      if (photos.length > 0 && response.warrantyValid) {
        for (const file of photos) {
          const { sasUrl } = await getSasUrl(response.ticketId, file.type || 'image/jpeg');
          await uploadPhoto(sasUrl, file);
        }
      }

      onSuccess(response);
      setContractId('');
      setDescription('');
      setPhotos([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contractId">
          Numero do contrato
        </label>
        <input
          id="contractId"
          type="text"
          value={contractId}
          onChange={(event) => setContractId(event.target.value)}
          placeholder="BSPAR-2024-0001"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm uppercase text-slate-900 outline-none transition focus:border-bspar-500 focus:ring-2 focus:ring-bspar-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="problemType">
          Tipo do problema
        </label>
        <select
          id="problemType"
          value={problemType}
          onChange={(event) => setProblemType(event.target.value as ProblemType)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-bspar-500 focus:ring-2 focus:ring-bspar-100"
        >
          {(Object.keys(PROBLEM_LABELS) as ProblemType[]).map((key) => (
            <option key={key} value={key}>
              {PROBLEM_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="description">
          Descricao do problema
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          required
          minLength={10}
          placeholder="Informe local, sinais visiveis e impacto no uso do imovel."
          className="w-full resize-y rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-bspar-500 focus:ring-2 focus:ring-bspar-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="photos">
          Fotos
        </label>
        <input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-bspar-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-bspar-700"
        />
        <p className="mt-1 text-xs text-slate-500">
          {photos.length > 0 ? `${photos.length} arquivo(s) selecionado(s)` : 'Opcional'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-bspar-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-bspar-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Enviando...' : 'Abrir chamado'}
      </button>
    </form>
  );
}
