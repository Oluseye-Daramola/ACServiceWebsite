import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui";
import { AppLayout, PublicLayout, RequireRole } from "./components/Layouts";

import Home from "./pages/public/Home";
import Contact from "./pages/public/Contact";
import About from "./pages/public/About";
import Projects from "./pages/public/Projects";
import { ServiceDetailPage, ServicesOverview } from "./pages/public/ServicesPages";
import { ForgotPassword, Login, NotFound, ResetPassword } from "./pages/public/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import { EnquiriesList, EnquiryDetail } from "./pages/admin/Enquiries";
import { ClientDetail, ClientsList } from "./pages/admin/Clients";
import { TechnicianDetail, TechniciansList } from "./pages/admin/Technicians";
import { InvoiceDetail, InvoiceNew, InvoicesList } from "./pages/admin/Invoices";
import { PaymentDetail, PaymentsList } from "./pages/admin/Payments";
import { ServiceDetail, ServicesList } from "./pages/services/Services";
import { ServiceNew } from "./pages/services/ServiceForm";
import { ReportDetail, ReportsList } from "./pages/reports/Reports";

const admin = (el) => <RequireRole role="admin">{el}</RequireRole>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public website */}
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="services" element={<ServicesOverview />} />
              <Route path="services/:slug" element={<ServiceDetailPage />} />
              <Route path="about" element={<About />} />
              <Route path="projects" element={<Projects />} />
              <Route path="contact" element={<Contact />} />
              <Route path="login" element={<Login />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              {/* Path is fixed by the backend's reset email: {CLIENT_URL}/reset-password?token= */}
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Staff area (admin + technician) */}
            <Route path="app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />

              <Route path="services" element={<ServicesList />} />
              <Route path="services/new" element={admin(<ServiceNew />)} />
              <Route path="services/:id" element={<ServiceDetail />} />
              <Route path="reports" element={<ReportsList />} />
              <Route path="reports/:id" element={<ReportDetail />} />

              <Route path="enquiries" element={admin(<EnquiriesList />)} />
              <Route path="enquiries/:id" element={admin(<EnquiryDetail />)} />
              <Route path="clients" element={admin(<ClientsList />)} />
              <Route path="clients/:id" element={admin(<ClientDetail />)} />
              <Route path="technicians" element={admin(<TechniciansList />)} />
              <Route path="technicians/:id" element={admin(<TechnicianDetail />)} />
              <Route path="invoices" element={admin(<InvoicesList />)} />
              <Route path="invoices/new" element={admin(<InvoiceNew />)} />
              <Route path="invoices/:id" element={admin(<InvoiceDetail />)} />
              <Route path="payments" element={admin(<PaymentsList />)} />
              <Route path="payments/:id" element={admin(<PaymentDetail />)} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
