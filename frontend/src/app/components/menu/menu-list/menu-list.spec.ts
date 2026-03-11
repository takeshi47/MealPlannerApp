import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuList } from './menu-list';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subscriber } from 'rxjs';
import { MenuService } from '../../../services/menu-service';

describe('MenuList', () => {
  let component: MenuList;
  let fixture: ComponentFixture<MenuList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('コンポーネントが作成されること', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit で menus$ が初期化されること', () => {
    component.ngOnInit();
    expect(component['menus$']).toBeDefined();
  });

  it('削除に失敗した場合、アラートが表示されること', () => {
    const menuService = TestBed.inject(MenuService);
    const mockError = { status: 500, error: { error: 'Internal Error' }, message: 'Server Error' };
    spyOn(menuService, 'delete').and.returnValue(
      new Observable((subscriber: Subscriber<void>) => subscriber.error(mockError)),
    );
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component['onDelete'](1);

    expect(window.alert).toHaveBeenCalled();
  });

  it('食事に紐付いているメニューは削除ボタンが非表示であること', () => {
    const menuService = TestBed.inject(MenuService);
    const mockMenus = [
      { id: 1, name: '削除可能なメニュー', ingredients: [], canDelete: true },
      { id: 2, name: '食事に紐付いているメニュー', ingredients: [], canDelete: false },
    ];
    spyOn(menuService, 'fetchAll').and.returnValue(of(mockMenus));

    component.ngOnInit();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');

    // 1行目 (削除可能)
    const firstRowButtons = rows[0].textContent;
    expect(firstRowButtons).toContain('削除');

    // 2行目 (削除不可)
    const secondRowButtons = rows[1].textContent;
    expect(secondRowButtons).not.toContain('削除');
  });
});
