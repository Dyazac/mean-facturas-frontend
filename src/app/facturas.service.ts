// Servicio que conecta Angular con NUESTRO backend Express + MongoDB (reemplaza MockAPI)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Factura } from './app.component';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class FacturasService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // GET: facturas del usuario (uid de Firebase)
  obtenerFacturas(uid: string): Observable<Factura[]> {
    return this.http.get<Factura[]>(`${this.apiUrl}?uid=${uid}`);
  }

  // POST
  crearFactura(factura: Factura): Observable<Factura> {
    return this.http.post<Factura>(this.apiUrl, factura);
  }

  // PUT (el body incluye uid para que el servidor verifique que es el dueño)
  actualizarFactura(id: string, factura: Partial<Factura>): Observable<Factura> {
    return this.http.put<Factura>(`${this.apiUrl}/${id}`, factura);
  }

  // DELETE (uid en query para verificar dueño)
  eliminarFactura(id: string, uid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}?uid=${uid}`);
  }
}
