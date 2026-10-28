import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../context/LanguageContext";
import Success from "./Success";

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: "success",
      data: {
        booking_id: 22,
        order_id: "PW-22",
        status: "Lunas",
        check_in: "2026-10-30",
        check_out: "2026-10-31",
        guests: 2,
        full_name: "Pelanggan Test",
        total_price: 1000000,
        villa_name: "Villa Test",
      },
    }),
  });
});

test("looks up a booking and displays its current paid status and PDF action", async () => {
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/success"]}>
        <Routes>
          <Route path="/success" element={<Success />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );

  fireEvent.change(screen.getByLabelText("Kode pesanan"), {
    target: { value: "PW-22" },
  });
  fireEvent.change(screen.getByLabelText("Email saat pemesanan"), {
    target: { value: "customer@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cek Pesanan" }));

  expect(await screen.findByText("Lunas")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Unduh PDF/ })).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});
