---
applyTo:
  - "**/*.component.ts"
  - "**/*.service.ts"
  - "**/*.module.ts"
  - "**/*.directive.ts"
  - "**/*.pipe.ts"
category: "Angular Framework"
dependencies:
  - "@angular/core"
  - "@angular/common"
description: "Angular 17.0.0+ development guidelines and best practices"
fileTypes:
  - typescript
  - html
  - scss
  - css
framework: angular
lastModified: "2025-01-31T20:15:42.789Z"
priority: 100
requiredPlugins:
  - "@angular-eslint/eslint-plugin"
tags:
  - angular
  - angular-17
  - control-flow
  - signals
  - high-confidence
version: 17.0.0
---

# Angular 17+ Development Guidelines

*Framework-specific instructions for Angular 17.0.0+ with modern patterns*

## New Control Flow Syntax (Preferred)

Use Angular 17's new control flow syntax for better performance and type safety:

```typescript
@Component({
  template: `
    <!-- ✅ Preferred: New control flow -->
    @if (user) {
      <div class="user-profile">
        <h2>{{ user.name }}</h2>
        @if (user.avatar) {
          <img [src]="user.avatar" [alt]="user.name" />
        }
      </div>
    } @else {
      <div class="login-prompt">
        <p>Please log in to continue</p>
      </div>
    }

    <!-- ✅ Preferred: New for loop with tracking -->
    @for (item of items; track item.id) {
      <div class="item">{{ item.name }}</div>
    }

    <!-- ✅ Preferred: Switch statements -->
    @switch (status) {
      @case ('loading') {
        <app-spinner />
      }
      @case ('error') {
        <app-error-message [error]="error" />
      }
      @default {
        <app-content [data]="data" />
      }
    }
  `
})
export class ModernComponent {}
```

## Signals for State Management

Leverage Angular signals for reactive state management:

```typescript
@Component({
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <p>Double: {{ doubleCount() }}</p>
      <button (click)="increment()">+</button>
      <button (click)="decrement()">-</button>
    </div>
  `
})
export class CounterComponent {
  // ✅ Use signals for simple state
  count = signal(0);
  
  // ✅ Use computed for derived state
  doubleCount = computed(() => this.count() * 2);
  
  // ✅ Methods that update signals
  increment() {
    this.count.update(value => value + 1);
  }
  
  decrement() {
    this.count.set(Math.max(0, this.count() - 1));
  }
}
```

## Standalone Components (Default)

Prefer standalone components for better tree-shaking and simplicity:

```typescript
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule],
  template: `
    <div class="profile-container">
      <h1>{{ user().name }}</h1>
      <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
        <!-- form content -->
      </form>
    </div>
  `
})
export class UserProfileComponent {
  user = input.required<User>();
  
  profileForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });
  
  constructor(private fb: FormBuilder) {}
  
  onSubmit() {
    if (this.profileForm.valid) {
      // Handle form submission
    }
  }
}
```

## Modern Input/Output Patterns

Use the new input/output decorators:

```typescript
@Component({
  selector: 'app-product-card',
  standalone: true,
  template: `
    <div class="card" (click)="onCardClick()">
      <h3>{{ product().name }}</h3>
      <p>{{ product().price | currency }}</p>
      <button 
        [disabled]="loading()" 
        (click)="onPurchase($event)">
        {{ loading() ? 'Processing...' : 'Buy Now' }}
      </button>
    </div>
  `
})
export class ProductCardComponent {
  // ✅ Required input with validation
  product = input.required<Product>();
  
  // ✅ Optional input with default
  showDescription = input(false);
  
  // ✅ Modern output pattern
  purchase = output<Product>();
  cardClick = output<void>();
  
  loading = signal(false);
  
  onPurchase(event: Event) {
    event.stopPropagation();
    this.loading.set(true);
    
    // Emit the purchase event
    this.purchase.emit(this.product());
    
    // Reset loading state
    setTimeout(() => this.loading.set(false), 1000);
  }
  
  onCardClick() {
    this.cardClick.emit();
  }
}
```

## Service Patterns with Signals

Create reactive services using signals:

```typescript
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userSignal = signal<User | null>(null);
  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  
  // ✅ Public readonly signals
  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  
  // ✅ Computed values
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly userName = computed(() => this.user()?.name ?? 'Guest');
  
  constructor(private http: HttpClient) {}
  
  async loadUser(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    try {
      const user = await firstValueFrom(
        this.http.get<User>(`/api/users/${id}`)
      );
      this.userSignal.set(user);
    } catch (error) {
      this.errorSignal.set('Failed to load user');
      console.error('User loading failed:', error);
    } finally {
      this.loadingSignal.set(false);
    }
  }
  
  logout(): void {
    this.userSignal.set(null);
    this.errorSignal.set(null);
  }
}
```

## Hybrid State Management

Combine signals with observables for complex scenarios:

```typescript
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);
  
  // ✅ Signals for simple state
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadCount = computed(() => 
    this.notifications().filter(n => !n.read).length
  );
  
  // ✅ Observables for streams
  private notificationStream$ = new Subject<Notification>();
  
  readonly notifications$ = merge(
    this.notificationStream$,
    this.webSocketService.notifications$
  ).pipe(
    tap(notification => this.addNotification(notification)),
    shareReplay(1)
  );
  
  private addNotification(notification: Notification): void {
    this.notificationsSignal.update(notifications => 
      [...notifications, notification]
    );
  }
  
  markAsRead(id: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    );
  }
}
```

## Testing with Angular 17+

Test components with signals and new patterns:

```typescript
describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;
  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent] // ✅ Import standalone component
    }).compileComponents();
    
    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  it('should increment count signal', () => {
    expect(component.count()).toBe(0);
    
    component.increment();
    expect(component.count()).toBe(1);
    expect(component.doubleCount()).toBe(2);
  });
  
  it('should update template when signal changes', () => {
    const compiled = fixture.nativeElement;
    
    component.increment();
    fixture.detectChanges();
    
    expect(compiled.textContent).toContain('Count: 1');
    expect(compiled.textContent).toContain('Double: 2');
  });
});
```

## Migration Guidelines

When upgrading from older Angular versions:

### From NgModules to Standalone
```typescript
// ❌ Old NgModule pattern
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule, FormsModule],
  exports: [MyComponent]
})
export class MyModule {}

// ✅ New standalone pattern
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  // ... component definition
})
export class MyComponent {}
```

### From *ngIf to @if
```typescript
// ❌ Legacy structural directive
template: `
  <div *ngIf="user; else noUser">
    Welcome {{ user.name }}!
  </div>
  <ng-template #noUser>
    Please log in
  </ng-template>
`

// ✅ New control flow
template: `
  @if (user) {
    <div>Welcome {{ user.name }}!</div>
  } @else {
    <div>Please log in</div>
  }
`
```

## Performance Best Practices

- Use `OnPush` change detection with signals for optimal performance
- Leverage computed signals for expensive calculations
- Implement proper track functions with @for loops
- Use `async` pipe with observables to prevent memory leaks
- Consider lazy loading for feature modules
- Optimize bundle size with standalone components

## Architecture Recommendations

- Start new projects with standalone components
- Use signals for component-level state
- Reserve observables for data streams and complex async operations  
- Implement proper error boundaries with error handling
- Follow Angular's style guide for naming conventions
- Use Angular's built-in testing utilities for comprehensive testing