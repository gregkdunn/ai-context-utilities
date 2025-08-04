/**
 * Framework Templates
 * Pre-defined instruction templates for various frameworks
 */

export class FrameworkTemplates {
    private templates: Map<string, string> = new Map();
    
    constructor() {
        this.initializeTemplates();
    }
    
    /**
     * Get template for a specific framework
     */
    getTemplate(framework: string): string | null {
        return this.templates.get(framework.toLowerCase()) || null;
    }
    
    /**
     * Initialize all framework templates
     */
    private initializeTemplates(): void {
        // Angular template
        this.templates.set('angular', `---
targets:
  - "**/*.component.ts"
  - "**/*.service.ts"
  - "**/*.directive.ts"
  - "**/*.pipe.ts"
  - "**/*.module.ts"
language: typescript
framework: angular
version: {{version}}
testing: {{testFramework}}
priority: 100
---

# Angular {{version}} Best Practices

## Component Development

### Use Standalone Components
- Prefer standalone components over NgModule-based components
- Import dependencies directly in the component
\`\`\`typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
\`\`\`

### Implement OnPush Change Detection
- Use OnPush strategy for better performance
- Ensure immutable data updates
\`\`\`typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
\`\`\`

### New Control Flow Syntax (Angular 17+)
- Use @if, @for, @switch instead of *ngIf, *ngFor, *ngSwitch
\`\`\`html
@if (isLoggedIn) {
  <app-dashboard />
} @else {
  <app-login />
}

@for (item of items; track item.id) {
  <li>{{ item.name }}</li>
}
\`\`\`

## Service Architecture

### Dependency Injection
- Use inject() function for cleaner code
- Prefer providedIn: 'root' for singleton services
\`\`\`typescript
export class UserService {
  private http = inject(HttpClient);
  private router = inject(Router);
}
\`\`\`

### Error Handling
- Implement comprehensive error handling
- Use RxJS operators for error recovery
\`\`\`typescript
getUserData(): Observable<User> {
  return this.http.get<User>('/api/user').pipe(
    retry(3),
    catchError(this.handleError)
  );
}
\`\`\`

## Testing with {{testFramework}}

### Component Testing
- Test inputs, outputs, and user interactions
- Use TestBed for component setup
\`\`\`typescript
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [UserComponent]
  });
  fixture = TestBed.createComponent(UserComponent);
  component = fixture.componentInstance;
});
\`\`\`

### Service Testing
- Mock HTTP calls and dependencies
- Test error scenarios
\`\`\`typescript
it('should handle errors', () => {
  const errorResponse = new HttpErrorResponse({
    error: 'test error',
    status: 404
  });
  
  httpClientSpy.get.and.returnValue(throwError(() => errorResponse));
  
  service.getUserData().subscribe({
    error: (error) => expect(error.status).toBe(404)
  });
});
\`\`\`

## Modern Angular Features

### Signals (Angular 16+)
- Use signals for reactive state management
- Prefer computed() for derived values
\`\`\`typescript
export class CartComponent {
  quantity = signal(0);
  price = signal(10);
  total = computed(() => this.quantity() * this.price());
}
\`\`\`

### Required Inputs (Angular 16+)
- Mark required inputs explicitly
\`\`\`typescript
@Component({...})
export class UserCard {
  @Input({ required: true }) userId!: string;
  @Input() showDetails = false;
}
\`\`\`

### Deferred Loading (Angular 17+)
- Use @defer for lazy loading parts of templates
\`\`\`html
@defer (on viewport) {
  <app-heavy-component />
} @placeholder {
  <app-loading-spinner />
}
\`\`\`

## Performance Best Practices

- Use track functions in @for loops
- Implement virtual scrolling for large lists
- Lazy load routes and modules
- Use OnPush change detection strategy
- Minimize subscription memory leaks with takeUntilDestroyed()

## Code Organization

- Follow Angular style guide naming conventions
- One component/service/directive per file
- Use barrel exports for cleaner imports
- Group related features in modules/folders
- Implement smart/dumb component pattern`);

        // React template
        this.templates.set('react', `---
targets:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.js"
language: typescript
framework: react
version: {{version}}
testing: {{testFramework}}
priority: 100
---

# React {{version}} Best Practices

## Component Development

### Functional Components
- Always use functional components with hooks
- Avoid class components unless absolutely necessary
\`\`\`typescript
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return <div>{user?.name}</div>;
};
\`\`\`

### Custom Hooks
- Extract complex logic into custom hooks
- Prefix custom hooks with 'use'
\`\`\`typescript
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);
  
  return { user, loading, error };
}
\`\`\`

## State Management

### Local State
- Use useState for component-local state
- Use useReducer for complex state logic
\`\`\`typescript
const [state, dispatch] = useReducer(reducer, initialState);
\`\`\`

### Context API
- Use Context for cross-component state
- Avoid overusing Context for performance
\`\`\`typescript
const ThemeContext = React.createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
\`\`\`

## React 18+ Features

### Concurrent Features
- Use useTransition for non-urgent updates
- Use useDeferredValue for expensive computations
\`\`\`typescript
const [isPending, startTransition] = useTransition();

const handleSearch = (value: string) => {
  startTransition(() => {
    setSearchQuery(value);
  });
};
\`\`\`

### Server Components (with Next.js)
- Use 'use client' directive when needed
- Keep server components stateless
\`\`\`typescript
// This runs on the server
export default async function UserList() {
  const users = await fetchUsers();
  
  return (
    <ul>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </ul>
  );
}
\`\`\`

## Testing with {{testFramework}}

### Component Testing
- Test user interactions and state changes
- Use React Testing Library
\`\`\`typescript
test('increments counter on click', async () => {
  render(<Counter />);
  const button = screen.getByRole('button');
  
  await userEvent.click(button);
  
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
\`\`\`

### Hook Testing
- Test custom hooks with renderHook
\`\`\`typescript
const { result } = renderHook(() => useCounter());

act(() => {
  result.current.increment();
});

expect(result.current.count).toBe(1);
\`\`\`

## Performance Optimization

### Memoization
- Use React.memo for expensive components
- Use useMemo for expensive computations
- Use useCallback for stable function references
\`\`\`typescript
const MemoizedComponent = React.memo(ExpensiveComponent);

const expensiveValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);

const stableCallback = useCallback(
  () => doSomething(a, b),
  [a, b]
);
\`\`\`

### Code Splitting
- Use lazy loading for routes
- Use Suspense for loading states
\`\`\`typescript
const LazyComponent = lazy(() => import('./LazyComponent'));

<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
\`\`\`

## Best Practices

- Keep components small and focused
- Lift state up only when necessary
- Use proper TypeScript types
- Handle loading and error states
- Clean up effects properly
- Avoid inline function definitions in JSX
- Use proper key props in lists`);

        // TypeScript template
        this.templates.set('typescript', `---
targets:
  - "**/*.ts"
  - "**/*.tsx"
language: typescript
version: {{version}}
priority: 50
---

# TypeScript {{version}} Best Practices

## Type Safety

### Strict Mode
- Enable strict mode in tsconfig.json
- Never use 'any' type unless absolutely necessary
\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
\`\`\`

### Type Inference
- Let TypeScript infer types when obvious
- Explicitly type function parameters and return types
\`\`\`typescript
// Good - TypeScript infers the type
const count = 0;
const name = "John";

// Good - Explicit types for function
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
\`\`\`

## Advanced Types

### Union and Intersection Types
- Use union types for multiple possibilities
- Use intersection types to combine types
\`\`\`typescript
type Status = 'pending' | 'approved' | 'rejected';

type User = {
  id: string;
  name: string;
};

type Admin = User & {
  permissions: string[];
};
\`\`\`

### Type Guards
- Create type guards for runtime type checking
\`\`\`typescript
function isError(result: Success | Error): result is Error {
  return 'error' in result;
}

if (isError(result)) {
  console.error(result.error);
} else {
  console.log(result.data);
}
\`\`\`

### Generics
- Use generics for reusable type-safe code
\`\`\`typescript
function identity<T>(value: T): T {
  return value;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  timestamp: Date;
}
\`\`\`

## Modern TypeScript Features

### Template Literal Types
- Use template literals for string manipulation
\`\`\`typescript
type EventName = \`on\${Capitalize<string>}\`;
type Padding = \`\${number}px\` | \`\${number}em\`;
\`\`\`

### Satisfies Operator (TypeScript 4.9+)
- Use satisfies for better type inference
\`\`\`typescript
const config = {
  host: 'localhost',
  port: 3000,
  debug: true
} satisfies Config;
\`\`\`

### Const Type Parameters (TypeScript 5.0+)
- Use const generics for literal types
\`\`\`typescript
function createTuple<const T extends readonly unknown[]>(...args: T): T {
  return args;
}

const tuple = createTuple('a', 'b', 'c'); // ['a', 'b', 'c']
\`\`\`

## Error Handling

### Result Types
- Use Result types for error handling
\`\`\`typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

function parseJson<T>(json: string): Result<T> {
  try {
    return { success: true, data: JSON.parse(json) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
\`\`\`

## Best Practices

### Naming Conventions
- Use PascalCase for types and interfaces
- Use camelCase for variables and functions
- Use UPPER_CASE for constants
- Prefix interfaces with 'I' only if conflicts arise

### Code Organization
- One type/interface per file for large types
- Group related types in namespace or module
- Export types separately from implementations
- Use barrel exports for cleaner imports

### Type Assertions
- Avoid type assertions when possible
- Use 'as const' for literal types
- Document why assertion is safe
\`\`\`typescript
// Avoid
const user = {} as User;

// Better
const user: Partial<User> = {};

// Good use of assertion
const colors = ['red', 'green', 'blue'] as const;
\`\`\`

## Utility Types

- Use built-in utility types effectively
\`\`\`typescript
// Partial<T> - all properties optional
type PartialUser = Partial<User>;

// Required<T> - all properties required
type RequiredUser = Required<User>;

// Pick<T, K> - select properties
type UserName = Pick<User, 'firstName' | 'lastName'>;

// Omit<T, K> - exclude properties
type PublicUser = Omit<User, 'password' | 'email'>;
\`\`\``);

        // Jest template
        this.templates.set('jest', `---
targets:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
language: typescript
framework: jest
version: {{version}}
priority: 80
---

# Jest {{version}} Testing Best Practices

## Test Structure

### Describe-It Pattern
- Use describe blocks to group related tests
- Write descriptive test names
\`\`\`typescript
describe('UserService', () => {
  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });
    
    it('should return false for invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
\`\`\`

### Arrange-Act-Assert Pattern
- Structure tests clearly
\`\`\`typescript
it('should calculate the total price with tax', () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 }
  ];
  const taxRate = 0.08;
  
  // Act
  const total = calculateTotal(items, taxRate);
  
  // Assert
  expect(total).toBe(37.80);
});
\`\`\`

## Mocking

### Mock Functions
- Use jest.fn() for function mocks
- Verify calls and arguments
\`\`\`typescript
const mockCallback = jest.fn();
const service = new NotificationService(mockCallback);

service.notify('Hello');

expect(mockCallback).toHaveBeenCalledWith('Hello');
expect(mockCallback).toHaveBeenCalledTimes(1);
\`\`\`

### Module Mocking
- Mock entire modules when needed
\`\`\`typescript
jest.mock('../api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));
\`\`\`

### Partial Mocking
- Mock only specific parts of modules
\`\`\`typescript
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  generateId: jest.fn(() => 'mock-id')
}));
\`\`\`

## Async Testing

### Promise Testing
- Use async/await for cleaner async tests
\`\`\`typescript
it('should fetch user data', async () => {
  const userData = await fetchUser('123');
  
  expect(userData).toEqual({
    id: '123',
    name: 'John Doe'
  });
});
\`\`\`

### Testing Rejections
- Test error cases properly
\`\`\`typescript
it('should throw error for invalid user', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow('User not found');
});
\`\`\`

## Snapshot Testing

### Component Snapshots
- Use snapshots for UI consistency
\`\`\`typescript
it('should render correctly', () => {
  const component = render(<Button label="Click me" />);
  expect(component).toMatchSnapshot();
});
\`\`\`

### Inline Snapshots
- Use inline snapshots for small outputs
\`\`\`typescript
it('should format the date correctly', () => {
  expect(formatDate(new Date('2024-01-01'))).toMatchInlineSnapshot(\`"January 1, 2024"\`);
});
\`\`\`

## Test Data

### Test Fixtures
- Create reusable test data
\`\`\`typescript
const createMockUser = (overrides = {}): User => ({
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});

it('should update user name', () => {
  const user = createMockUser({ name: 'John' });
  const updated = updateUserName(user, 'Jane');
  expect(updated.name).toBe('Jane');
});
\`\`\`

## Coverage

### Aim for High Coverage
- Target 80%+ code coverage
- Focus on critical paths
- Don't sacrifice quality for coverage
\`\`\`bash
# Run with coverage
npm test -- --coverage

# Set coverage thresholds
"jest": {
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
\`\`\`

## Best Practices

### Test Isolation
- Each test should be independent
- Clean up after tests
- Don't rely on test execution order
\`\`\`typescript
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Reset database
  db.clear();
});

afterEach(() => {
  // Clean up
  cleanup();
});
\`\`\`

### Performance
- Mock heavy operations
- Use test.concurrent for parallel tests
- Skip slow tests in watch mode
\`\`\`typescript
describe.concurrent('API tests', () => {
  test.concurrent('endpoint 1', async () => { /* ... */ });
  test.concurrent('endpoint 2', async () => { /* ... */ });
});

test.skip.if(process.env.CI)('slow integration test', () => {
  // Only runs locally
});
\`\`\`

### Debugging
- Use test.only to focus on specific tests
- Use debugger statements
- Run in watch mode for faster feedback
\`\`\`typescript
test.only('debug this test', () => {
  debugger;
  // Test code
});
\`\`\``);

        // Vue template
        this.templates.set('vue', `---
targets:
  - "**/*.vue"
  - "**/*.ts"
  - "**/*.js"
language: typescript
framework: vue
version: {{version}}
testing: {{testFramework}}
priority: 100
---

# Vue {{version}} Best Practices

## Composition API

### Script Setup Syntax
- Use <script setup> for cleaner components
\`\`\`vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const emit = defineEmits<{
  update: [value: number]
  close: []
}>()

const localCount = ref(props.count)
const doubleCount = computed(() => localCount.value * 2)
</script>
\`\`\`

### Composables
- Extract reusable logic into composables
\`\`\`typescript
// useCounter.ts
export function useCounter(initial = 0) {
  const count = ref(initial)
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initial
  
  return {
    count: readonly(count),
    increment,
    decrement,
    reset
  }
}
\`\`\`

## Component Design

### Props Validation
- Use TypeScript interfaces for props
- Provide default values when appropriate
\`\`\`typescript
interface Props {
  modelValue: string
  placeholder?: string
  disabled?: boolean
  validator?: (value: string) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Enter text...',
  disabled: false
})
\`\`\`

### v-model Usage
- Implement proper v-model support
\`\`\`vue
<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <input
    :value="modelValue"
    @input="updateValue"
  />
</template>
\`\`\`

## State Management

### Reactive State
- Use ref for primitives
- Use reactive for objects
\`\`\`typescript
// Primitives
const count = ref(0)
const message = ref('Hello')
const isLoading = ref(false)

// Objects
const user = reactive({
  name: 'John',
  email: 'john@example.com'
})

// Arrays
const items = ref<Item[]>([])
\`\`\`

### Computed Properties
- Use computed for derived state
- Keep computed properties pure
\`\`\`typescript
const fullName = computed(() => 
  \`\${user.firstName} \${user.lastName}\`
)

const filteredItems = computed(() =>
  items.value.filter(item => item.active)
)
\`\`\`

## Lifecycle Hooks

### Composition API Lifecycle
- Use lifecycle hooks appropriately
\`\`\`typescript
onMounted(() => {
  // Component is mounted
  fetchData()
})

onUnmounted(() => {
  // Cleanup
  cancelRequests()
})

onUpdated(() => {
  // DOM has been updated
})
\`\`\`

## Testing with {{testFramework}}

### Component Testing
- Test components with Vue Test Utils
\`\`\`typescript
import { mount } from '@vue/test-utils'

describe('UserCard', () => {
  it('displays user name', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: { name: 'John Doe' }
      }
    })
    
    expect(wrapper.text()).toContain('John Doe')
  })
  
  it('emits click event', async () => {
    const wrapper = mount(UserCard)
    
    await wrapper.trigger('click')
    
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
\`\`\`

## Performance

### Component Optimization
- Use shallowRef for large objects
- Implement proper list rendering
\`\`\`vue
<template>
  <!-- Use unique keys -->
  <li v-for="item in items" :key="item.id">
    {{ item.name }}
  </li>
</template>

<script setup>
// For large lists
const largeList = shallowRef(data)

// Virtualize long lists
import { VirtualList } from '@tanstack/vue-virtual'
</script>
\`\`\`

## Best Practices

- Use TypeScript for better type safety
- Keep components small and focused
- Use slots for flexible content
- Implement proper error boundaries
- Follow Vue style guide conventions
- Use Suspense for async components
- Implement proper form validation
- Handle loading and error states`);
    }
}