import { Component, inject, OnInit } from '@angular/core';
import { MenuService } from '../../../services/menu-service';
import { catchError, EMPTY, Observable } from 'rxjs';
import { Menu } from '../../../models/menu';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { MenuForm } from '../menu-form/menu-form';

@Component({
  selector: 'app-menu-list',
  imports: [CommonModule],
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.scss',
})
export class MenuList implements OnInit {
  private menuService = inject(MenuService);
  private modalService = inject(NgbModal);
  protected menus$!: Observable<Menu[]>;

  ngOnInit(): void {
    this.loadMenus();
  }

  private loadMenus(): void {
    this.menus$ = this.menuService.fetchAll().pipe(
      catchError((err) => {
        console.error(err);
        return EMPTY;
      }),
    );
  }

  protected onDelete(id: number): void {
    if (!confirm('本当に削除して大丈夫？')) {
      return;
    }

    // todo: 削除処理
    console.log(id);
  }

  protected openMenuForm(id: number | null = null): void {
    const modalRef = this.modalService.open(MenuForm, {
      size: 'mg',
    });

    modalRef.componentInstance.id = id;

    modalRef.result.then(
      () => {
        this.loadMenus();
      },
      (reject) => {
        console.log(reject);
      },
    );
  }
}
