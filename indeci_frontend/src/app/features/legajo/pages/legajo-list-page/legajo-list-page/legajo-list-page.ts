import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { LegajoApiService } from '../../../services/legajo-api';
import { PersonaResumenItem } from '../../../models/legajo.model';

@Component({
  selector: 'app-legajo-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './legajo-list-page.html',
  styleUrl: './legajo-list-page.scss',
})
export class LegajoListPage implements OnInit {
  private readonly api = inject(LegajoApiService);
  private readonly router = inject(Router);

  filtro = '';

  page = 0;
  size = 20;
  readonly pageSizeOptions = [10, 20, 50, 100];

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly personas = signal<PersonaResumenItem[]>([]);
  readonly totalElements = signal(0);

  ngOnInit(): void {
    this.cargarPersonas();
  }

  buscar(): void {
    this.page = 0;
    this.cargarPersonas();
  }

  limpiar(): void {
    this.filtro = '';
    this.page = 0;
    this.size = 20;
    this.cargarPersonas();
  }

  cambiarPagina(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.cargarPersonas();
  }

  cargarPersonas(): void {
    const q = this.filtro.trim();

    this.error.set(null);
    this.cargando.set(true);

    this.api.buscarPersonasLegajo(q, this.page, this.size).subscribe({
      next: (page) => {
        this.personas.set(page.content ?? []);
        this.totalElements.set(page.totalElements ?? 0);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error cargando personas:', err);
        this.error.set('No se pudo cargar la lista de personas.');
        this.personas.set([]);
        this.totalElements.set(0);
        this.cargando.set(false);
      },
    });
  }

  verLegajo(item: PersonaResumenItem): void {
    if (!item.id) {
      this.error.set('La persona seleccionada no tiene personaId.');
      return;
    }

    this.router.navigate(['/legajo', item.id]);
  }
}