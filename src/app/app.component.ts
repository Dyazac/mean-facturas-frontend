//Es la logica y el estado de la pantalla
//Controla la inteligencia del sistema, iniciar sesion, el formulario, los calculos, actualizacion de graficos.
//Se cambio  los imports que se usaban con firestore y sus metodos

import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, AsyncPipe, CurrencyPipe, NgClass } from '@angular/common';

import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from '@angular/fire/auth';

// Importamos el nuevo servicio HTTP para MockAPI y se deja de usar el que teniamos de Firestore
import { FacturasService } from './facturas.service'; //importa los datos de las facturas

import { Observable } from 'rxjs';

// Chart.js e ng2-charts
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

// Los datos que exportamos a MockAPI para guardar la informacion
export interface Factura {
  id?: string;
  uid: string;
  proveedor: string;
  fechaEmision: string;
  fechaVencimiento: string;
  monto: number;
  estado: 'Pendiente' | 'Pagada';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, AsyncPipe, CurrencyPipe, NgClass, BaseChartDirective],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  // --- Auth ---
  email = '';
  password = '';
  registered = false;
  user$: Observable<User | null>;

  // --- Formulario ---
  proveedor = '';
  fechaEmision = '';
  fechaVencimiento = '';
  monto: number | null = null;
  estado: 'Pendiente' | 'Pagada' = 'Pendiente';

  // Modo edición
  editId: string | null = null;

  // Lista de facturas (manejada localmente al usar API REST)
  listadoFacturas: Factura[] = [];

  // --- Configuración Gráfico ---
  public pieChartType: ChartType = 'pie';
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' }
    }
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Pendientes', 'Pagadas'],
    datasets: [{ data: [0, 0] }]
  };

  // Inyectamos Auth de Firebase y FacturasService de MockAPI
  constructor(private auth: Auth, private facturasService: FacturasService) {
    this.user$ = authState(this.auth); //mira el estado de autentificacion del usuario de firebase

    // Suscripción a la API cada vez que cambia el estado de autenticación
    this.user$.subscribe(u => {
      if (u) {
        this.cargarFacturas(u.uid);
      } else {
        this.listadoFacturas = [];
        this.actualizarGrafico([]);
      }
    });
  }

  // --- Lógica MockAPI ---
  // Cuando el usuario inicia secion, se captura si uid unico de firebase y se llama estos metodos para traer solo los registros del usuario desde mockAPI
  cargarFacturas(uid: string) {
    this.facturasService.obtenerFacturas(uid).subscribe({
      next: (data) => {
        this.listadoFacturas = data;
        this.actualizarGrafico(data);
      },
      error: (err) => console.error('Error al cargar facturas', err)
    });
  }

  // --- Cálculos ---
  get totalPendiente(): number {
    return this.listadoFacturas
      .filter(f => f.estado === 'Pendiente')
      .reduce((acc, f) => acc + Number(f.monto), 0);
  }

  obtenerDiasVencimiento(fechaVencimiento: string): number {
    if (!fechaVencimiento) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVencimiento + 'T00:00:00');
    const diffTime = venc.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  obtenerSobreplazo(fechaVencimiento: string): number {
    const dias = this.obtenerDiasVencimiento(fechaVencimiento);
    return dias < 0 ? Math.abs(dias) : 0;
  }

  esVencida(f: Factura): boolean {
    return f.estado === 'Pendiente' && this.obtenerDiasVencimiento(f.fechaVencimiento) < 0;
  }

  // --- Operaciones CRUD con MockAPI ---
  guardarFactura() {
    const u = this.auth.currentUser;
    if (!u) return;

    const proveedor = this.proveedor.trim();
    const montoNum = Number(this.monto);

    if (!proveedor || !this.fechaEmision || !this.fechaVencimiento || montoNum <= 0) {
      alert('Por favor complete todos los campos correctamente. El monto debe ser > 0.');
      return;
    }

    const data: Omit<Factura, 'id'> = {
      uid: u.uid,
      proveedor,
      fechaEmision: this.fechaEmision,
      fechaVencimiento: this.fechaVencimiento,
      monto: montoNum,
      estado: this.estado
    };

    if (this.editId) {
      this.facturasService.actualizarFactura(this.editId, data).subscribe({
        next: () => {
          this.cargarFacturas(u.uid); 
          this.editId = null;
          this.resetForm();
        },
        error: (err) => alert(err.error?.error || 'Error al guardar')
      });
    } else {
      this.facturasService.crearFactura(data as Factura).subscribe({
        next: () => {
          this.cargarFacturas(u.uid); 
          this.resetForm();
        },
        error: (err) => alert(err.error?.error || 'Error al guardar')
      });
    }
  }

  editarFactura(f: Factura) {
    if (!f.id) return;
    this.editId = f.id;
    this.proveedor = f.proveedor;
    this.fechaEmision = f.fechaEmision;
    this.fechaVencimiento = f.fechaVencimiento;
    this.monto = f.monto;
    this.estado = f.estado;
  }

  cancelarEdicion() {
    this.editId = null;
    this.resetForm();
  }

  eliminarFactura(id?: string) {
    if (!id) return;
    if (!confirm('¿Desea eliminar esta factura?')) return;
    
    const u = this.auth.currentUser;
    if (!u) return;
    this.facturasService.eliminarFactura(id, u.uid).subscribe({
      next: () => this.cargarFacturas(u.uid),
      error: (err) => alert(err.error?.error || 'Error al guardar')
    });
  }

  // --- Actualizar Gráfico ---
  private actualizarGrafico(facturas: Factura[]) {
    const pendientes = facturas.filter(f => f.estado === 'Pendiente').length;
    const pagadas = facturas.filter(f => f.estado === 'Pagada').length;

    this.pieChartData = {
      labels: ['Pendientes', 'Pagadas'],
      datasets: [{ 
        data: [pendientes, pagadas],
        backgroundColor: ['#ffc107', '#198754']
      }]
    };
  }

  // --- Auth ---
  async registrar() {
    try {
      await createUserWithEmailAndPassword(this.auth, this.email, this.password);
      await signOut(this.auth);
      this.registered = true;
      this.password = '';
    } catch (err: any) {
      alert(err.message);
    }
  }

  async ingresar() {
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async ingresarConGoogle() {
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider());
    } catch (err: any) {
      alert(err.message);
    }
  }

  async salir() {
    await signOut(this.auth);
    this.email = '';
    this.password = '';
  }

  private resetForm() {
    this.proveedor = '';
    this.fechaEmision = '';
    this.fechaVencimiento = '';
    this.monto = null;
    this.estado = 'Pendiente';
  }
}