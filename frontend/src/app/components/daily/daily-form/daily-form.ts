import { ChangeDetectorRef, Component, inject, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DailyService } from '../../../services/daily-service';
import { MenuService } from '../../../services/menu-service';
import { Menu } from '../../../models/menu';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { Daily } from '../../../models/daily';

export interface BackendFormErrors {
  [key: string]: BackendFormErrors;
}
@Component({
  selector: 'app-daily-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './daily-form.html',
  styleUrls: ['./daily-form.scss'],
})
export class DailyFormComponent implements OnInit {
  @Input() daily: Daily | null = null;
  @Input() baseDate!: string;

  private fb = inject(FormBuilder);
  private dailyService = inject(DailyService);
  private menuService = inject(MenuService);
  private cdr = inject(ChangeDetectorRef);
  private activeModal = inject(NgbActiveModal);

  private csrfToken: string | null = null;
  protected menusChoices: Menu[] | null = null;
  protected errorMessages: BackendFormErrors | null = null;

  // フォーム全体を管理するFormGroup
  protected form!: FormGroup;

  protected mealTypeChoices: { value: string; label: string }[] = [];

  private mealsMax = 1;
  private mealsMin = 1;
  private menusMin = 1;

  ngOnInit(): void {
    this.initForm();

    this.menuService.fetchAll().subscribe((menus) => {
      this.menusChoices = menus;
      this.cdr.markForCheck();
    });

    this.dailyService.getInitData().subscribe((data) => {
      this.mealTypeChoices = data.mealTypes;
      this.mealsMin = data.config.mealsMin;
      this.mealsMax = data.config.mealsMax;
      this.menusMin = data.config.menusMin;

      if (!this.daily && this.meals.length > 0 && data.mealTypes.length > 0) {
        const firstMeal = this.meals.at(0);
        firstMeal.patchValue({ mealType: data.mealTypes[0].value });
      }

      this.cdr.markForCheck();
    });

    this.dailyService.fetchCsrfToken().subscribe((token) => (this.csrfToken = token));
  }

  /**
   * フォーム送信時の処理
   */
  onSubmit(): void {
    this.errorMessages = null;

    if (this.form.invalid) {
      alert('フォーム入力に誤りがあります。');
      return;
    }

    if (this.daily?.id) {
      this.update();
    } else {
      this.create();
    }
  }

  private create(): void {
    const payload = {
      ...this.form.getRawValue(),
      _token: this.csrfToken,
    };

    this.dailyService.create(payload).subscribe({
      next: () => {
        if (confirm('registration completed!')) this.close();
      },
      error: (error) => {
        if (error?.error) {
          this.errorMessages = error.error;
          this.cdr.markForCheck();
        }
      },
    });
  }

  private update(): void {
    if (!this.daily?.id) {
      return;
    }

    const payload = {
      ...this.form.getRawValue(),
      _token: this.csrfToken,
    };

    this.dailyService.update(this.daily.id, payload).subscribe({
      next: () => {
        if (confirm('registration completed!')) this.close();
      },
      error: (error) => {
        if (error?.error) {
          this.errorMessages = error.error;
          this.cdr.markForCheck();
        }
      },
    });
  }

  private initForm(): void {
    this.form = this.fb.group({
      date: [this.daily?.date.substring(0, 10) ?? this.baseDate, Validators.required],
      meals: this.fb.array([]),
    });

    if (this.daily?.meals && this.daily.meals.length > 0) {
      this.daily.meals.forEach((meal) => {
        const mealFormGroup = this.newMeal(meal.mealType);
        const mealFormArray = mealFormGroup.get('menu') as FormArray;

        // 既存のメニュー項目をクリア
        while (mealFormArray.length !== 0) {
          mealFormArray.removeAt(0);
        }

        meal.menu.forEach((menu) => {
          const menuForm = this.menuForm(menu.id);
          mealFormArray.push(menuForm);
        });

        this.meals.push(mealFormGroup);
      });
    } else {
      // dailyId が存在しない、またはデータが取得できなかった場合、
      // 初期状態で「朝食」の入力欄を一つ追加しておく
      this.addMeal();
    }
  }

  private async fetchDaily(): Promise<void> {
    // if (!this.dailyId) {
    //   return;
    // }
    // this.daily = await firstValueFrom(this.dailyService.fetchById(this.dailyId));
  }

  protected close(): void {
    this.activeModal.close('close');
  }

  protected dismiss(): void {
    this.activeModal.dismiss('dismiss');
  }

  protected canAddMeal(): boolean {
    return this.meals.length < this.mealsMax;
  }

  protected canRemoveMeal(): boolean {
    return this.meals.length > this.mealsMin;
  }

  // protected canAddMenu(): boolean {
  //   return true;
  // }

  protected canRemoveMenu(mealIndex: number): boolean {
    return this.getMenus(mealIndex).length > this.menusMin;
  }

  /**
   * 'meals' FormArray を取得するためのゲッター
   */
  get meals(): FormArray {
    return this.form.get('meals') as FormArray;
  }

  /**
   * 指定したインデックスの 'meals' FormArray 内にある 'menu' FormArray を取得する
   * @param mealIndex 'meals' FormArray 内のインデックス
   */
  getMenus(mealIndex: number): FormArray {
    return this.meals.at(mealIndex).get('menu') as FormArray;
  }

  /**
   * 新しい食事フォームグループを作成する
   * @param mealType 食事タイプ
   */
  newMeal(mealType: string | null): FormGroup {
    const form = this.fb.group({
      mealType: [mealType ?? null],
      menu: this.fb.array([this.menuForm()]),
    });

    return form;
  }

  /**
   * 'meals' FormArray に新しい食事フォームグループを追加する
   * @param mealType 食事タイプ
   */
  addMeal(mealType: string | null = null): void {
    if (!this.canAddMeal()) {
      return;
    }

    this.meals.push(this.newMeal(mealType));
  }

  /**
   * 指定したインデックスの食事フォームグループを 'meals' FormArray から削除する
   * @param mealIndex 削除する食事のインデックス
   */
  removeMeal(mealIndex: number): void {
    if (!this.canRemoveMeal()) {
      return;
    }

    this.meals.removeAt(mealIndex);
  }

  /**
   * 指定した食事に新しいメニューコントロールを追加する
   * @param mealIndex メニューを追加する食事のインデックス
   */
  addMenu(mealIndex: number): void {
    this.getMenus(mealIndex).push(this.menuForm());
  }

  menuForm(menuId: number | null = null): FormControl {
    return this.fb.control(menuId, Validators.required);
  }

  /**
   * 指定した食事からメニューコントロールを削除する
   * @param mealIndex メニューを削除する食事のインデックス
   * @param menuIndex 削除するメニューのインデックス
   */
  removeMenu(mealIndex: number, menuIndex: number): void {
    if (!this.canRemoveMenu(mealIndex)) {
      return;
    }

    this.getMenus(mealIndex).removeAt(menuIndex);
  }
}
