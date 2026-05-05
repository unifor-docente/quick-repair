import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TicketPage } from './pages/TicketPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ticket/:ticketId" element={<TicketPage />} />
      </Routes>
    </BrowserRouter>
  );
}
