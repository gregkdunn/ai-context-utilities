---
applyTo: "**/*"
priority: 1000
userOverride: true
lastModified: "2025-01-31T20:15:42.123Z"
description: "User-customizable instructions that override all automated generations"
tags:
  - user-override
  - customizable
  - highest-priority
---

# User Override Instructions

> **📝 CUSTOMIZATION GUIDE**  
> This file takes precedence over ALL automatically generated instructions.  
> Add your personal coding preferences, project-specific rules, and overrides here.  
> 
> **🔄 SAFE TO EDIT**: This file is never automatically modified by the AI Debug Context extension.

## Quick Override Examples

### Override Automated Recommendations
```typescript
// ❌ AI might suggest: Use signals for all state management
// ✅ My preference: Use RxJS observables for complex state, signals for simple values
// Reason: Team has deep RxJS expertise and existing complex state patterns

// ✅ Our hybrid approach:
@Component({
  template: `
    <!-- Simple state: use signals -->
    <p>Count: {{ count() }}</p>
    
    <!-- Complex state: use observables -->
    <div *ngIf="userProfile$ | async as profile">
      {{ profile.name }}
    </div>
  `
})
export class HybridComponent {
  // Simple state - use signals
  count = signal(0);
  
  // Complex state - use observables with operators
  userProfile$ = this.userService.getProfile().pipe(
    retry(3),
    shareReplay(1),
    catchError(this.handleError)
  );
}
```

### Custom Naming Conventions
```typescript
// ✅ My project uses specific naming patterns:
// - Services: end with 'Service' (UserService, not UserManager)
// - Components: descriptive names (UserProfileComponent, not ProfileComponent) 
// - Interfaces: start with 'I' prefix (IUser, not User)
// - Types: end with 'Type' (UserPreferencesType)
// - Enums: start with 'E' prefix (EUserRole)

// Example:
export interface IUserPreferences {
  theme: EThemeType;
  notifications: boolean;
}

export enum EThemeType {
  Light = 'light',
  Dark = 'dark',
  Auto = 'auto'
}

export type UserPreferencesType = IUserPreferences & {
  lastUpdated: Date;
};
```

## 🎯 Team-Specific Overrides

### Framework Preferences

#### State Management Philosophy
```typescript
// ✅ Our state management strategy:
// - Component state: Angular signals
// - Cross-component state: NgRx or simple services with signals
// - Server state: TanStack Query (Angular Query) for caching
// - Form state: Angular Reactive Forms

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  // ✅ Use signals for simple global state
  private themeSignal = signal<EThemeType>(EThemeType.Auto);
  readonly theme = this.themeSignal.asReadonly();
  
  updateTheme(theme: EThemeType): void {
    this.themeSignal.set(theme);
    localStorage.setItem('theme', theme);
  }
}
```

#### Component Architecture
```typescript
// ✅ Our component structure preference:
@Component({
  selector: 'app-feature-name', // Always prefix with 'app-'
  standalone: true,
  imports: [CommonModule, /* specific imports only */],
  template: `
    <!-- Template should be inline for small components -->
    <!-- Use templateUrl for templates > 10 lines -->
  `,
  styleUrl: './feature-name.component.scss', // Always external styles
  changeDetection: ChangeDetectionStrategy.OnPush // Always OnPush
})
export class FeatureNameComponent {
  // 1. Inputs first
  data = input.required<DataType>();
  config = input<ConfigType>();
  
  // 2. Outputs second
  action = output<ActionType>();
  
  // 3. Signals for local state
  private loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();
  
  // 4. Computed values
  readonly isValid = computed(() => this.validateData(this.data()));
  
  // 5. Lifecycle hooks
  ngOnInit(): void {
    // Initialization logic
  }
  
  // 6. Public methods
  onAction(): void {
    this.action.emit(/* data */);
  }
  
  // 7. Private methods last
  private validateData(data: DataType): boolean {
    return data !== null && data !== undefined;
  }
}
```

### Testing Philosophy  

#### Test Structure Preference
```typescript
// ✅ Our testing approach - flat structure with descriptive names
describe('UserProfileComponent', () => {
  let component: UserProfileComponent;
  let fixture: ComponentFixture<UserProfileComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getProfile', 'updateProfile']);
    
    await TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [
        { provide: UserService, useValue: userServiceSpy }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
    mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  // ✅ Descriptive test names that read like sentences
  it('should display user name when profile data is loaded successfully', () => {
    // Arrange
    const mockProfile = { name: 'John Doe', email: 'john@example.com' };
    mockUserService.getProfile.and.returnValue(of(mockProfile));
    
    // Act
    component.ngOnInit();
    fixture.detectChanges();
    
    // Assert
    expect(fixture.nativeElement.textContent).toContain('John Doe');
  });

  it('should show loading spinner when profile data is being fetched', () => {
    // Arrange
    mockUserService.getProfile.and.returnValue(of(null).pipe(delay(100)));
    
    // Act
    component.ngOnInit();
    fixture.detectChanges();
    
    // Assert
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('.loading-spinner')).toBeTruthy();
  });
}
```

### Code Style Overrides

#### Error Handling Strategy
```typescript
// ✅ Our error handling pattern:
export class CustomErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // 1. Log to console in development
    if (!environment.production) {
      console.error('Application Error:', error);
    }
    
    // 2. Send to monitoring service in production
    if (environment.production) {
      this.monitoringService.logError(error);
    }
    
    // 3. Show user-friendly message
    this.notificationService.showError('Something went wrong. Please try again.');
  }
}

// ✅ Service error handling pattern:
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      // Custom error logging
      this.logger.error(`${operation} failed:`, error);
      
      // Transform error for UI
      const userMessage = this.getErrorMessage(error);
      this.notificationService.showError(userMessage);
      
      // Return safe result
      return of(result as T);
    };
  }
  
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users')
      .pipe(
        retry(2),
        catchError(this.handleError<User[]>('getUsers', []))
      );
  }
}
```

### Architecture Decisions

#### Folder Structure Convention
```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── services/
│   ├── guards/
│   └── interceptors/
├── shared/                  # Reusable components, pipes, directives
│   ├── components/
│   ├── pipes/
│   └── directives/
├── features/                # Feature modules
│   ├── user-management/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   └── dashboard/
│       ├── components/
│       ├── services/
│       └── types/
└── layout/                  # Layout components
    ├── header/
    ├── sidebar/
    └── footer/
```

#### Dependency Injection Strategy
```typescript
// ✅ Our DI preferences:
// - Use 'providedIn: root' for services that need to be singletons
// - Use component-level providers for component-specific services
// - Use forRoot() pattern for configurable services

@Injectable({
  providedIn: 'root' // ✅ Singleton services
})
export class UserService { }

@Component({
  providers: [LocalDataService] // ✅ Component-specific services
})
export class FeatureComponent {
  constructor(private localData: LocalDataService) {}
}
```

### Team Workflow Overrides

#### Code Review Guidelines
```markdown
## Code Review Checklist

### ✅ Must Have
- [ ] Component uses OnPush change detection
- [ ] All inputs/outputs are properly typed
- [ ] Error handling is implemented
- [ ] Unit tests cover happy path and error cases
- [ ] No console.log statements in production code

### ✅ Nice to Have  
- [ ] Accessibility attributes (aria-*) are present
- [ ] Loading states are handled gracefully
- [ ] Component is responsive (mobile-friendly)
- [ ] Performance considerations are addressed
```

#### Git Commit Convention
```bash
# ✅ Our commit message format:
# type(scope): description
# 
# Examples:
feat(user-profile): add avatar upload functionality
fix(auth): resolve token refresh issue
docs(readme): update installation instructions
refactor(data-service): simplify error handling logic
test(user-component): add missing test cases
```

---

## 💡 Tips for Effective Overrides

1. **Be Specific**: Include code examples showing exactly what you want
2. **Explain Why**: Brief reasons help Copilot understand context
3. **Use Examples**: Show both ❌ avoid and ✅ prefer patterns
4. **Keep Updated**: Remove overrides that are no longer relevant
5. **Share with Team**: Consistent overrides improve team productivity

---

## 🔄 Maintenance Notes

- **This file is NEVER automatically modified** by the extension
- **Changes take effect immediately** for new Copilot interactions
- **Higher priority** than all other instruction files
- **Safe to version control** and share with team members

---

*Last updated by: Development Team*  
*Review date: Monthly team retrospective*