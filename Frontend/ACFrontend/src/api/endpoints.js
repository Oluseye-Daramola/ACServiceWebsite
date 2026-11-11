// Every backend endpoint, grouped by resource. See Backend/README.md for details.
import { http, getPdf } from "./client";

export const authApi = {
  login: (body) => http.post("/auth/login", body),
  forgotPassword: (email) => http.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => http.post("/auth/reset-password", { token, password }),
  me: () => http.get("/auth/me"),
  updateProfile: (body) => http.patch("/auth/me", body),
  changePassword: (body) => http.patch("/auth/change-password", body)
};

export const enquiryApi = {
  create: (body) => http.post("/enquiries", body), // public contact form
  list: (params) => http.get("/enquiries", params),
  get: (id) => http.get(`/enquiries/${id}`),
  updateStatus: (id, body) => http.patch(`/enquiries/${id}/status`, body),
  convert: (id, body) => http.post(`/enquiries/${id}/convert`, body),
  remove: (id) => http.del(`/enquiries/${id}`)
};

export const clientApi = {
  list: (params) => http.get("/clients", params),
  create: (body) => http.post("/clients", body),
  get: (id) => http.get(`/clients/${id}`),
  update: (id, body) => http.patch(`/clients/${id}`, body),
  remove: (id) => http.del(`/clients/${id}`)
};

export const technicianApi = {
  list: (params) => http.get("/technicians", params),
  create: (body) => http.post("/technicians", body),
  get: (id) => http.get(`/technicians/${id}`),
  update: (id, body) => http.patch(`/technicians/${id}`, body),
  resetPassword: (id, password) => http.patch(`/technicians/${id}/reset-password`, { password }),
  deactivate: (id) => http.del(`/technicians/${id}`)
};

export const serviceApi = {
  list: (params) => http.get("/services", params),
  get: (id) => http.get(`/services/${id}`),
  create: (body) => http.post("/services", body),
  update: (id, body) => http.patch(`/services/${id}`, body),
  assign: (id, technicianId) => http.patch(`/services/${id}/assign`, { technicianId }),
  setStatus: (id, status) => http.patch(`/services/${id}/status`, { status }), // admin
  progress: (id, body) => http.patch(`/services/${id}/progress`, body), // technician
  remove: (id) => http.del(`/services/${id}`)
};

export const reportApi = {
  list: (params) => http.get("/reports", params),
  get: (id) => http.get(`/reports/${id}`),
  getByService: (serviceId) => http.get(`/reports/service/${serviceId}`),
  create: (body) => http.post("/reports", body),
  update: (id, body) => http.patch(`/reports/${id}`, body),
  addPhotos: (id, files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append("photos", f));
    return http.upload(`/reports/${id}/photos`, fd);
  },
  sign: (id, body) => http.post(`/reports/${id}/sign`, body),
  sendEmail: (id, email) => http.post(`/reports/${id}/send-email`, email ? { email } : {}),
  pdf: (id, filename, mode) => getPdf(`/reports/${id}/pdf`, filename, mode)
};

export const invoiceApi = {
  list: (params) => http.get("/invoices", params),
  create: (body) => http.post("/invoices", body),
  get: (id) => http.get(`/invoices/${id}`),
  update: (id, body) => http.patch(`/invoices/${id}`, body),
  cancel: (id) => http.patch(`/invoices/${id}/cancel`),
  sendEmail: (id, email) => http.post(`/invoices/${id}/send-email`, email ? { email } : {}),
  shareWhatsapp: (id, phone) => http.post(`/invoices/${id}/share-whatsapp`, phone ? { phone } : {}),
  pdf: (id, filename, mode) => getPdf(`/invoices/${id}/pdf`, filename, mode)
};

export const transactionApi = {
  list: (params) => http.get("/transactions", params),
  record: (body) => http.post("/transactions", body),
  summary: (params) => http.get("/transactions/summary", params),
  get: (id) => http.get(`/transactions/${id}`),
  reverse: (id, reason) => http.patch(`/transactions/${id}/reverse`, { reason })
};

export const dashboardApi = {
  get: () => http.get("/dashboard")
};
